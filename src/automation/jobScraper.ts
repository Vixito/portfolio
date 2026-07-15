import { createClient } from "npm:@supabase/supabase-js";
import Groq from "npm:groq-sdk";
import * as cheerio from "npm:cheerio";
import { generateCV } from "./cvGenerator.ts";

// Configuración
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!GROQ_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan variables de entorno esenciales (GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEY).");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const groq = new Groq({ apiKey: GROQ_API_KEY });

const baseProfile = {
  name: "Carlos Andrés Vicioso Lara",
  phone: "+57 XXXXXXXX",
  location: "Valledupar, Colombia",
  email: "carlosvicioso@vixis.dev",
  linkedin: "carlosvicioso",
  portfolio: "vixis.dev",
  summary: "Ingeniero de Sistemas especializado en desarrollo backend y automatización.",
  skills: {
    "Backend": "Node.js, Deno, PHP, Python, PostgreSQL, Supabase",
    "Frontend": "React, TypeScript, TailwindCSS",
    "DevOps & Automation": "Docker, GitHub Actions, n8n, Doppler, Apify"
  },
  experience: [
    {
      company: "Vixis Studio",
      title: "Software Engineer & Founder",
      dates: "2024 - Present",
      bullets: [
        "Desarrollo de plataformas e-commerce escalables y sistemas automatizados.",
        "Implementación de infraestructuras seguras con Docker y Traefik."
      ]
    }
  ]
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchLocalUrl(url: string) {
  console.log(`Descargando URL localmente (bypass anti-scraping cloud): ${url}`);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    // Eliminar scripts y estilos para dejar el contenido limpio
    $('script, style, noscript, iframe').remove();
    const cleanText = $('body').text().replace(/\s+/g, ' ').substring(0, 8000);
    return cleanText;
  } catch (error) {
    console.error("Error haciendo fetch local:", error);
    throw error;
  }
}

async function processQueue() {
  const { data: queue, error: queueError } = await supabase
    .from('job_queue')
    .select('*')
    .eq('status', 'pending');

  if (queueError) {
    console.error("Error leyendo job_queue:", queueError);
    return;
  }

  if (!queue || queue.length === 0) return;

  for (const item of queue) {
    console.log(`Procesando item de la cola: ${item.url}`);
    try {
      // 1. Extraer texto usando fetch local
      const text = await fetchLocalUrl(item.url);

      // 2. IA Groq llama-3.3-70b-versatile
      const prompt = `
      Eres un analista de empleos experto.
      Extrae los datos de esta oferta de trabajo basándote en el siguiente texto de la página web extraída:
      ${text}

      Y aquí está mi perfil:
      ${JSON.stringify(baseProfile)}

      Genera un JSON EXACTO con las siguientes claves:
      - puesto: (Título del empleo).
      - empresa: (Nombre de la empresa, si no aparece pon "Desconocida").
      - match_score: (Número del 0 al 100 de qué tan bien encajo con los requisitos de la vacante).
      - introduccion: (Párrafo corto vendiendo mi perfil para este rol, máximo 3 frases).
      - consejos_para_aplicar: (3 consejos clave para la entrevista o prueba técnica).
      - tailored_summary: (Un Professional Summary para el CV adaptado a esta oferta).
      `;

      console.log("Analizando con Groq (openai/gpt-oss-120b)...");
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "openai/gpt-oss-120b",
        response_format: { type: "json_object" }
      });

      const aiAnalysis = JSON.parse(completion.choices[0].message.content);

      // 3. Generar CV
      console.log(`Generando CV PDF para ${aiAnalysis.empresa}...`);
      const pdfBytes = await generateCV(baseProfile, { tailoredSummary: aiAnalysis.tailored_summary });
      const pdfFileName = `CV_${aiAnalysis.empresa.replace(/\W+/g, '_')}_${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('cv-pdfs')
        .upload(pdfFileName, pdfBytes, { contentType: 'application/pdf' });

      if (uploadError) {
        console.error("Error subiendo PDF:", uploadError);
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('cv-pdfs').getPublicUrl(pdfFileName);

      // 4. Guardar oferta y actualizar cola
      await supabase.from('job_offers').insert({
        puesto: aiAnalysis.puesto || "Oferta Manual",
        empresa: aiAnalysis.empresa || "Desconocida",
        introduccion: aiAnalysis.introduccion,
        consejos_para_aplicar: aiAnalysis.consejos_para_aplicar,
        match_score: aiAnalysis.match_score || 50,
        modalidad: "Remote/Manual",
        publicacion_oferta: new Date().toISOString(),
        url_oferta: item.url,
        cv_generado_url: publicUrlData.publicUrl
      });

      await supabase.from('job_queue').update({ status: 'completed' }).eq('id', item.id);
      console.log(`✅ Oferta guardada exitosamente: ${aiAnalysis.empresa}`);

      // Retraso para no saturar Rate Limits de Groq (aunque 70b tiene buen rate limit, mejor prevenir)
      await delay(5000);

    } catch (err) {
      console.error(`Error procesando URL ${item.url}:`, err);
      await supabase.from('job_queue').update({ status: 'failed' }).eq('id', item.id);
    }
  }
}

// Bucle principal tipo "Radio"
async function radioLoop() {
  console.log("📻 Job Scraper Radio iniciado. Escuchando la cola 'job_queue' en Supabase en tiempo real...");
  
  // Suscribirse a los INSERTS en la cola para procesar de inmediato
  supabase
    .channel('job_queue_channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'job_queue' }, async (payload) => {
      console.log(`⚡ Evento en tiempo real recibido: Nueva URL en cola -> ${payload.new.url}`);
      await processQueue();
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log("✅ Suscrito exitosamente a Supabase Realtime. El procesamiento manual será inmediato.");
      }
    });

  // Escaneo inicial para recoger los que hayan quedado pendientes
  await processQueue();

  // Bucle infinito: Cada 12 horas ejecuta el Scraper Automatizado Completo (Apify)
  // y también vuelve a revisar la cola por si se perdió algún evento de realtime.
  while (true) {
    // Escaneo profundo (por si algo falló en realtime)
    await processQueue();

    // Esperamos 12 horas antes del escaneo automático diario
    console.log("⏳ Esperando 12 horas para el próximo barrido automático masivo...");
    await delay(12 * 60 * 60 * 1000);
  }
}

radioLoop().catch(console.error);

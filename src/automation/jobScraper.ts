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

async function buildDynamicProfile() {
  console.log("📥 Obteniendo datos reales del portfolio desde Supabase...");

  // 1. Obtener Experiencia (Máximo 4, ordenados por más reciente)
  const { data: exps } = await supabase
    .from('work_experiences')
    .select('*')
    .eq('is_active', true)
    .order('start_date', { ascending: false })
    .limit(4);

  // 2. Obtener Estudios (Educación)
  const { data: studies } = await supabase
    .from('studies')
    .select('*')
    .eq('is_active', true)
    .order('start_date', { ascending: false })
    .limit(3);

  // 3. Obtener Tecnologías (Habilidades)
  const { data: techs } = await supabase
    .from('technologies')
    .select('name, category')
    .eq('is_active', true);

  // 4. Obtener Redes Sociales (LinkedIn)
  const { data: socials } = await supabase
    .from('socials')
    .select('url')
    .ilike('title', '%linkedin%')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  // Mapear experiencias
  const mappedExps = (exps || []).map((exp: any) => ({
    company: exp.company || "Empresa",
    title: exp.position || "Cargo",
    dates: `${exp.start_date ? new Date(exp.start_date).getFullYear() : ""} - ${exp.status === 'current' ? 'Presente' : (exp.end_date ? new Date(exp.end_date).getFullYear() : "")}`,
    bullets: exp.description ? [exp.description] : ["Desarrollo y optimización de soluciones de software."] // Idealmente debería dividirse en viñetas si hay saltos de línea
  }));

  // Mapear educación
  const mappedEducation = (studies || []).map((s: any) => ({
    institution: s.institution || "Institución",
    degree: s.title || "Título",
    year: s.start_date ? new Date(s.start_date).getFullYear().toString() : ""
  }));

  // Enviar todas las habilidades para que la IA filtre
  const mappedSkills = techs ? techs.map((t: any) => t.name).join(", ") : "Node.js, React, TypeScript, Docker, PostgreSQL";

  let linkedinUrl = "carlosvicioso";
  if (socials && socials.url) {
    // Intentar extraer el username o la URL limpia
    linkedinUrl = socials.url.replace('https://www.linkedin.com/in/', '').replace('https://linkedin.com/in/', '').replace(/\/$/, '');
  }

  return {
    name: "Carlos Andrés Vicioso Lara",
    phone: "+57 322 6171458", // Datos de contacto
    location: "Valledupar, Colombia",
    email: "carlosvicioso@vixis.dev",
    linkedin: linkedinUrl,
    portfolio: "vixis.dev",
    summary: "Ingeniero de Sistemas especializado en desarrollo backend y automatización.",
    skills: {
      "Tecnologías Clave": mappedSkills,
      "Habilidades Blandas": "Trabajo en equipo, Adaptabilidad, Liderazgo, Comunicación asertiva"
    },
    experience: mappedExps.length > 0 ? mappedExps : [
      {
        company: "Vixis Studio",
        title: "Software Engineer & Founder",
        dates: "2026 - Present",
        bullets: [
          "Desarrollo de plataformas e-commerce escalables y sistemas automatizados.",
          "Implementación de infraestructuras seguras con Docker y Traefik."
        ]
      }
    ],
    education: mappedEducation.length > 0 ? mappedEducation : undefined
  };
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchLocalUrl(url: string) {
  console.log(`Descargando URL con Jina Reader (Soporte para páginas dinámicas/JS): ${url}`);
  try {
    // Jina Reader extrae el contenido incluso si está renderizado con JavaScript (como Discord/Greenhouse)
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain",
        "X-Return-Format": "markdown"
      }
    });

    if (!response.ok) {
      console.warn(`Jina Reader falló (${response.status}), intentando fetch directo...`);
      // Fallback a fetch directo si Jina falla
      const fallbackResponse = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      const html = await fallbackResponse.text();
      const $ = cheerio.load(html);
      $('script, style, noscript, iframe').remove();
      return $('body').text().replace(/\s+/g, ' ').substring(0, 8000);
    }

    const text = await response.text();
    // Limitar el texto a 8000 caracteres para no saturar el prompt
    return text.substring(0, 8000);
  } catch (error) {
    console.error("Error extrayendo URL:", error);
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

      // 1.5 Obtener datos reales del portfolio
      const realProfile = await buildDynamicProfile();

      // 2. IA Groq
      const prompt = `
      Eres un analista de empleos experto.
      Extrae los datos de esta oferta de trabajo basándote en el siguiente texto de la página web extraída:
      ${text}

      Y aquí está la información REAL de mi portfolio:
      ${JSON.stringify(realProfile)}

      Genera un JSON EXACTO con las siguientes claves:
      - puesto: (Título del empleo).
      - empresa: (Nombre de la empresa, si no aparece pon "Desconocida").
      - match_score: (Número del 0 al 100 de qué tan bien encajo con los requisitos de la vacante, sé honesto).
      - introduccion: (Párrafo corto vendiendo mi perfil para este rol, resaltando mi experiencia real y qué ofrezco. MÁXIMO 5 líneas).
      - consejos_para_aplicar: (3 consejos clave para la entrevista o prueba técnica).
      - tailored_summary: (Un Professional Summary para el CV adaptado a esta oferta, en base a mi perfil real. Contesta: ¿Qué quiero hacer? ¿Qué ofrezco? ¿Por qué lo puedo hacer?).
      - top_10_skills: (String con solo las 10 o 12 tecnologías y habilidades blandas de mi perfil que MÁS HAGAN MATCH con la oferta, separadas por comas. ESTRICTAMENTE de la lista proporcionada).
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
      // Clonar y sobrescribir skills con las top 10 de Groq
      const tailoredProfile = {
        ...realProfile,
        skills: {
          "Habilidades Clave": aiAnalysis.top_10_skills || realProfile.skills["Tecnologías Clave"]
        }
      };

      const pdfBytes = await generateCV(tailoredProfile, { tailoredSummary: aiAnalysis.tailored_summary });
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

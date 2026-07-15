import { createClient } from "npm:@supabase/supabase-js";
import OpenAI from "npm:openai";
import Groq from "npm:groq-sdk";
import { ApifyClient } from "npm:apify-client";
import { generateCV } from "./cvGenerator.ts";

// Configuración mediante variables de entorno (Doppler las inyectará)
const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if ((!XAI_API_KEY && !GROQ_API_KEY) || !APIFY_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan variables de entorno esenciales.");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const apifyClient = new ApifyClient({ token: APIFY_TOKEN });

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

async function run() {
  console.log("Comprobando interruptor de seguridad (Kill Switch)...");

  const { data: settings, error: settingsError } = await supabase
    .from('job_scraper_settings')
    .select('is_enabled')
    .eq('id', 1)
    .single();

  if (settingsError || !settings?.is_enabled) {
    console.log("El Job Scraper está APAGADO. Abortando ejecución para ahorrar recursos.");
    return;
  }

  console.log("Iniciando búsqueda de empleo con Apify (Google Jobs Scraper)...");

  const run = await apifyClient.actor("apify/google-jobs-scraper").call({
    queries: "Backend Engineer AND (TypeScript OR Python) AND Remote",
    maxItemsPerQuery: 30, // Obtenemos una buena cantidad de ofertas
    countryCode: "us",
    languageCode: "en"
  });

  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
  console.log(`Encontradas ${items.length} ofertas de trabajo.`);

  for (const job of items) {
    if (!job.title || !job.companyName) continue;

    // Verificar si ya procesamos esta oferta
    const { data: existing } = await supabase
      .from('job_offers')
      .select('id')
      .eq('url_oferta', job.jobUrl || job.applyLink)
      .maybeSingle();

    if (existing) {
      console.log(`Omitiendo oferta ya existente: ${job.title} en ${job.companyName}`);
      continue;
    }

    console.log(`Procesando oferta: ${job.title} en ${job.companyName}`);

    const prompt = `
    Analiza esta oferta de trabajo y mi perfil.
    Oferta: ${job.title} en ${job.companyName}
    Descripción: ${job.description || job.snippet}
    Mi Perfil: ${JSON.stringify(baseProfile)}
    
    Genera un JSON EXACTO con las siguientes claves:
    - match_score: (Número del 0 al 100 de qué tan bien encajo).
    - introduccion: (Párrafo corto vendiendo mi perfil para este rol, máximo 3 frases).
    - consejos_para_aplicar: (3 consejos clave para la entrevista).
    - tailored_summary: (Un Professional Summary para el CV adaptado a esta oferta).
    `;

    let aiAnalysis;
    let fallbackUsed = false;
    
    try {
      if (!XAI_API_KEY) throw new Error("XAI_API_KEY no disponible");
      const openai = new OpenAI({ apiKey: XAI_API_KEY, baseURL: "https://api.x.ai/v1" });
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "grok-latest",
        response_format: { type: "json_object" }
      });
      aiAnalysis = JSON.parse(completion.choices[0].message?.content || "{}");
    } catch (errXAI) {
      console.warn(`xAI falló para la oferta ${job.companyName}, intentando Groq...`, errXAI.message);
      fallbackUsed = true;
      try {
        if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY no disponible");
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.1-8b-instant",
          response_format: { type: "json_object" }
        });
        aiAnalysis = JSON.parse(completion.choices[0].message.content);
      } catch (errGroq) {
        console.error("Ambas IA (xAI y Groq) fallaron:", errGroq.message);
        continue; // Continuar con la siguiente oferta
      }
    }

    const pdfBytes = await generateCV(baseProfile, { tailoredSummary: aiAnalysis.tailored_summary });

    const pdfFileName = `CV_${job.companyName.replace(/\\W+/g, '_')}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('cv-pdfs')
      .upload(pdfFileName, pdfBytes, { contentType: 'application/pdf' });

    if (uploadError) {
      console.error("Error subiendo PDF:", uploadError);
      continue;
    }

    const { data: publicUrlData } = supabase.storage.from('cv-pdfs').getPublicUrl(pdfFileName);

    const { error: dbError } = await supabase
      .from('job_offers')
      .insert({
        puesto: job.title,
        empresa: job.companyName,
        introduccion: aiAnalysis.introduccion,
        consejos_para_aplicar: aiAnalysis.consejos_para_aplicar,
        match_score: aiAnalysis.match_score,
        modalidad: "Remote",
        publicacion_oferta: job.publishedAt || new Date().toISOString(),
        url_oferta: job.jobUrl || job.applyLink,
        cv_generado_url: publicUrlData.publicUrl
      });

    if (dbError) {
      console.error("Error guardando en la BD:", dbError);
    } else {
      console.log(`✅ Oferta guardada exitosamente en Supabase: ${job.companyName}`);
    }

    // DELAY CRÍTICO: 4 Segundos entre peticiones para no saturar el Rate Limit de Groq
    console.log("Esperando 4 segundos para evitar Rate Limits de Groq...");
    await delay(4000);
  }
}

run().catch(console.error);

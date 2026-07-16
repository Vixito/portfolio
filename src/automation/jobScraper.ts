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

  // 3. Obtener Proyectos
  const { data: projectsData } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(4);

  // 4. Obtener Tecnologías (Habilidades)
  const { data: techs } = await supabase
    .from('technologies')
    .select('name, category')
    .eq('is_active', true);

  // 5. Obtener Redes Sociales (LinkedIn)
  const { data: socials } = await supabase
    .from('socials')
    .select('url')
    .ilike('title', '%linkedin%')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  // Mapear experiencias (Solo válidas)
  const mappedExps = (exps || [])
    .filter((exp: any) => exp.company && exp.position)
    .map((exp: any) => ({
      company: exp.company,
      title: exp.position,
      dates: `${exp.start_date ? new Date(exp.start_date).getFullYear() : ""} - ${exp.status === 'current' ? 'Presente' : (exp.end_date ? new Date(exp.end_date).getFullYear() : "")}`,
      bullets: exp.description ? [exp.description] : []
    }));

  // Añadir Proyectos a la experiencia (como en el CV original)
  const mappedProjects = (projectsData || []).map((p: any) => ({
    company: p.title,
    title: "Backend Developer", // Generic or based on user profile
    dates: p.created_at ? new Date(p.created_at).getFullYear().toString() : "Present",
    bullets: p.description ? [p.description] : []
  }));

  // Mapear educación (Solo válidas)
  const mappedEducation = (studies || [])
    .filter((s: any) => s.institution && s.title)
    .map((s: any) => ({
      institution: s.institution,
      degree: s.title,
      year: s.start_date ? new Date(s.start_date).getFullYear().toString() : ""
    }));

  // Agrupar habilidades por categoría
  const categorizedSkills: Record<string, string> = {};
  if (techs) {
    for (const t of techs) {
      const cat = t.category || "Core Stack";
      if (!categorizedSkills[cat]) categorizedSkills[cat] = "";
      categorizedSkills[cat] += categorizedSkills[cat] ? `, ${t.name}` : t.name;
    }
  }

  let linkedinUrl = "";
  if (socials && socials.url) {
    // Intentar extraer el username o la URL limpia
    linkedinUrl = socials.url.replace('https://www.linkedin.com/in/', '').replace('https://linkedin.com/in/', '').replace(/\/$/, '');
  }

  return {
    name: "Carlos Andrés Vicioso Lara",
    phone: "+57 322 6171458",
    location: "Valledupar, Colombia",
    email: "carlosvicioso@vixis.dev",
    linkedin: linkedinUrl || undefined,
    portfolio: "vixis.dev",
    summary: "Backend-focused Systems Engineer with hands-on experience architecting scalable infrastructure in Python, Java, Dart, TypeScript, and SQL. Built and maintained a bot platform serving 50K+ monthly active users at 99.9% uptime. Specialized in API design, relational data layers, asynchronous processing, and cloud-integrated deployments.",
    skills: Object.keys(categorizedSkills).length > 0 ? categorizedSkills : undefined,
    experience: mappedExps.length > 0 ? mappedExps : undefined,
    education: mappedEducation.length > 0 ? mappedEducation : undefined,
    projects: mappedProjects.length > 0 ? mappedProjects : undefined
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
    // 0. Bloquear el item inmediatamente para evitar procesamientos duplicados (Race condition entre Realtime y Polling)
    await supabase.from('job_queue').update({ status: 'processing' }).eq('id', item.id);

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
      - idioma_oferta: (El idioma en el que está escrita la vacante, ej: "es", "en", "pt", etc).
      - puesto: (Título del empleo).
      - empresa: (Nombre de la empresa, si no aparece pon "Desconocida").
      - modalidad: (Modalidad de trabajo extraída de la oferta: Remoto, Híbrido, Presencial. Si no dice, asume "No especificado").
      - publicacion_oferta: (Antigüedad de la oferta extraída del texto, ej: "Hace 2 días", "Hoy", "3w ago". Si no dice, asume "Desconocida").
      - match_score: (Número del 0 al 100 de qué tan bien encajo con los requisitos de la vacante, sé honesto).
      - introduccion: (Párrafo corto vendiendo mi perfil para este rol. Escríbelo SIEMPRE en Español, es solo para mí en el panel).
      - consejos_para_aplicar: (3 consejos clave para la entrevista. Escríbelo SIEMPRE en Español).
      - tailored_summary: (Un Professional Summary ROBUSTO e IMPACTANTE de 4 a 5 líneas para el CV, adaptado a esta oferta. Responde con detalle: ¿Qué quiero hacer? ¿Qué ofrezco? ¿Por qué lo puedo hacer? Demuestra autoridad, no seas breve. Escríbelo ESTRICTAMENTE en el mismo 'idioma_oferta').
      - top_10_skills: (String con las habilidades de mi perfil que MÁS HAGAN MATCH. Tradúcelas al 'idioma_oferta'. AGRÚPALAS por categoría si es posible, ej: "Languages: JS, Python. Frameworks: React, Node").
      - translated_experience: (Array con mi 'experience' real. DEBES REESCRIBIR y traducir estrictamente el 'title' y los 'bullets' al 'idioma_oferta'. APLICA LA FÓRMULA DE GOOGLE X-Y-Z en los bullets: 'Accomplished X, as measured by Y, by doing Z'. Cuantifica el impacto con números siempre que sea lógico. Selecciona y enfócate en los logros más relevantes para esta oferta).
      - translated_education: (Array con mi 'education' real, pero traduce estrictamente el 'degree' al 'idioma_oferta').
      - translated_projects: (Array con mis 'projects' reales. DEBES REESCRIBIR y traducir estrictamente el 'title' y 'bullets' al 'idioma_oferta', aplicando también la fórmula X-Y-Z y resaltando las tecnologías usadas relevantes para la vacante).
      `;

      console.log("Analizando con Groq (openai/gpt-oss-120b)...");
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "openai/gpt-oss-120b",
        response_format: { type: "json_object" }
      });

      const aiAnalysis = JSON.parse(completion.choices[0].message.content);

      // 3. Generar CV
      console.log(`Generando CV PDF para ${aiAnalysis.empresa} en idioma [${aiAnalysis.idioma_oferta}]...`);
      // Clonar y sobrescribir con los datos adaptados y traducidos por la IA
      const tailoredProfile = {
        ...realProfile,
        skills: {
          ...(aiAnalysis.top_10_skills ? {
            [aiAnalysis.idioma_oferta === 'en' ? "Key Skills" : "Habilidades Clave"]: aiAnalysis.top_10_skills
          } : {}),
          ...realProfile.skills
        },
        experience: aiAnalysis.translated_experience || realProfile.experience,
        education: aiAnalysis.translated_education || realProfile.education,
        projects: aiAnalysis.translated_projects || realProfile.projects
      };

      const pdfBytes = await generateCV(tailoredProfile, { tailoredSummary: aiAnalysis.tailored_summary });
      
      const fileNameSuffix = aiAnalysis.idioma_oferta === 'en' ? 'Resume' : 'Currículum Vitae';
      const cleanPuesto = (aiAnalysis.puesto || "Rol").replace(/[^\w\s-]/g, '');
      const pdfFileName = `${cleanPuesto}, Carlos Andres Vicioso Lara -- ${fileNameSuffix}_${Date.now()}.pdf`.replace(/\s+/g, ' ');

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('cv-pdfs')
        .upload(pdfFileName, pdfBytes, { contentType: 'application/pdf' });

      if (uploadError) {
        console.error("Error subiendo PDF:", uploadError);
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage.from('cv-pdfs').getPublicUrl(pdfFileName);

      // Determinar Prioridad
      let priority = "-";
      if (aiAnalysis.match_score >= 80) priority = "Alta";
      else if (aiAnalysis.match_score >= 50) priority = "Media";
      else priority = "Baja";

      // 4. Guardar oferta y actualizar cola
      const { error: insertError } = await supabase.from('job_offers').insert([{
        puesto: aiAnalysis.puesto,
        empresa: aiAnalysis.empresa,
        introduccion: aiAnalysis.introduccion,
        consejos_para_aplicar: aiAnalysis.consejos_para_aplicar,
        match_score: aiAnalysis.match_score,
        modalidad: aiAnalysis.modalidad || "Remoto",
        prioridad: priority,
        publicacion_oferta: aiAnalysis.publicacion_oferta || "Reciente",
        url_oferta: item.url,
        cv_generado_url: publicUrlData.publicUrl
      }]);

      if (insertError) {
        console.error("Error guardando oferta:", insertError);
        await supabase.from('job_queue').update({ status: 'failed' }).eq('id', item.id);
      } else {
        console.log(`✅ Oferta guardada exitosamente: ${aiAnalysis.empresa}`);
        // 5. Marcar como completado en la cola
        await supabase.from('job_queue').update({ status: 'completed' }).eq('id', item.id);
      }
    } catch (err) {
      console.error("Error general en processQueue:", err);
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

  // Bucle infinito: Polling rápido (Fallback) para inmediatez sin importar Realtime
  while (true) {
    await processQueue();
    // Polling rápido cada 5 segundos para que parezca instantáneo aunque Realtime falle
    await delay(5000);
  }
}

radioLoop().catch(console.error);

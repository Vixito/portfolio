import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import OpenAI from "npm:openai";
import Groq from "npm:groq-sdk";
import { ApifyClient } from "npm:apify-client";

// IMPORTANTE: En Edge Functions de Supabase, las variables se inyectan en el entorno
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_DB_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), { status: 400, headers: corsHeaders });
    }

    // 1. Obtener el texto de la URL usando Apify para burlar anti-bots agresivos
    console.log(`Haciendo scraping con Apify a la URL: ${url}`);
    
    if (!APIFY_TOKEN) {
      throw new Error("APIFY_TOKEN no está configurado en las variables de entorno.");
    }
    
    const apify = new ApifyClient({ token: APIFY_TOKEN });
    
    // Usamos cheerio-scraper que es muy rápido y le activamos el proxy residencial de Apify
    const run = await apify.actor("apify/cheerio-scraper").call({
      startUrls: [{ url }],
      proxyConfiguration: { useApifyProxy: true },
      pageFunction: `async function pageFunction(context) { 
        return { text: context.$('body').text() }; 
      }`
    });

    const { items } = await apify.dataset(run.defaultDatasetId).listItems();
    if (!items || items.length === 0) {
      throw new Error("Apify no devolvió datos para esta URL.");
    }

    const html = items[0]?.text || "";
    const finalUrl = url; // Mantenemos la original ya que Apify lo procesó
    // Limpieza muy básica de HTML para sacar el texto
    const cleanText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').substring(0, 8000);

    // 2. Analizar con IA (xAI con fallback a Groq)
    const prompt = `
    Eres un analista de empleos. Extrae los datos de esta oferta de trabajo basándote en el siguiente texto de la página web.
    Texto extraído: ${cleanText}
    
    Genera un JSON EXACTO con las siguientes claves:
    - puesto: (Título del empleo).
    - empresa: (Nombre de la empresa, si no aparece pon "Desconocida").
    - match_score: 90
    - introduccion: (Párrafo corto vendiendo un perfil genérico de Backend Engineer para este rol).
    - consejos_para_aplicar: (3 consejos clave para la entrevista).
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
      console.warn("xAI falló o no está configurado, usando fallback a Groq...", errXAI.message);
      fallbackUsed = true;
      if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY no disponible para el fallback");
      const groq = new Groq({ apiKey: GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" }
      });
      aiAnalysis = JSON.parse(completion.choices[0].message.content);
    }

    // 3. Guardar en Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);
    const { data: dbData, error: dbError } = await supabase
      .from('job_offers')
      .insert({
        puesto: aiAnalysis.puesto || "Oferta Manual",
        empresa: aiAnalysis.empresa || "Desconocida",
        introduccion: aiAnalysis.introduccion,
        consejos_para_aplicar: aiAnalysis.consejos_para_aplicar,
        match_score: aiAnalysis.match_score || 50,
        modalidad: "Remote/Manual",
        publicacion_oferta: new Date().toISOString(),
        url_oferta: finalUrl,
        cv_generado_url: null // Se puede generar asíncronamente o dejar null para links manuales
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ success: true, data: dbData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message || "Error procesando la URL." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

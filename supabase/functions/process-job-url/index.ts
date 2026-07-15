import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import Groq from "npm:groq-sdk";

// IMPORTANTE: En Edge Functions de Supabase, las variables se inyectan en el entorno
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_DB_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

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

    // 1. Obtener el texto de la URL (Scraping básico)
    console.log(`Haciendo fetch a la URL manual: ${url}`);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    
    if (!response.ok) {
      throw new Error(`No se pudo acceder a la URL. Status: ${response.status}`);
    }

    const html = await response.text();
    // Limpieza muy básica de HTML para sacar el texto
    const cleanText = html.replace(/<[^>]*>?/gm, ' ').replace(/\\s+/g, ' ').substring(0, 8000);

    // 2. Analizar con Groq
    const groq = new Groq({ apiKey: GROQ_API_KEY });
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

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-70b-8192",
      response_format: { type: "json_object" }
    });

    const aiAnalysis = JSON.parse(completion.choices[0].message.content);

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
        url_oferta: url,
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

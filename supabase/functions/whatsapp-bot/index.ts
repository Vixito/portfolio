import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

// Obtener variables de entorno
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
const WHATSAPP_APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") || "";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const GOOGLE_SHEET_GAS_URL = Deno.env.get("GOOGLE_SHEET_GAS_URL") || "";
const GOOGLE_SHEET_SECRET = Deno.env.get("GOOGLE_SHEET_SECRET") || "";

// Supabase cliente interno (Service Role para bypass de RLS y consulta de datos)
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función para calcular appsecret_proof en caso de que esté activo en Meta App Settings
async function getAppSecretProof(token: string, appSecret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(token)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  const url = new URL(req.url);

  // 1. Manejar la verificación de Webhook de Meta (Petición GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      console.log("✅ Webhook verificado exitosamente por Meta.");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // 2. Manejar la recepción de mensajes (Petición POST)
  if (req.method === "POST") {
    try {
      const body = await req.json();

      if (body.object === "whatsapp_business_account") {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message && message.type === "text") {
          const fromNumber = message.from;
          const userMessage = message.text.body;

          console.log(`💬 Mensaje de ${fromNumber}: "${userMessage}"`);

          // A. Verificar si es cliente existente en Google Sheets a través de Apps Script
          let clientName = "";
          let isExistingClient = false;
          if (GOOGLE_SHEET_GAS_URL && GOOGLE_SHEET_SECRET) {
            try {
              const checkUrl = `${GOOGLE_SHEET_GAS_URL}?secret=${encodeURIComponent(
                GOOGLE_SHEET_SECRET
              )}&action=check_client&phone=${encodeURIComponent(fromNumber)}`;
              const checkRes = await fetch(checkUrl);
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.isClient) {
                  isExistingClient = true;
                  clientName = checkData.name || "";
                  console.log(`👤 Cliente reconocido: ${clientName}`);
                }
              }
            } catch (err) {
              console.error("Error al consultar cliente en Google Sheets:", err);
            }
          }

          // B. Obtener datos públicos del portafolio desde la base de datos
          const [projectsData, productsData, experienceData, postsData] = await Promise.all([
            supabase.from("projects").select("name, name_translations, description, description_translations, url"),
            supabase.from("products").select("name, name_translations, description, description_translations, price, stock"),
            supabase.from("work_experiences").select("company, position, description"),
            supabase.from("blog_posts").select("title, title_translations, slug, excerpt").order("created_at", { ascending: false }).limit(3),
          ]);

          // Formatear datos de portafolio para la IA
          const portfolioContext = {
            proyectos: (projectsData.data || []).map(p => ({
              nombre: p.name_translations?.es || p.name,
              descripcion: p.description_translations?.es || p.description,
              url: p.url
            })),
            tienda_productos: (productsData.data || []).map(p => ({
              nombre: p.name_translations?.es || p.name,
              descripcion: p.description_translations?.es || p.description,
              precio: p.price,
              disponibilidad: p.stock > 0 ? "En Stock" : "Sin Stock"
            })),
            experiencia_laboral: (experienceData.data || []).map(e => ({
              empresa: e.company,
              puesto: e.position,
              resumen: e.description
            })),
            ultimos_posts_blog: (postsData.data || []).map(b => ({
              titulo: b.title_translations?.es || b.title,
              resumen: b.excerpt,
              enlace: `vixis.dev/blog/${b.slug}`
            }))
          };

          // C. Llamar a OpenRouter para obtener la respuesta
          const promptSystem = `
            Eres un chatbot inteligente, atento y vendedor oficial de Carlos Andrés Vicioso Lara (Vixis) en WhatsApp.
            Tu objetivo es:
            1. Responder preguntas del portafolio, proyectos, posts y la tienda usando SOLAMENTE la información pública del contexto.
            2. Evaluar y calificar el interés de los usuarios (Lead Scoring). 
            3. De manera persuasiva, invitar a los usuarios a que accedan directamente al portafolio (https://vixis.dev) o la tienda (https://vixis.dev/store) para comprar productos o revisar detalles.
            4. Si detectas que el usuario es un cliente existente (isExistingClient = ${isExistingClient}, nombre = "${clientName}"), trátalo de forma familiar y profesional, dándole prioridad.
            
            REGLAS DE SEGURIDAD IMPORTANTES:
            - NUNCA reveles contraseñas, secretos, tokens, claves, borradores (drafts) o detalles de facturación interna de la base de datos.
            - NUNCA discutas sobre vulnerabilidades o código interno.
            - Si el usuario pregunta por información privada, responde cortésmente que esa información es privada y no está disponible.
            
            Debes responder SIEMPRE en formato JSON estructurado con los siguientes campos:
            {
              "reply": "Tu mensaje para el usuario en WhatsApp (respetuoso, amigable, persuasivo y formateado con emojis si aplica)",
              "isLead": true/false (pon true si el usuario muestra interés en contratar servicios o comprar en la tienda),
              "leadName": "Nombre del prospecto si lo mencionó, o vacío",
              "leadNotes": "Resumen rápido del interés o lo que quiere del portafolio",
              "leadScore": un valor de 1 a 10 evaluando qué tan interesado está
            }
          `;

          const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://vixis.dev",
              "X-Title": "Vixis - Portfolio Chatbot",
            },
            body: JSON.stringify({
              model: "meta-llama/llama-3-8b-instruct:free",
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: promptSystem },
                { role: "system", content: `Contexto público del portafolio: ${JSON.stringify(portfolioContext)}` },
                { role: "user", content: userMessage }
              ]
            })
          });

          if (!openRouterRes.ok) {
            throw new Error(`OpenRouter API error: ${openRouterRes.statusText}`);
          }

          const openRouterData = await openRouterRes.json();
          const rawReplyText = openRouterData.choices?.[0]?.message?.content || "";

          let parsedResponse = {
            reply: "Lo siento, tuve un problema al procesar tu respuesta.",
            isLead: false,
            leadName: "",
            leadNotes: "",
            leadScore: 0
          };

          try {
            parsedResponse = JSON.parse(rawReplyText);
          } catch (e) {
            console.error("Error al parsear respuesta JSON de la IA:", rawReplyText);
            parsedResponse.reply = rawReplyText; // Fallback
          }

          // D. Guardar Lead en Google Sheets si califica (Llamando al Apps Script POST)
          if (parsedResponse.isLead && GOOGLE_SHEET_GAS_URL && GOOGLE_SHEET_SECRET) {
            try {
              await fetch(GOOGLE_SHEET_GAS_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  secret: GOOGLE_SHEET_SECRET,
                  name: parsedResponse.leadName || "Prospecto de WhatsApp",
                  phone: fromNumber,
                  notes: parsedResponse.leadNotes || userMessage,
                  score: parsedResponse.leadScore
                })
              });
              console.log("📈 Lead guardado exitosamente en Google Sheets.");
            } catch (err) {
              console.error("Error al registrar lead en Google Sheets:", err);
            }
          }

          // E. Enviar respuesta de vuelta al usuario en WhatsApp
          await sendWhatsAppMessage(fromNumber, parsedResponse.reply);
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200 });
    } catch (error) {
      console.error("❌ Error en webhook POST:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});

// Función para enviar respuesta a través de Meta Graph API
async function sendWhatsAppMessage(to: string, text: string) {
  const url = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };

  // Agregar appsecret_proof si la App Secret está configurada
  if (WHATSAPP_APP_SECRET) {
    try {
      const proof = await getAppSecretProof(WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET);
      headers["X-App-Secret-Proof"] = proof; // Cabecera estándar de Meta para App Secret Proof
      // También se puede pasar por parámetro, pero Meta API soporta el header X-App-Secret-Proof o appsecret_proof en query/body
    } catch (e) {
      console.error("Error calculando appsecret_proof:", e);
    }
  }

  const payload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "text",
    text: {
      preview_url: false,
      body: text,
    },
  };

  // Enviar
  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload),
  });

  const resData = await response.json();
  if (!response.ok) {
    console.error("❌ Error enviando mensaje a Meta:", resData);
  } else {
    console.log(`📤 Mensaje enviado con éxito a ${to}`);
  }
}

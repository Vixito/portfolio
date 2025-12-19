import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UploadRequest {
  file: string; // Base64 del archivo
  fileName: string;
  fileType: string;
  bucket: string;
  optimize?: boolean;
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      file,
      fileName,
      fileType,
      bucket,
      optimize = true,
    }: UploadRequest = await req.json();

    // Decodificar base64
    const fileBytes = Uint8Array.from(atob(file), (c) => c.charCodeAt(0));

    // Para imágenes, optimizar si está habilitado
    let finalBytes = fileBytes;
    let finalFileName = fileName;
    let finalContentType = fileType;

    if (optimize && fileType.startsWith("image/")) {
      try {
        // Validar tamaño máximo antes de procesar
        if (fileBytes.length > 10 * 1024 * 1024) {
          return new Response(
            JSON.stringify({
              error:
                "El archivo es demasiado grande. Máximo 10MB para imágenes.",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Si ya es WebP, mantenerlo
        if (fileType === "image/webp") {
          finalBytes = fileBytes;
          finalContentType = "image/webp";
        } else {
          // Convertir PNG/JPEG a WebP
          // Intentar múltiples librerías hasta que una funcione
          let converted = false;

          // Opción 1: @cross/image desde esm.sh
          if (!converted) {
            try {
              const imageLib = await import(
                "https://esm.sh/@cross/image@1.0.0"
              );
              const Image = imageLib.default || imageLib;

              const image = await Image.decode(fileBytes);
              const webpBytes = await Image.encode(image, {
                format: "webp",
                quality: 85,
              });

              if (webpBytes && webpBytes.length > 0) {
                finalBytes = new Uint8Array(webpBytes);
                finalContentType = "image/webp";
                converted = true;
                console.log(`✅ Convertido a WebP usando @cross/image`);
              }
            } catch (e) {
              console.warn(
                "@cross/image falló, intentando siguiente opción:",
                e
              );
            }
          }

          // Opción 2: Si @cross/image falla, usar servicio externo o mantener original
          if (!converted) {
            console.warn(
              "⚠️ No se pudo convertir a WebP, manteniendo formato original"
            );
            finalBytes = fileBytes;
          }
        }
      } catch (error) {
        console.error("Error al optimizar imagen:", error);
        // Si falla la optimización, mantener el archivo original
        finalBytes = fileBytes;
      }
    }

    // Generar nombre único con extensión WebP si se convirtió
    const timestamp = Date.now();
    const extension =
      finalContentType === "image/webp"
        ? "webp"
        : fileName.split(".").pop() || "jpg";
    const uniqueFileName = `${bucket}-${timestamp}-${Math.random()
      .toString(36)
      .substring(7)}.${extension}`;

    // Subir a Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(uniqueFileName, finalBytes, {
        contentType: finalContentType,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from(bucket).getPublicUrl(uniqueFileName);

    // Si hay CDN configurado, reemplazar la URL base de Supabase con la del CDN
    const cdnUrl = Deno.env.get("CDN_URL");
    let finalUrl = publicUrl;

    if (cdnUrl) {
      // Extraer la ruta del archivo de la URL de Supabase
      const urlParts = new URL(publicUrl);
      const filePath = urlParts.pathname;
      // Construir la URL del CDN
      finalUrl = `${cdnUrl}${filePath}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: finalUrl,
        fileName: uniqueFileName,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Error al procesar el archivo",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

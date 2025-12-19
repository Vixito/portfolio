import { supabase } from "./supabase";

// Función para subir thumbnail de producto
export async function uploadProductThumbnail(
  file: File,
  productId: string
): Promise<string | null> {
  // 1. Validar tipo y tamaño de archivo
  // 2. Generar nombre único (ej: product-{id}-{timestamp}.jpg)
  // 3. Subir con supabase.storage.from('product-thumbnails').upload()
  // 4. Obtener URL pública con .getPublicUrl()
  // 5. Retornar URL o null si hay error

  try {
    // 1. Validar tipo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Tipo de archivo no permitido");
    }

    // 2. Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("El archivo es demasiado grande (máximo 5MB)");
    }

    // 3. Generar nombre único
    const extension = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const fileName = `product-${productId}-${timestamp}.${extension}`;

    // 4. Subir archivo
    const { data, error } = await supabase.storage
      .from("product-thumbnails")
      .upload(fileName, file, { upsert: false });

    if (error) throw error;

    // 5. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from("product-thumbnails")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error al subir thumbnail del producto:", error);
    return null;
  }
}

export async function uploadProductImage(
  file: File,
  productId: string,
  imageIndex: number = 0
): Promise<string | null> {
  try {
    // 1. Validar tipo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Tipo de archivo no permitido");
    }

    // 2. Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("El archivo es demasiado grande (máximo 5MB)");
    }

    // 3. Generar nombre único
    const extension = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const fileName = `product-${productId}-img${imageIndex}-${timestamp}.${extension}`;

    // 4. Subir archivo
    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, { upsert: false });

    if (error) throw error;

    // 5. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error al subir imagen del producto:", error);
    return null;
  }
}

export async function uploadEventThumbnail(
  file: File,
  eventId: string
): Promise<string | null> {
  try {
    // 1. Validar tipo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Tipo de archivo no permitido");
    }

    // 2. Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("El archivo es demasiado grande (máximo 5MB)");
    }

    // 3. Generar nombre único
    const extension = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const fileName = `event-${eventId}-${timestamp}.${extension}`;

    // 4. Subir archivo
    const { data, error } = await supabase.storage
      .from("event-thumbnails")
      .upload(fileName, file, { upsert: false });

    if (error) throw error;

    // 5. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from("event-thumbnails")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error al subir thumbnail del evento:", error);
    return null;
  }
}

export async function uploadGeneralAsset(
  file: File,
  assetType: string
): Promise<string | null> {
  try {
    // 1. Validar tipo
    const allowedTypes = ["video/mp4", "video/webm", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Tipo de archivo no permitido");
    }

    // 2. Validar tamaño (1GB máximo)
    const maxSize = 1 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("El archivo es demasiado grande (máximo 1GB)");
    }

    // 3. Generar nombre único
    const extension = file.name.split(".").pop() || "mp4";
    const timestamp = Date.now();
    const fileName = `${assetType}-${timestamp}.${extension}`;

    // 4. Subir archivo
    const { data, error } = await supabase.storage
      .from("general-assets")
      .upload(fileName, file, { upsert: false });

    if (error) throw error;

    // 5. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from("general-assets")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error al subir asset general:", error);
    return null;
  }
}

/**
 * Convierte una imagen a WebP en el cliente usando Canvas API
 */
async function convertImageToWebP(
  file: File,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("No se pudo obtener contexto del canvas"));
      return;
    }

    img.onload = () => {
      // Establecer dimensiones del canvas
      canvas.width = img.width;
      canvas.height = img.height;

      // Dibujar imagen en el canvas
      ctx.drawImage(img, 0, 0);

      // Convertir a WebP
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Error al convertir imagen a WebP"));
            return;
          }

          // Crear nuevo File con extensión .webp
          const webpFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, "") + ".webp",
            { type: "image/webp" }
          );
          resolve(webpFile);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      reject(new Error("Error al cargar la imagen"));
    };

    // Cargar imagen desde el archivo
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Optimiza y sube un archivo usando la Edge Function
 * Convierte imágenes a formato WebP en el cliente antes de subir
 */
export async function optimizeAndUpload(
  file: File,
  bucket:
    | "product-thumbnails"
    | "product-images"
    | "event-thumbnails"
    | "general-assets",
  optimize: boolean = true
): Promise<string | null> {
  try {
    // Validar tipo de archivo
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    const allowedVideoTypes = ["video/mp4", "video/webm"];
    const allowedTypes = [
      ...allowedImageTypes,
      ...allowedVideoTypes,
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Tipo de archivo no permitido");
    }

    // Validar tamaño
    const maxSize = file.type.startsWith("video/")
      ? 1 * 1024 * 1024 * 1024 // 1GB para videos
      : 10 * 1024 * 1024; // 10MB para imágenes/PDFs

    if (file.size > maxSize) {
      throw new Error(
        `El archivo es demasiado grande (máximo ${maxSize / 1024 / 1024}MB)`
      );
    }

    // Para imágenes, convertir a WebP en el cliente si está habilitado
    let finalFile = file;
    if (
      optimize &&
      file.type.startsWith("image/") &&
      file.type !== "image/webp"
    ) {
      try {
        console.log(`🔄 Convirtiendo ${file.name} a WebP...`);
        finalFile = await convertImageToWebP(file, 0.85);
        const originalSizeKB = (file.size / 1024).toFixed(2);
        const webpSizeKB = (finalFile.size / 1024).toFixed(2);
        const reduction = (
          ((file.size - finalFile.size) / file.size) *
          100
        ).toFixed(1);
        console.log(
          `✅ Convertido a WebP: ${originalSizeKB}KB → ${webpSizeKB}KB (${reduction}% reducción)`
        );
      } catch (conversionError) {
        console.warn(
          "⚠️ Error al convertir a WebP, subiendo archivo original:",
          conversionError
        );
        // Si falla la conversión, usar el archivo original
        finalFile = file;
      }
    }

    // Convertir archivo a base64
    const arrayBuffer = await finalFile.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Llamar a la Edge Function
    const { data, error } = await supabase.functions.invoke(
      "optimize-and-upload",
      {
        body: {
          file: base64,
          fileName: finalFile.name,
          fileType: finalFile.type,
          bucket,
          optimize: false, // Ya optimizamos en el cliente, no necesitamos optimizar en el servidor
        },
      }
    );

    if (error) throw error;

    return data?.url || null;
  } catch (error) {
    console.error("Error al optimizar y subir archivo:", error);
    return null;
  }
}

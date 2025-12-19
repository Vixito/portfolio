/**
 * Esquemas de validación con Zod para Edge Functions
 */

import { z } from "https://esm.sh/zod@3.22.4";

/**
 * Esquema de validación para calculate-pricing
 */
export const calculatePricingSchema = z.object({
  product_id: z.string().uuid("product_id debe ser un UUID válido"),
  base_currency: z
    .string()
    .length(3, "base_currency debe ser un código de 3 letras")
    .optional()
    .default("USD"),
  target_currency: z
    .string()
    .length(3, "target_currency debe ser un código de 3 letras"),
  region: z
    .string()
    .max(100, "region no puede exceder 100 caracteres")
    .optional(),
  quantity: z
    .number()
    .int("quantity debe ser un número entero")
    .positive("quantity debe ser positivo")
    .max(1000, "quantity no puede exceder 1000")
    .optional()
    .default(1),
});

/**
 * Esquema de validación para extract-event-data
 */
export const extractEventDataSchema = z.object({
  url: z
    .string()
    .url("url debe ser una URL válida")
    .max(2048, "url no puede exceder 2048 caracteres")
    .refine(
      (url) => {
        try {
          const urlObj = new URL(url);
          // Solo permitir HTTP/HTTPS
          return urlObj.protocol === "http:" || urlObj.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "url debe usar protocolo http o https" }
    ),
});

/**
 * Esquema de validación para fetch-blog-posts
 */
export const fetchBlogPostsSchema = z.object({
  platform: z
    .enum(["all", "medium", "devto"], {
      errorMap: () => ({
        message: "platform debe ser 'all', 'medium' o 'devto'",
      }),
    })
    .optional()
    .default("all"),
  username: z
    .string()
    .min(1, "username debe tener al menos 1 carácter")
    .max(100, "username no puede exceder 100 caracteres")
    .optional(),
});

/**
 * Esquema de validación para optimize-and-upload
 */
export const optimizeAndUploadSchema = z.object({
  file: z.string().min(1, "file es requerido (base64)"),
  fileName: z
    .string()
    .min(1, "fileName es requerido")
    .max(255, "fileName no puede exceder 255 caracteres")
    .refine(
      (name) => {
        // Validar que no tenga caracteres peligrosos
        const dangerousChars = /[<>:"|?*\x00-\x1f]/;
        return !dangerousChars.test(name);
      },
      { message: "fileName contiene caracteres no permitidos" }
    ),
  fileType: z
    .string()
    .min(1, "fileType es requerido")
    .refine(
      (type) => {
        // Solo permitir tipos de archivo seguros
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/svg+xml",
        ];
        return allowedTypes.includes(type);
      },
      { message: "fileType no está permitido" }
    ),
  bucket: z
    .string()
    .min(1, "bucket es requerido")
    .refine(
      (bucket) => {
        // Validar que el bucket sea uno de los permitidos
        const allowedBuckets = [
          "general-assets",
          "product-thumbnails",
          "product-images",
          "event-thumbnails",
        ];
        return allowedBuckets.includes(bucket);
      },
      { message: "bucket no está permitido" }
    ),
  optimize: z.boolean().optional().default(true),
});

/**
 * Valida el body de una request contra un esquema Zod
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`
      );
      return {
        success: false,
        error: `Error de validación: ${errors.join(", ")}`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

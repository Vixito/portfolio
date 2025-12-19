/**
 * Rate limiting simple para Supabase Edge Functions
 * Usa un Map en memoria (se reinicia en cada deploy)
 * Para producción, considera usar Redis o Supabase KV
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitStore {
  count: number;
  resetAt: number;
}

// Store en memoria (se reinicia en cada deploy)
const rateLimitStore = new Map<string, RateLimitStore>();

/**
 * Verifica si una request excede el límite de rate
 * @param identifier Identificador único (IP, user ID, etc.)
 * @param config Configuración de rate limit
 * @returns true si está dentro del límite, false si excede
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Si no existe o la ventana expiró, crear nuevo registro
  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Si existe y no ha expirado, incrementar contador
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Obtiene el identificador de la request (IP o header personalizado)
 */
export function getRequestIdentifier(req: Request): string {
  // Intentar obtener IP desde headers de Supabase
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback: usar un identificador genérico (no ideal para producción)
  return "unknown";
}

/**
 * Limpia registros expirados del store (ejecutar periódicamente)
 */
export function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

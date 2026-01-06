/**
 * Utilidades de seguridad para prevenir XSS y otras vulnerabilidades
 */

/**
 * Sanitiza HTML para prevenir XSS
 * Elimina tags y atributos peligrosos, manteniendo solo HTML seguro
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  // Crear un elemento temporal para parsear el HTML
  const div = document.createElement("div");
  div.textContent = html; // Esto escapa automáticamente todo el HTML

  // Si necesitas permitir HTML básico (negrita, cursiva, etc.), puedes usar DOMPurify
  // Por ahora, solo escapamos todo para máxima seguridad
  return div.innerHTML;
}

/**
 * Escapa caracteres especiales HTML
 */
export function escapeHtml(text: string): string {
  if (!text) return "";

  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Valida y sanitiza texto de usuario
 * Elimina caracteres peligrosos y limita la longitud
 */
export function sanitizeUserInput(
  input: string,
  maxLength: number = 1000
): string {
  if (!input) return "";

  // Trim y normalizar espacios
  let sanitized = input.trim().replace(/\s+/g, " ");

  // Limitar longitud
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Eliminar caracteres de control (excepto newline y tab)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

  return sanitized;
}

/**
 * Valida que una URL sea segura (solo http/https)
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Sanitiza una URL para prevenir javascript: y data: URLs
 */
export function sanitizeUrl(url: string): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    // Solo permitir http y https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return url;
  } catch {
    // Si no es una URL válida, retornar vacío
    return "";
  }
}

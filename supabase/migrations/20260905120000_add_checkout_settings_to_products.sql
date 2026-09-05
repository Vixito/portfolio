-- Checkout propio: configuración por producto (pasarelas, entrega, mensajes)
-- Estructura checkout_settings (JSONB):
-- {
--   "gateways": ["paypal", "nowpayments"],          // Pasarelas habilitadas (por defecto ambas)
--   "access_links": ["https://..."],                // Links de acceso/descarga al producto
--   "delivery_message": { "es": "...", "en": "..." }, // Mensaje de entrega por idioma
--   "success_message": { "es": "...", "en": "..." },  // Mensaje de la pantalla de éxito
-- }

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS checkout_settings jsonb;
/**
 * Helpers compartidos para el checkout propio (PayPal + NowPayments)
 * Reutilizados por: create-paypal-order, capture-paypal-order,
 * create-nowpayments-invoice, nowpayments-webhook y get-checkout-invoice.
 */

export const corsCheckoutHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const jsonCheckoutResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsCheckoutHeaders,
      "Content-Type": "application/json",
    },
  });

/**
 * Resuelve las credenciales de PayPal según el entorno:
 * - Modo sandbox si PAYPAL_SANDBOX === "true" o si existen
 *   PAYPAL_SANDBOX_CLIENT_ID y PAYPAL_SANDBOX_SECRET_KEY.
 * - En sandbox usa las credenciales de prueba; si faltan, cae a producción.
 */
export function getPayPalEnv() {
  const hasSandboxCreds =
    !!Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID") &&
    !!Deno.env.get("PAYPAL_SANDBOX_SECRET_KEY");
  const sandbox =
    Deno.env.get("PAYPAL_SANDBOX") === "true" || hasSandboxCreds;
  const clientId = sandbox
    ? Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID") ||
      Deno.env.get("PAYPAL_CLIENT_ID")
    : Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = sandbox
    ? Deno.env.get("PAYPAL_SANDBOX_SECRET_KEY") ||
      Deno.env.get("PAYPAL_SECRET_KEY")
    : Deno.env.get("PAYPAL_SECRET_KEY");
  return { sandbox, clientId, clientSecret };
}

/**
 * Resuelve las credenciales de NowPayments según el entorno:
 * - Modo sandbox si NOWPAYMENTS_SANDBOX === "true" o si existen
 *   NOWPAYMENTS_SANDBOX_API_KEY y NOWPAYMENTS_SANDBOX_IPN_SECRET.
 * - En sandbox usa las credenciales de prueba; si faltan, cae a producción.
 */
export function getNowPaymentsEnv() {
  const hasSandboxKeys =
    !!Deno.env.get("NOWPAYMENTS_SANDBOX_API_KEY") &&
    !!Deno.env.get("NOWPAYMENTS_SANDBOX_IPN_SECRET");
  const sandbox =
    Deno.env.get("NOWPAYMENTS_SANDBOX") === "true" || hasSandboxKeys;
  const apiKey = sandbox
    ? Deno.env.get("NOWPAYMENTS_SANDBOX_API_KEY") ||
      Deno.env.get("NOWPAYMENTS_API_KEY")
    : Deno.env.get("NOWPAYMENTS_API_KEY");
  const ipnSecret = sandbox
    ? Deno.env.get("NOWPAYMENTS_SANDBOX_IPN_SECRET") ||
      Deno.env.get("NOWPAYMENTS_IPN_SECRET")
    : Deno.env.get("NOWPAYMENTS_IPN_SECRET");
  return { sandbox, apiKey, ipnSecret };
}

export interface CheckoutSettings {
  gateways?: string[];
  access_links?: string[];
  delivery_message?: { es?: string; en?: string } | string | null;
  success_message?: { es?: string; en?: string } | string | null;
}

/**
 * Normaliza la configuración de checkout de un producto.
 */
export function normalizeCheckoutSettings(raw: any): CheckoutSettings {
  if (!raw || typeof raw !== "object") return {};
  const gateways = Array.isArray(raw.gateways)
    ? raw.gateways.filter(
        (g: unknown) => g === "paypal" || g === "nowpayments"
      )
    : ["paypal", "nowpayments"];
  const accessLinks = Array.isArray(raw.access_links)
    ? raw.access_links.filter(
        (l: unknown) => typeof l === "string" && l.trim()
      )
    : [];
  return {
    gateways,
    access_links: accessLinks,
    delivery_message: raw.delivery_message ?? null,
    success_message: raw.success_message ?? null,
  };
}

/**
 * Resuelve un mensaje por idioma (soporta string plano o { es, en }).
 */
export function resolveMessage(
  value: { es?: string; en?: string } | string | null | undefined,
  lang: "es" | "en" = "es"
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.es || value.en || "";
}

/**
 * Resuelve el id de un producto: acepta UUID o public_id.
 */
export async function resolveCheckoutProduct(
  supabase: any,
  productId: string
): Promise<any | null> {
  if (!productId) return null;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      productId
    );

  let query = supabase
    .from("products")
    .select(
      `
      id, public_id, title, title_translations, description, full_description,
      thumbnail_url, base_price_usd, base_price_cop, checkout_settings,
      product_pricing (*)
    `
    )
    .eq("is_active", true);

  if (isUuid) {
    query = query.eq("id", productId);
  } else {
    query = query.eq("public_id", productId);
  }

  let { data, error } = await query.maybeSingle();

  // Fallback: slug de buy_button_url (id que se guarda en el producto para el checkout)
  if ((error || !data) && !isUuid) {
    const slugResult = await supabase
      .from("products")
      .select(
        `
        id, public_id, title, title_translations, description, full_description,
        thumbnail_url, base_price_usd, base_price_cop, checkout_settings,
        product_pricing (*)
      `
      )
      .eq("is_active", true)
      // buy_button_url es jsonb: hay que pasar el valor serializado como JSON
      .eq("buy_button_url", JSON.stringify(productId))
      .maybeSingle();
    data = slugResult.data;
    error = slugResult.error;
  }

  // Fallback: short url (prefijo del uuid) usada por Store cuando no hay public_id
  if ((error || !data) && productId.length === 8) {
    const prefixResult = await supabase
      .from("products")
      .select(
        `
        id, public_id, title, title_translations, description, full_description,
        thumbnail_url, base_price_usd, base_price_cop, checkout_settings,
        product_pricing (*)
      `
      )
      .eq("is_active", true)
      .filter("id::text", "like", `${productId}%`)
      .limit(1)
      .maybeSingle();
    data = prefixResult.data;
    error = prefixResult.error;
  }

  if (error || !data) return null;

  return {
    ...data,
    checkout_settings: normalizeCheckoutSettings(data.checkout_settings),
  };
}

/**
 * Calcula el precio efectivo en USD (aplica oferta vigente si existe).
 * Devuelve null si el producto no tiene precio definido.
 */
export function getCheckoutPriceUsd(product: any): number | null {
  if (!product) return null;

  const pricing = Array.isArray(product.product_pricing)
    ? product.product_pricing[0]
    : product.product_pricing;

  if (!pricing) {
    const base = product.base_price_usd;
    return base !== null && base !== undefined && !Number.isNaN(Number(base))
      ? Number(base)
      : null;
  }

  const current = pricing.current_price_usd;
  const isOnSale =
    pricing.is_on_sale &&
    (!pricing.sale_ends_at || new Date(pricing.sale_ends_at) > new Date());

  if (isOnSale && pricing.sale_price_usd != null) {
    return Number(pricing.sale_price_usd);
  }

  return current !== null && current !== undefined && !Number.isNaN(Number(current))
    ? Number(current)
    : null;
}

/**
 * Genera el siguiente número de factura INV-YYYY-NNNN.
 */
export async function generateCheckoutInvoiceNumber(
  supabase: any
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `INV-${currentYear}-`;

  const { data: yearInvoices } = await supabase
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${yearPrefix}%`)
    .order("invoice_number", { ascending: false });

  if (!yearInvoices || yearInvoices.length === 0) {
    return `${yearPrefix}0001`;
  }

  let lastNumber = 0;
  for (const inv of yearInvoices) {
    const num = String(inv.invoice_number).replace(yearPrefix, "");
    const parsed = parseInt(num, 10);
    if (!Number.isNaN(parsed)) lastNumber = Math.max(lastNumber, parsed);
  }

  const next = lastNumber + 1;
  return `${yearPrefix}${String(next).padStart(4, "0")}`;
}

/**
 * Crea la factura local (estado pending) del checkout.
 */
export async function createCheckoutInvoice(
  supabase: any,
  params: {
    product: any;
    amount: number;
    user_name: string;
    user_email: string;
    gateway: "paypal" | "nowpayments";
    delivery_time?: string;
    extra_custom_fields?: Record<string, unknown>;
  }
): Promise<any> {
  const { product, amount, user_name, user_email, gateway } = params;
  const settings = product.checkout_settings || {};

  const invoiceNumber = await generateCheckoutInvoiceNumber(supabase);

  const customFields: Record<string, unknown> = {
    checkout: true,
    gateway,
    features: [],
    product_language: "es",
    delivery_links: settings.access_links || [],
    delivery_message: settings.delivery_message ?? null,
    success_message: settings.success_message ?? null,
    ...(params.extra_custom_fields || {}),
  };

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      product_id: product.id,
      user_name,
      user_email,
      request_type: "Checkout",
      amount: Math.round(amount * 100) / 100,
      currency: "USD",
      delivery_time: params.delivery_time || product.delivery_time || "Inmediato",
      custom_fields: customFields,
      pay_now_link: null,
      status: "pending",
    })
    .select(
      `
      id, invoice_number, product_id, user_name, user_email, request_type,
      amount, currency, delivery_time, custom_fields, status, created_at
    `
    )
    .single();

  if (error) {
    throw new Error(`Error al crear la factura: ${error.message}`);
  }

  return data;
}

/**
 * Obtiene la factura con el producto relacionado.
 */
export async function getCheckoutInvoiceWithProduct(
  supabase: any,
  invoiceId: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      products (id, title, title_translations, description, thumbnail_url)
    `
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

/**
 * Envía la notificación a Discord (embed) cuando llega un pago.
 */
export async function notifyCheckoutDiscord(
  webhookUrl: string | undefined,
  payload: {
    gateway: string;
    transactionId: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    userName: string;
    userEmail: string;
    productTitle: string;
  }
): Promise<void> {
  if (!webhookUrl) return;

  const embed = {
    title: "✅ Pago Recibido",
    color: 0x331d83,
    fields: [
      {
        name: "Pasarela",
        value: payload.gateway === "paypal" ? "PayPal" : "NowPayments (Crypto)",
        inline: true,
      },
      {
        name: "Factura",
        value: `#${payload.invoiceNumber}`,
        inline: true,
      },
      {
        name: "Monto",
        value: `${payload.amount.toFixed(2)} ${payload.currency}`,
        inline: true,
      },
      {
        name: "Producto",
        value: payload.productTitle || "N/A",
        inline: true,
      },
      {
        name: "Cliente",
        value: payload.userName || "N/A",
        inline: true,
      },
      {
        name: "Email",
        value: payload.userEmail || "N/A",
        inline: true,
      },
      {
        name: "Transaction ID",
        value: `\`${payload.transactionId}\``,
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  const body = {
    embeds: [embed],
    username: "Vixis Store",
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(
        "Discord webhook error:",
        res.status,
        await res.text().catch(() => "")
      );
    }
  } catch (err) {
    // No fallar el proceso si la notificación de Discord falla
    console.error("Error al enviar notificación a Discord:", err);
  }
}

/**
 * Marca la factura como pagada y dispara la entrega:
 * email de confirmación con la factura, notificación a Discord y reenvío
 * de la información de entrega (solo se devuelve a quien pagó).
 */
export async function deliverCheckoutOrder(
  supabase: any,
  params: {
    invoice: any;
    gateway: "paypal" | "nowpayments";
    transactionId: string;
    paidAt?: string;
  }
) {
  const { invoice, gateway, transactionId } = params;

  // Idempotencia: si ya está pagada, solo devolver la entrega
  if (
    invoice.status === "paid" ||
    invoice.status === "completed"
  ) {
    return buildDeliveryPayload(invoice);
  }

  const paidAt = params.paidAt || new Date().toISOString();

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      transaction_id: String(transactionId),
      paid_at: paidAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id);

  if (updateError) {
    throw new Error(`Error al marcar la factura como pagada: ${updateError.message}`);
  }

  const refreshed = await getCheckoutInvoiceWithProduct(supabase, invoice.id);

  // Email de confirmación de pago (factura) en background
  supabase.functions
    .invoke("send-invoice-email", {
      body: {
        invoice_id: invoice.id,
        is_update: false,
        is_payment_confirmation: true,
      },
    })
    .catch((emailError: unknown) => {
      console.error("Error al enviar email de confirmación:", emailError);
    });

  // Notificación a Discord (opcional, via secret)
  const discordWebhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
  const productTitle =
    (invoice.products as any)?.title || refreshed?.products?.title || "N/A";

  await notifyCheckoutDiscord(discordWebhookUrl, {
    gateway,
    transactionId,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    amount: invoice.amount,
    currency: invoice.currency,
    userName: invoice.user_name,
    userEmail: invoice.user_email,
    productTitle,
  });

  return buildDeliveryPayload(refreshed || invoice);
}

/**
 * Construye la respuesta de entrega: solo incluye datos sensibles
 * (links de acceso) cuando la factura está pagada.
 */
export function buildDeliveryPayload(invoice: any) {
  const paid =
    invoice.status === "paid" || invoice.status === "completed";
  const customFields = invoice.custom_fields || {};

  const productTitle = invoice.products?.title || null;
  const thumbnailUrl = invoice.products?.thumbnail_url || null;

  const base = {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    paid,
    status: invoice.status,
    product_title: productTitle,
    thumbnail_url: thumbnailUrl,
  };

  if (!paid) return base;

  const lang = customFields.product_language || "es";
  return {
    ...base,
    amount: invoice.amount,
    currency: invoice.currency,
    transaction_id: invoice.transaction_id,
    paid_at: invoice.paid_at,
    delivery: {
      access_links: Array.isArray(customFields.delivery_links)
        ? customFields.delivery_links
        : [],
      delivery_message: resolveMessage(customFields.delivery_message, lang),
      success_message: resolveMessage(customFields.success_message, lang),
    },
  };
}
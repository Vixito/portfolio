/**
 * Cliente Gumroad (API v2) + conciliación de ventas con el BOS.
 * Reutilizado por: gumroad-webhook (ping en tiempo real) y gumroad-sync (backfill).
 *
 * Notas de la API (https://gumroad.com/api, https://gumroad.com/ping):
 * - Auth con access token manual (no expira hasta revocarlo) en header Bearer.
 * - El ping es POST x-www-form-urlencoded SIN firma: se valida con un secreto
 *   propio en la query (?key=) y se trata como trigger (se re-lee la venta).
 * - At-least-once: deduplicar por sale_id (+ resource_name en pings).
 */

const GUMROAD_API = "https://api.gumroad.com/v2";

export function getGumroadEnv() {
  return {
    accessToken: Deno.env.get("GUMROAD_ACCESS_TOKEN") || "",
    pingSecret: Deno.env.get("GUMROAD_PING_SECRET") || "",
  };
}

async function gumroadFetch(path: string, init?: RequestInit): Promise<any> {
  const { accessToken } = getGumroadEnv();
  if (!accessToken) throw new Error("GUMROAD_ACCESS_TOKEN no configurado");
  const res = await fetch(`${GUMROAD_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(
      `Gumroad API ${path}: ${res.status} ${data?.message || JSON.stringify(data).slice(0, 200)}`
    );
  }
  return data;
}

export async function gumroadGetUser(): Promise<any> {
  const data = await gumroadFetch("/user");
  return data?.user || data;
}

export async function gumroadListProducts(): Promise<any[]> {
  const data = await gumroadFetch("/products");
  return Array.isArray(data?.products) ? data.products : [];
}

export async function gumroadGetSale(saleId: string): Promise<any> {
  const data = await gumroadFetch(`/sales/${encodeURIComponent(saleId)}`);
  return data?.sale || null;
}

export async function gumroadListSales(params: {
  after?: string;
  before?: string;
  email?: string;
  product_id?: string;
  page_key?: string;
}): Promise<{ sales: any[]; next_page_key: string | null }> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, String(v));
  }
  const data = await gumroadFetch(`/sales?${q.toString()}`);
  return {
    sales: Array.isArray(data?.sales) ? data.sales : [],
    next_page_key: data?.next_page_key ?? data?.next_page ?? null,
  };
}

/**
 * Totales de una venta. Gumroad reporta en centavos (2900 = $29.00).
 */
export function gumroadSaleTotals(sale: any): { amount: number; currency: string } {
  const cents = Number(sale?.price ?? sale?.total_cents ?? 0);
  const currency = String(sale?.currency || "usd").toLowerCase();
  return {
    amount: Number.isFinite(cents) ? Math.round(cents) / 100 : 0,
    currency,
  };
}

export function gumroadSaleIsFinal(sale: any): boolean {
  if (!sale) return false;
  if (sale.test === true) return false;
  if (sale.refunded === true || sale.chargebacked === true || sale.disputed === true) {
    return false;
  }
  return true;
}

export function gumroadBuyerName(sale: any): string {
  const full = String(sale?.full_name || "").trim();
  if (full) return full.slice(0, 120);
  const email = String(sale?.email || "");
  return email.split("@")[0].slice(0, 120) || "Comprador Gumroad";
}

/**
 * Datos financieros de la venta para el ledger (payment_meta).
 */
export function buildGumroadPaymentMeta(sale: any) {
  if (!sale) return undefined;
  const { amount, currency } = gumroadSaleTotals(sale);
  return {
    gateway: "gumroad",
    sale_id: sale.id || null,
    order_number: sale.order_number ?? null,
    status: "paid",
    price_amount: amount,
    currency,
    quantity: sale.quantity ?? 1,
    product_id: sale.product_id || null,
    product_permalink: sale.product_permalink || sale.custom_permalink || null,
    subscription_id: sale.subscription_id || null,
    is_recurring_charge: sale.is_recurring_charge ?? null,
    offer_code: sale.offer_code || sale.discount_code || null,
  };
}

/**
 * Compara secretos sin filtrar por timing.
 */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

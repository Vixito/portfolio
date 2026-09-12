import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64urlEncode = (input: string | Uint8Array): string => {
  const bytes = typeof input === "string" ? enc.encode(input) : input;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64urlDecode = (input: string): Uint8Array => {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

const ISSUER = "vixis-admin";
const TOKEN_TTL_SECONDS = 24 * 60 * 60; // máx 24h según reglas del proyecto

const getJwtSecret = (): string => {
  const secret = Deno.env.get("JWT_ADMIN_SECRET");
  if (!secret) throw new Error("JWT_ADMIN_SECRET no está configurada en secrets");
  return secret;
};

const sign = async (data: string): Promise<ArrayBuffer> => {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getJwtSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(data));
};

export const createAdminToken = async (username: string): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: username,
    role: "admin",
    iss: ISSUER,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const head = b64urlEncode(JSON.stringify(header));
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = b64urlEncode(new Uint8Array(await sign(`${head}.${body}`)));
  return `${head}.${body}.${sig}`;
};

// Devuelve el nombre de usuario del token si es válido, o null.
export const verifyAdminToken = async (req: Request): Promise<string | null> => {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [head, body, sig] = parts;
  try {
    const expected = b64urlEncode(new Uint8Array(await sign(`${head}.${body}`)));
    if (expected !== sig) return null;

    const payload = JSON.parse(dec.decode(b64urlDecode(body)));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return null;
    if (payload.iss !== ISSUER || payload.role !== "admin") return null;

    return String(payload.sub || "");
  } catch {
    return null;
  }
};

export const verifyPassword = (plaintext: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plaintext, hash);

export const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
};
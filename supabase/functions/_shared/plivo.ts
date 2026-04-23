// Shared Plivo helpers: token encryption + REST API caller
const ENC_KEY = Deno.env.get("PLIVO_ENCRYPTION_KEY") || "fallback-dev-key-change-me-32bytes!";

async function deriveKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const raw = enc.encode(secret.padEnd(32, "0").slice(0, 32));
  return await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await deriveKey(ENC_KEY);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv); out.set(ct, iv.length);
  return btoa(String.fromCharCode(...out));
}

export async function decryptToken(b64: string): Promise<string> {
  const key = await deriveKey(ENC_KEY);
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv = bin.slice(0, 12);
  const ct = bin.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

export async function plivoApi(authId: string, authToken: string, path: string, init: RequestInit = {}) {
  const url = `https://api.plivo.com/v1/Account/${authId}${path}`;
  const auth = btoa(`${authId}:${authToken}`);
  const res = await fetch(url, {
    ...init,
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  return { ok: res.ok, status: res.status, body };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

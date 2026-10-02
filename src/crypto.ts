// Secrets handling: refresh tokens encrypted at rest (PRD §9.2), signed session cookies, signed
// OAuth state and calendar channel tokens, and Google OIDC JWT verification for Pub/Sub pushes.

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
const b64url = (bytes: Uint8Array) => b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => unb64(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));

// ── AES-GCM for refresh tokens ─────────────────────────────────────────────

async function aesKey(secret: string): Promise<CryptoKey> {
  const raw = secret.length === 44 && secret.endsWith("=") ? unb64(secret) : new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(secret)));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plaintext: string, key: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(key), enc.encode(plaintext)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return `v1.${b64(out)}`;
}

export async function decryptSecret(ciphertext: string, key: string): Promise<string> {
  if (!ciphertext.startsWith("v1.")) throw new Error("unknown ciphertext version");
  const data = unb64(ciphertext.slice(3));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.slice(0, 12) }, await aesKey(key), data.slice(12));
  return dec.decode(pt);
}

// ── HMAC signing ───────────────────────────────────────────────────────────

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function sign(value: string, secret: string): Promise<string> {
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(value)));
  return `${value}.${b64url(sig)}`;
}

/** Returns the signed value if the signature is valid, else null (constant-time compare). */
export async function unsign(signed: string, secret: string): Promise<string | null> {
  const i = signed.lastIndexOf(".");
  if (i <= 0) return null;
  const value = signed.slice(0, i);
  let sig: Uint8Array;
  try {
    sig = unb64url(signed.slice(i + 1));
  } catch {
    return null;
  }
  const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), sig, enc.encode(value));
  return ok ? value : null;
}

/** Session cookie value: userId and expiry, signed. */
export async function makeSession(userId: string, secret: string, now: number, ttlMs = 30 * 864e5): Promise<string> {
  return sign(`${userId}|${now + ttlMs}`, secret);
}

export async function readSession(cookie: string | undefined, secret: string, now: number): Promise<string | null> {
  if (!cookie) return null;
  const value = await unsign(cookie, secret);
  if (!value) return null;
  const [userId, exp] = value.split("|");
  return userId && Number(exp) > now ? userId : null;
}

export function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return undefined;
}

// ── Google OIDC JWT (Pub/Sub push authentication) ──────────────────────────

export interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
}

export interface VerifyOptions {
  audience: string;
  /** Service account the push subscription authenticates as. */
  email?: string;
  now?: number;
  jwks: () => Promise<Jwk[]>;
}

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export async function verifyGoogleJwt(token: string, opts: VerifyOptions): Promise<Record<string, unknown>> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed JWT");
  const header = JSON.parse(dec.decode(unb64url(parts[0])));
  const payload = JSON.parse(dec.decode(unb64url(parts[1]))) as Record<string, any>;
  if (header.alg !== "RS256") throw new Error(`unexpected alg ${header.alg}`);
  const jwk = (await opts.jwks()).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("unknown signing key");
  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, unb64url(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new Error("bad signature");
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  if (!GOOGLE_ISSUERS.includes(payload.iss)) throw new Error("bad issuer");
  if (payload.aud !== opts.audience) throw new Error("bad audience");
  if (typeof payload.exp !== "number" || payload.exp < now - 60) throw new Error("token expired");
  if (opts.email && (payload.email !== opts.email || payload.email_verified !== true)) throw new Error("unexpected service account");
  return payload;
}

let jwksCache: { keys: Jwk[]; expiresAt: number } | null = null;

export async function googleJwks(fetcher: typeof fetch = fetch): Promise<Jwk[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;
  const res = await fetcher("https://www.googleapis.com/oauth2/v3/certs");
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const { keys } = (await res.json()) as { keys: Jwk[] };
  jwksCache = { keys, expiresAt: Date.now() + 3600_000 };
  return keys;
}

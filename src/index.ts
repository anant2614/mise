// Edge API (PRD §8.2): OAuth, Gmail/Calendar webhooks, the forward-to-agent email address, the
// dashboard JSON API, and routing everything to the user's InboxAgent.

import { getAgentByName } from "agents";
import PostalMime from "postal-mime";
import { encryptSecret, getCookie, googleJwks, makeSession, readSession, sign, unsign, verifyGoogleJwt } from "./crypto";
import type { Env } from "./env";
import { authUrl, exchangeCode, idTokenClaims, type OAuthClient } from "./google/auth";
import type { UserSettings } from "./types";

export { InboxAgent } from "./agent";

const SESSION_COOKIE = "mise_session";
const STATE_COOKIE = "mise_oauth";

const json = (data: unknown, status = 200) => Response.json(data, { status });
const oauthClient = (env: Env): OAuthClient => ({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: `${env.PUBLIC_URL}/auth/callback`,
});

function cookie(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

async function agentFor(env: Env, userId: string) {
  return getAgentByName(env.InboxAgent, userId);
}

// ── user registry (D1) ─────────────────────────────────────────────────────

export async function ensureSchema(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, created_at INTEGER NOT NULL, plan TEXT NOT NULL DEFAULT 'free')`).run();
}

async function upsertUser(db: D1Database, email: string): Promise<string> {
  await ensureSchema(db);
  const existing = await db.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first<{ id: string }>();
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await db.prepare(`INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)`).bind(id, email, Date.now()).run();
  return id;
}

async function userIdByEmail(db: D1Database, email: string): Promise<string | null> {
  await ensureSchema(db);
  return (await db.prepare(`SELECT id FROM users WHERE email = ?`).bind(email.toLowerCase()).first<{ id: string }>())?.id ?? null;
}

// ── OAuth ──────────────────────────────────────────────────────────────────

async function startAuth(req: Request, env: Env): Promise<Response> {
  const nonce = crypto.randomUUID();
  const state = await sign(`oauth:${nonce}`, env.SESSION_SECRET);
  const tz = new URL(req.url).searchParams.get("tz") ?? "";
  return new Response(null, {
    status: 302,
    headers: {
      location: authUrl(oauthClient(env), state),
      "set-cookie": cookie(STATE_COOKIE, `${nonce}|${tz}`, 600),
    },
  });
}

async function finishAuth(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const [nonce, tz] = (getCookie(req, STATE_COOKIE) ?? "").split("|");
  if (!code || !nonce || (await unsign(state, env.SESSION_SECRET)) !== `oauth:${nonce}`) return new Response("Invalid OAuth state", { status: 400 });

  const tokens = await exchangeCode(oauthClient(env), code);
  if (!tokens.id_token) return new Response("Google did not return an ID token", { status: 400 });
  const claims = idTokenClaims(tokens.id_token);
  if (!claims.email || claims.email_verified === false) return new Response("Google account email is not verified", { status: 400 });
  if (!tokens.refresh_token) return new Response("Google did not grant offline access; please try again", { status: 400 });

  const email = claims.email.toLowerCase();
  const userId = await upsertUser(env.DB, email);
  const agent = await agentFor(env, userId);
  await agent.onboard({
    email,
    name: claims.name,
    refreshTokenEnc: await encryptSecret(tokens.refresh_token, env.TOKEN_ENC_KEY),
    timezone: tz && isValidTimeZone(tz) ? tz : undefined,
  });
  const headers = new Headers({ location: "/?welcome=1" });
  headers.append("set-cookie", cookie(SESSION_COOKIE, await makeSession(userId, env.SESSION_SECRET, Date.now()), 30 * 86400));
  headers.append("set-cookie", cookie(STATE_COOKIE, "", 0));
  return new Response(null, { status: 302, headers });
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// ── webhooks ───────────────────────────────────────────────────────────────

async function gmailWebhook(req: Request, env: Env): Promise<Response> {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return new Response("missing token", { status: 401 });
  try {
    await verifyGoogleJwt(bearer, {
      audience: env.PUBSUB_AUDIENCE ?? `${env.PUBLIC_URL}/webhooks/gmail`,
      email: env.PUBSUB_SERVICE_ACCOUNT,
      jwks: () => googleJwks(),
    });
  } catch (e) {
    return new Response(`unauthorized: ${(e as Error).message}`, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { message?: { data?: string } } | null;
  let data: { emailAddress?: string; historyId?: string | number } = {};
  try {
    data = JSON.parse(atob(body?.message?.data ?? ""));
  } catch {
    return new Response(null, { status: 204 }); // malformed: ack so Pub/Sub doesn't retry forever
  }
  if (!data.emailAddress || !data.historyId) return new Response(null, { status: 204 });
  const userId = await userIdByEmail(env.DB, data.emailAddress);
  if (!userId) return new Response(null, { status: 204 });
  await (await agentFor(env, userId)).onGmailPush(String(data.historyId));
  return new Response(null, { status: 204 });
}

async function calendarWebhook(req: Request, env: Env): Promise<Response> {
  const token = req.headers.get("x-goog-channel-token") ?? "";
  const value = await unsign(token, env.SESSION_SECRET);
  if (!value?.startsWith("cal:")) return new Response("unauthorized", { status: 401 });
  const userId = value.slice(4);
  if (req.headers.get("x-goog-resource-state") === "sync") return new Response(null, { status: 204 });
  await (await agentFor(env, userId)).onCalendarPush();
  return new Response(null, { status: 204 });
}

// ── dashboard API ──────────────────────────────────────────────────────────

async function api(req: Request, env: Env, path: string): Promise<Response> {
  const userId = await readSession(getCookie(req, SESSION_COOKIE), env.SESSION_SECRET, Date.now());
  if (!userId) return json({ error: "not signed in" }, 401);
  if (req.method !== "GET") {
    // CSRF: state-changing calls need a custom header (forces a CORS preflight) and our origin.
    const origin = req.headers.get("origin");
    if (req.headers.get("x-mise") !== "1" || (origin && origin !== new URL(env.PUBLIC_URL).origin)) {
      return json({ error: "bad request origin" }, 403);
    }
  }
  const agent = await agentFor(env, userId);
  const body = req.method === "GET" || req.method === "DELETE" ? {} : ((await req.json().catch(() => ({}))) as Record<string, unknown>);
  let m: RegExpMatchArray | null;

  if (req.method === "GET" && path === "/api/dashboard") return json(await agent.getDashboard());
  if (req.method === "POST" && (m = path.match(/^\/api\/tasks\/([\w-]+)\/(approve|reject|snooze|done)$/))) {
    const [, id, verb] = m;
    if (verb === "approve") return json(await agent.approve(id, body.response as "accepted" | "declined" | undefined));
    if (verb === "reject") return json(await agent.reject(id));
    if (verb === "done") return json(await agent.complete(id));
    const until = Number(body.until);
    if (!Number.isFinite(until) || until <= Date.now()) return json({ ok: false, reason: "until must be a future timestamp" }, 400);
    return json(await agent.snooze(id, until));
  }
  if (req.method === "POST" && (m = path.match(/^\/api\/actions\/([\w-]+)\/undo$/))) return json(await agent.undo(m[1]));
  if (req.method === "PUT" && path === "/api/settings") return json(await agent.updateSettings(sanitizeSettings(body)));
  if (req.method === "POST" && path === "/api/brief") return json(await agent.sendBriefNow());
  if ((m = path.match(/^\/api\/preferences\/([\w.:-]+)$/))) {
    if (req.method === "PUT" && typeof body.value === "string") return json(await agent.setPreference(m[1], body.value.slice(0, 500)));
    if (req.method === "DELETE") return json(await agent.deletePreference(m[1]));
  }
  if (req.method === "POST" && path === "/api/disconnect") {
    const r = await agent.disconnect();
    await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(userId).run();
    return new Response(JSON.stringify(r), { headers: { "content-type": "application/json", "set-cookie": cookie(SESSION_COOKIE, "", 0) } });
  }
  return json({ error: "not found" }, 404);
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Accepts only known settings fields with valid values. */
export function sanitizeSettings(b: Record<string, any>): Partial<UserSettings> {
  const out: Partial<UserSettings> = {};
  if (typeof b.timezone === "string" && isValidTimeZone(b.timezone)) out.timezone = b.timezone;
  if (typeof b.briefTime === "string" && HHMM.test(b.briefTime)) out.briefTime = b.briefTime;
  if (typeof b.endOfDaySummary === "boolean") out.endOfDaySummary = b.endOfDaySummary;
  if (typeof b.autoArchiveNewsletters === "boolean") out.autoArchiveNewsletters = b.autoArchiveNewsletters;
  if (Number.isInteger(b.followUpBusinessDays) && b.followUpBusinessDays >= 1 && b.followUpBusinessDays <= 30) out.followUpBusinessDays = b.followUpBusinessDays;
  if (Array.isArray(b.vips)) out.vips = b.vips.filter((v: unknown) => typeof v === "string" && v.includes("@")).map((v: string) => v.toLowerCase()).slice(0, 100);
  const wh = b.workingHours;
  if (wh && HHMM.test(wh.start) && HHMM.test(wh.end) && Array.isArray(wh.days) && wh.days.every((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)) {
    out.workingHours = { start: wh.start, end: wh.end, days: wh.days };
  }
  const mt = b.meetings;
  if (mt && Number.isInteger(mt.durationMinutes) && mt.durationMinutes >= 10 && mt.durationMinutes <= 240 && HHMM.test(mt.earliest) && Number.isInteger(mt.bufferMinutes) && mt.bufferMinutes >= 0 && mt.bufferMinutes <= 120 && typeof mt.createHolds === "boolean") {
    out.meetings = { durationMinutes: mt.durationMinutes, earliest: mt.earliest, bufferMinutes: mt.bufferMinutes, createHolds: mt.createHolds };
  }
  if (b.autonomy && typeof b.autonomy === "object") {
    // Only outward action types the product supports can be promoted; blocked tools never can.
    const allowed = /^(send_draft:(reply_needed|schedule_meeting|follow_up)|respond_to_invite:rsvp)$/;
    out.autonomy = Object.fromEntries(Object.entries(b.autonomy).filter(([k, v]) => allowed.test(k) && typeof v === "boolean")) as Record<string, boolean>;
  }
  return out;
}

// ── forward-to-agent address (story 8) ─────────────────────────────────────

/** True when Email Routing's authentication results show the message really came from `domain`. */
export function senderAuthenticated(authResults: string, fromEmail: string): boolean {
  const domain = fromEmail.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  const dkim = [...authResults.matchAll(/dkim=pass[^;]*header\.(?:d|i)=@?([\w.-]+)/gi)].some((m) => m[1].toLowerCase() === domain || m[1].toLowerCase().endsWith(`.${domain}`));
  const dmarc = /dmarc=pass/i.test(authResults) && new RegExp(`header\\.from=${domain.replace(/\./g, "\\.")}`, "i").test(authResults);
  return dkim || dmarc;
}

async function handleEmail(message: ForwardableEmailMessage, env: Env): Promise<void> {
  const from = message.from.toLowerCase();
  const userId = await userIdByEmail(env.DB, from);
  const auth = message.headers.get("authentication-results") ?? message.headers.get("arc-authentication-results") ?? "";
  if (!userId || !senderAuthenticated(auth, from)) {
    message.setReject("Only the account owner can delegate to this address");
    return;
  }
  const parsed = await PostalMime.parse(message.raw);
  const text = parsed.text ?? "";
  const instruction = text.split(/-{5,}\s*Forwarded message/i)[0].trim().slice(0, 500) || "handle this";
  const originalFrom = text.match(/From:\s*.*?<?([\w.+-]+@[\w.-]+)>?/)?.[1];
  await (await agentFor(env, userId)).handleDelegated({ subject: parsed.subject ?? "", instruction, originalFrom });
}

// ── entry ──────────────────────────────────────────────────────────────────

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    try {
      if (req.method === "GET" && path === "/auth/google") return await startAuth(req, env);
      if (req.method === "GET" && path === "/auth/callback") return await finishAuth(req, env);
      if (req.method === "POST" && path === "/auth/logout")
        return new Response(null, { status: 204, headers: { "set-cookie": cookie(SESSION_COOKIE, "", 0) } });
      if (req.method === "POST" && path === "/webhooks/gmail") return await gmailWebhook(req, env);
      if (req.method === "POST" && path === "/webhooks/calendar") return await calendarWebhook(req, env);
      if (path.startsWith("/api/")) return await api(req, env, path);
      if (path === "/health") return json({ ok: true });
      if (env.ASSETS) return env.ASSETS.fetch(req);
      return new Response("Not found", { status: 404 });
    } catch (e) {
      console.error(e);
      return json({ error: "internal error" }, 500);
    }
  },

  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    await handleEmail(message, env);
  },
} satisfies ExportedHandler<Env>;

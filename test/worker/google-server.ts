// A small in-memory imitation of the Google REST endpoints Mise calls, installed as the global
// fetch inside workerd so the real GmailRest / CalendarRest / OAuth code paths are exercised.

import { base64UrlDecode, base64UrlEncode } from "../../src/google/mime";

export interface StoredMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  internalDate: string;
  headers: { name: string; value: string }[];
  body: string;
}

function parseRaw(raw: string): { headers: { name: string; value: string }[]; body: string } {
  const text = base64UrlDecode(raw);
  const split = text.indexOf("\r\n\r\n");
  const headers = text
    .slice(0, split)
    .split("\r\n")
    .map((l) => ({ name: l.slice(0, l.indexOf(":")), value: l.slice(l.indexOf(":") + 1).trim() }));
  let body = text.slice(split + 4);
  const ct = headers.find((h) => h.name.toLowerCase() === "content-type")?.value ?? "";
  const boundary = ct.match(/boundary="([^"]+)"/)?.[1];
  if (boundary) {
    const part = body.split(`--${boundary}`).find((p) => /text\/plain/i.test(p)) ?? "";
    body = part.slice(part.indexOf("\r\n\r\n") + 4).replace(/\r\n$/, "");
  }
  return { headers, body };
}

export class FakeGoogle {
  user = "anant@example.com";
  messages = new Map<string, StoredMessage>();
  labels: { id: string; name: string }[] = [{ id: "INBOX", name: "INBOX" }];
  drafts = new Map<string, StoredMessage>();
  sent: StoredMessage[] = [];
  history: { id: number; messageId: string; labelIds: string[] }[] = [];
  busy: { start: string; end: string }[] = [];
  events = new Map<string, any>();
  watches = 0;
  jwks: unknown[] = [];
  requests: { method: string; url: string }[] = [];
  private seq = 1000;

  private id(p: string) {
    return `${p}${++this.seq}`;
  }

  deliver(m: { from: string; subject: string; body: string; threadId?: string; labelIds?: string[]; to?: string; headers?: Record<string, string> }): StoredMessage {
    const id = this.id("msg");
    const msg: StoredMessage = {
      id,
      threadId: m.threadId ?? this.id("thr"),
      labelIds: m.labelIds ?? ["INBOX", "UNREAD"],
      internalDate: String(Date.now()),
      headers: [
        { name: "From", value: m.from },
        { name: "To", value: m.to ?? this.user },
        { name: "Subject", value: m.subject },
        { name: "Message-ID", value: `<${id}@mail.example>` },
        ...Object.entries(m.headers ?? {}).map(([name, value]) => ({ name, value })),
      ],
      body: m.body,
    };
    this.messages.set(id, msg);
    this.history.push({ id: (this.history.at(-1)?.id ?? 5000) + 1, messageId: id, labelIds: msg.labelIds });
    return msg;
  }

  get historyId() {
    return String(this.history.at(-1)?.id ?? 5000);
  }

  labelsOnThread(threadId: string): string[] {
    const ids = new Set([...this.messages.values()].filter((m) => m.threadId === threadId).flatMap((m) => m.labelIds));
    return this.labels.filter((l) => ids.has(l.id)).map((l) => l.name);
  }

  private apiMessage(m: StoredMessage) {
    return {
      id: m.id,
      threadId: m.threadId,
      labelIds: m.labelIds,
      snippet: m.body.slice(0, 80),
      internalDate: m.internalDate,
      payload: { mimeType: "text/plain", headers: m.headers, body: { data: base64UrlEncode(m.body) } },
    };
  }

  fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    this.requests.push({ method: req.method, url: url.toString() });
    const ok = (data: unknown, status = 200) => Response.json(data, { status });
    const body = async () => (req.method === "GET" ? null : await req.json().catch(() => null)) as any;
    const p = url.pathname;
    let m: RegExpMatchArray | null;

    if (url.host === "oauth2.googleapis.com" && p === "/token") {
      const form = new URLSearchParams(await req.text());
      if (form.get("grant_type") === "authorization_code") {
        const claims = base64UrlEncode(JSON.stringify({ email: this.user, email_verified: true, name: "Anant Pathak", sub: "123" }));
        return ok({ access_token: "at-1", expires_in: 3600, refresh_token: "rt-secret", id_token: `e30.${claims}.sig` });
      }
      return form.get("refresh_token") === "rt-secret" ? ok({ access_token: "at-2", expires_in: 3600 }) : ok({ error: "invalid_grant" }, 400);
    }
    if (url.host === "www.googleapis.com" && p === "/oauth2/v3/certs") return ok({ keys: this.jwks });

    if (url.host === "gmail.googleapis.com") {
      if (req.headers.get("authorization") !== "Bearer at-2" && req.headers.get("authorization") !== "Bearer at-1") return ok({ error: "unauthenticated" }, 401);
      const g = p.replace("/gmail/v1/users/me", "");
      if (g === "/profile") return ok({ emailAddress: this.user, historyId: this.historyId });
      if (g === "/watch") {
        this.watches++;
        return ok({ historyId: this.historyId, expiration: String(Date.now() + 7 * 864e5) });
      }
      if (g === "/stop") return ok({});
      if (g === "/history") {
        const start = Number(url.searchParams.get("startHistoryId"));
        const items = this.history.filter((h) => h.id > start);
        return ok({ history: items.map((h) => ({ messagesAdded: [{ message: { id: h.messageId, labelIds: h.labelIds } }] })), historyId: this.historyId });
      }
      if (g === "/messages" && req.method === "GET") return ok({ messages: [...this.messages.values()].map((x) => ({ id: x.id })).reverse() });
      if (g === "/messages/send") {
        const { raw } = await body();
        const parsed = parseRaw(raw);
        const msg: StoredMessage = { id: this.id("sent"), threadId: this.id("thr"), labelIds: ["SENT", "INBOX"], internalDate: String(Date.now()), ...parsed };
        this.sent.push(msg);
        return ok({ id: msg.id, threadId: msg.threadId });
      }
      if ((m = g.match(/^\/messages\/([^/]+)$/))) {
        const msg = this.messages.get(decodeURIComponent(m[1]));
        return msg ? ok(this.apiMessage(msg)) : ok({ error: "not found" }, 404);
      }
      if (g === "/labels" && req.method === "GET") return ok({ labels: this.labels });
      if (g === "/labels" && req.method === "POST") {
        const { name } = await body();
        const label = { id: this.id("Label_"), name };
        this.labels.push(label);
        return ok(label);
      }
      if ((m = g.match(/^\/threads\/([^/]+)\/modify$/))) {
        const { addLabelIds = [], removeLabelIds = [] } = await body();
        for (const msg of this.messages.values()) {
          if (msg.threadId !== m[1]) continue;
          msg.labelIds = [...new Set([...msg.labelIds.filter((l) => !removeLabelIds.includes(l)), ...addLabelIds])];
        }
        return ok({});
      }
      if (g === "/drafts" && req.method === "POST") {
        const { message } = await body();
        const id = this.id("draft");
        this.drafts.set(id, { id: this.id("dmsg"), threadId: message.threadId, labelIds: ["DRAFT"], internalDate: String(Date.now()), ...parseRaw(message.raw) });
        return ok({ id, message: { id: this.drafts.get(id)!.id } });
      }
      if (g === "/drafts/send") {
        const { id } = await body();
        const d = this.drafts.get(id);
        if (!d) return ok({ error: "not found" }, 404);
        this.drafts.delete(id);
        const sent = { ...d, id: this.id("msg"), labelIds: ["SENT"] };
        this.sent.push(sent);
        this.messages.set(sent.id, sent);
        this.history.push({ id: (this.history.at(-1)?.id ?? 5000) + 1, messageId: sent.id, labelIds: sent.labelIds });
        return ok({ id: sent.id, threadId: sent.threadId });
      }
      if ((m = g.match(/^\/drafts\/([^/]+)$/))) {
        const d = this.drafts.get(m[1]);
        if (req.method === "DELETE") {
          this.drafts.delete(m[1]);
          return new Response(null, { status: 204 });
        }
        return d ? ok({ id: m[1], message: this.apiMessage(d) }) : ok({ error: "not found" }, 404);
      }
    }

    if (url.host === "www.googleapis.com" && p.startsWith("/calendar/v3")) {
      const c = p.replace("/calendar/v3", "");
      if (c === "/freeBusy") return ok({ calendars: { primary: { busy: this.busy } } });
      if (c === "/calendars/primary/events/watch") return ok({ resourceId: "r1", expiration: String(Date.now() + 864e5) });
      if (c === "/calendars/primary/events" && req.method === "GET") return ok({ items: [...this.events.values()].filter((e) => e.organizer), nextSyncToken: "sync-1" });
      if (c === "/calendars/primary/events" && req.method === "POST") {
        const ev = { ...(await body()), id: this.id("ev") };
        this.events.set(ev.id, ev);
        return ok(ev);
      }
      if ((m = c.match(/^\/calendars\/primary\/events\/([^/]+)$/))) {
        if (req.method === "DELETE") {
          this.events.delete(m[1]);
          return new Response(null, { status: 204 });
        }
        if (req.method === "PATCH") {
          this.events.set(m[1], { ...this.events.get(m[1]), ...(await body()) });
          return ok(this.events.get(m[1]));
        }
        return ok(this.events.get(m[1]));
      }
    }
    return ok({ error: `fake google: unhandled ${req.method} ${url}` }, 501);
  };
}

// ── Pub/Sub OIDC tokens ─────────────────────────────────────────────────────

export async function makeSigner() {
  const keys = (await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const jwk = (await crypto.subtle.exportKey("jwk", keys.publicKey)) as JsonWebKey;
  const kid = "test-key";
  const enc = (o: unknown) => base64UrlEncode(JSON.stringify(o));
  return {
    jwks: [{ kid, kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256" }],
    async sign(claims: Record<string, unknown>) {
      const head = `${enc({ alg: "RS256", kid, typ: "JWT" })}.${enc(claims)}`;
      const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(head)));
      return `${head}.${base64UrlEncode(sig)}`;
    },
  };
}

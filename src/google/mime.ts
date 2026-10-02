// Gmail message parsing and RFC 2822 construction.

import { BODY_LIMIT } from "../config";
import type { Address, EmailMessage } from "../types";

export function base64UrlDecode(data: string): string {
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function base64UrlEncode(text: string | Uint8Array): string {
  const bytes = typeof text === "string" ? new TextEncoder().encode(text) : text;
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Splits an address list on commas that are not inside quotes or angle brackets. */
export function parseAddressList(value: string | undefined): Address[] {
  if (!value) return [];
  const out: Address[] = [];
  let cur = "";
  let inQuote = false;
  let depth = 0;
  for (const ch of value) {
    if (ch === '"') inQuote = !inQuote;
    else if (ch === "<" && !inQuote) depth++;
    else if (ch === ">" && !inQuote) depth = Math.max(0, depth - 1);
    if (ch === "," && !inQuote && depth === 0) {
      if (cur.trim()) out.push(parseAddress(cur));
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(parseAddress(cur));
  return out.filter((a) => a.email.includes("@"));
}

export function parseAddress(value: string): Address {
  const v = value.trim();
  const m = v.match(/^(.*)<([^>]+)>\s*$/);
  if (m) {
    const name = m[1].trim().replace(/^"|"$/g, "").trim();
    return { name: name || undefined, email: m[2].trim().toLowerCase() };
  }
  return { email: v.replace(/^"|"$/g, "").toLowerCase() };
}

export function formatAddress(a: Address): string {
  if (!a.name) return a.email;
  const safe = a.name.replace(/["\r\n]/g, "");
  return /^[\x20-\x7e]*$/.test(safe) ? `"${safe}" <${a.email}>` : `${encodeHeader(safe)} <${a.email}>`;
}

/** RFC 2047 encoded-word for non-ASCII header values. */
export function encodeHeader(value: string): string {
  const clean = value.replace(/[\r\n]+/g, " ");
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(clean)))}?=`;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/** Drops quoted reply history ("On … wrote:" and ">" lines) so models see only the new text. */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^On .{4,200}wrote:\s*$/.test(line.trim())) break;
    if (/^On .{4,200}$/.test(line.trim()) && /wrote:\s*$/.test(lines[i + 1]?.trim() ?? "")) break;
    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(line.trim())) break;
    if (/^-{5,} Forwarded message -{5,}/i.test(line.trim())) {
      out.push(line);
      continue;
    }
    if (line.startsWith(">")) continue;
    out.push(line);
  }
  return out.join("\n").trim();
}

export function truncate(text: string, limit = BODY_LIMIT): string {
  return text.length > limit ? `${text.slice(0, limit)}\n[…truncated]` : text;
}

interface GmailPart {
  mimeType?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
}

export interface GmailApiMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
}

function findPart(part: GmailPart | undefined, mime: string): string | null {
  if (!part) return null;
  if (part.mimeType === mime && part.body?.data) return base64UrlDecode(part.body.data);
  for (const p of part.parts ?? []) {
    const found = findPart(p, mime);
    if (found !== null) return found;
  }
  return null;
}

const KEPT_HEADERS = [
  "message-id",
  "in-reply-to",
  "references",
  "list-unsubscribe",
  "list-id",
  "precedence",
  "auto-submitted",
  "authentication-results",
  "x-mise-brief-id",
];

export function parseGmailMessage(m: GmailApiMessage): EmailMessage {
  const headers: Record<string, string> = {};
  const raw: Record<string, string> = {};
  for (const h of m.payload?.headers ?? []) {
    const k = h.name.toLowerCase();
    raw[k] = h.value;
    if (KEPT_HEADERS.includes(k)) headers[k] = h.value;
  }
  const plain = findPart(m.payload, "text/plain");
  const html = plain === null ? findPart(m.payload, "text/html") : null;
  const body = truncate(stripQuoted(plain ?? (html ? htmlToText(html) : (m.snippet ?? ""))));
  const replyTo = parseAddressList(raw["reply-to"])[0];
  return {
    id: m.id,
    threadId: m.threadId,
    internalDate: Number(m.internalDate ?? Date.now()),
    from: parseAddressList(raw["from"])[0] ?? { email: "unknown@unknown" },
    to: parseAddressList(raw["to"]),
    cc: parseAddressList(raw["cc"]),
    replyTo,
    subject: raw["subject"] ?? "",
    snippet: m.snippet ?? "",
    body,
    labelIds: m.labelIds ?? [],
    headers,
  };
}

export interface OutgoingMessage {
  from: Address;
  to: Address[];
  cc?: Address[];
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  messageId?: string;
  extraHeaders?: Record<string, string>;
  html?: string;
}

/** Builds an RFC 2822 message and returns it base64url-encoded for the Gmail API. */
export function buildRawMessage(m: OutgoingMessage): string {
  const lines = [
    `From: ${formatAddress(m.from)}`,
    `To: ${m.to.map(formatAddress).join(", ")}`,
    ...(m.cc?.length ? [`Cc: ${m.cc.map(formatAddress).join(", ")}`] : []),
    `Subject: ${encodeHeader(m.subject)}`,
    ...(m.messageId ? [`Message-ID: ${m.messageId}`] : []),
    ...(m.inReplyTo ? [`In-Reply-To: ${m.inReplyTo}`] : []),
    ...(m.references ? [`References: ${m.references}`] : []),
    ...Object.entries(m.extraHeaders ?? {}).map(([k, v]) => `${k}: ${v.replace(/[\r\n]+/g, " ")}`),
    "MIME-Version: 1.0",
  ];
  if (m.html) {
    const boundary = `mise-${crypto.randomUUID()}`;
    lines.push(
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      m.body,
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      m.html,
      `--${boundary}--`,
    );
  } else {
    lines.push("Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", m.body);
  }
  return base64UrlEncode(lines.join("\r\n"));
}

export function replySubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`;
}

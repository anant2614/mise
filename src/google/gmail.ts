// Gmail REST adapter (FR-1, FR-2). Only the narrow MailApi surface is implemented.

import { GoogleApiError, type TokenProvider } from "./auth";
import { base64UrlDecode, parseAddressList, parseGmailMessage, stripQuoted, type GmailApiMessage } from "./mime";
import { HistoryGoneError, type MailApi } from "./types";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export class GmailRest implements MailApi {
  constructor(private auth: TokenProvider) {}

  private async call<T>(path: string, init: RequestInit = {}, opts: { allow404?: boolean } = {}): Promise<T | null> {
    const url = `${BASE}${path}`;
    const res = await this.auth.fetch(url, init);
    if (res.status === 404 && opts.allow404) return null;
    if (!res.ok) throw new GoogleApiError(res.status, await res.text(), url);
    if (res.status === 204) return {} as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    return (await this.call<T>(path, init))!;
  }

  async getProfile() {
    return this.req<{ emailAddress: string; historyId: string }>("/profile");
  }

  async listHistory(startHistoryId: string) {
    const ids = new Set<string>();
    let pageToken: string | undefined;
    let historyId = startHistoryId;
    do {
      const q = new URLSearchParams({ startHistoryId, historyTypes: "messageAdded", maxResults: "500" });
      if (pageToken) q.set("pageToken", pageToken);
      const page = await this.call<{
        history?: { messagesAdded?: { message: { id: string; labelIds?: string[] } }[] }[];
        historyId: string;
        nextPageToken?: string;
      }>(`/history?${q}`, {}, { allow404: true });
      if (!page) throw new HistoryGoneError();
      for (const h of page.history ?? []) for (const m of h.messagesAdded ?? []) {
        if (!m.message.labelIds?.includes("DRAFT")) ids.add(m.message.id);
      }
      historyId = page.historyId ?? historyId;
      pageToken = page.nextPageToken;
    } while (pageToken);
    return { messageIds: [...ids], historyId };
  }

  async listMessageIds(query: string, max: number) {
    const ids: string[] = [];
    let pageToken: string | undefined;
    do {
      const q = new URLSearchParams({ q: query, maxResults: String(Math.min(500, max - ids.length)) });
      if (pageToken) q.set("pageToken", pageToken);
      const page = await this.req<{ messages?: { id: string }[]; nextPageToken?: string }>(`/messages?${q}`);
      ids.push(...(page.messages ?? []).map((m) => m.id));
      pageToken = page.nextPageToken;
    } while (pageToken && ids.length < max);
    return ids;
  }

  async getMessage(id: string) {
    return parseGmailMessage(await this.req<GmailApiMessage>(`/messages/${encodeURIComponent(id)}?format=full`));
  }

  async getThread(threadId: string) {
    const t = await this.req<{ messages?: GmailApiMessage[] }>(`/threads/${encodeURIComponent(threadId)}?format=full`);
    return (t.messages ?? []).map(parseGmailMessage);
  }

  async ensureLabels(names: string[]) {
    const { labels = [] } = await this.req<{ labels?: { id: string; name: string }[] }>("/labels");
    const out: Record<string, string> = {};
    for (const name of names) {
      const existing = labels.find((l) => l.name === name);
      if (existing) {
        out[name] = existing.id;
        continue;
      }
      const created = await this.req<{ id: string }>("/labels", {
        method: "POST",
        body: JSON.stringify({ name, labelListVisibility: "labelShow", messageListVisibility: "show" }),
      });
      out[name] = created.id;
    }
    return out;
  }

  async modifyThread(threadId: string, addLabelIds: string[], removeLabelIds: string[]) {
    await this.req(`/threads/${encodeURIComponent(threadId)}/modify`, {
      method: "POST",
      body: JSON.stringify({ addLabelIds, removeLabelIds }),
    });
  }

  async createDraft(threadId: string, raw: string) {
    const d = await this.req<{ id: string; message: { id: string } }>("/drafts", {
      method: "POST",
      body: JSON.stringify({ message: { raw, threadId } }),
    });
    return { draftId: d.id, messageId: d.message.id };
  }

  async getDraft(draftId: string) {
    const d = await this.call<{ id: string; message: GmailApiMessage }>(`/drafts/${encodeURIComponent(draftId)}?format=full`, {}, { allow404: true });
    if (!d) return null;
    const headers = Object.fromEntries((d.message.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value]));
    const recipients = ["to", "cc", "bcc"].flatMap((k) => parseAddressList(headers[k]).map((a) => a.email));
    const parsed = parseGmailMessage(d.message);
    return { messageId: d.message.id, recipients, body: stripQuoted(parsed.body) };
  }

  async deleteDraft(draftId: string) {
    await this.call(`/drafts/${encodeURIComponent(draftId)}`, { method: "DELETE" }, { allow404: true });
  }

  async sendDraft(draftId: string) {
    const m = await this.req<{ id: string; threadId: string }>("/drafts/send", { method: "POST", body: JSON.stringify({ id: draftId }) });
    return { messageId: m.id, threadId: m.threadId };
  }

  async sendToSelf(raw: string) {
    const profile = await this.getProfile();
    // Defense in depth: this path exists only for the brief, so refuse anything not addressed to the user.
    const head = base64UrlDecode(raw).split("\r\n\r\n")[0];
    const to = head.match(/^To: (.*)$/m)?.[1] ?? "";
    const recipients = parseAddressList(to).map((a) => a.email);
    if (recipients.length !== 1 || recipients[0] !== profile.emailAddress.toLowerCase() || /^(Cc|Bcc):/m.test(head)) {
      throw new Error("sendToSelf may only address the user");
    }
    const m = await this.req<{ id: string; threadId: string }>("/messages/send", { method: "POST", body: JSON.stringify({ raw }) });
    return { messageId: m.id, threadId: m.threadId };
  }

  async watch(topicName: string) {
    const r = await this.req<{ historyId: string; expiration: string }>("/watch", {
      method: "POST",
      body: JSON.stringify({ topicName, labelIds: ["INBOX", "SENT"], labelFilterBehavior: "include" }),
    });
    return { historyId: r.historyId, expiration: Number(r.expiration) };
  }

  async stopWatch() {
    await this.req("/stop", { method: "POST" });
  }
}

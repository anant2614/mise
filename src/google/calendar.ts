// Google Calendar REST adapter (FR-3, FR-13, FR-15).

import type { CalendarEvent } from "../types";
import { GoogleApiError, type TokenProvider } from "./auth";
import { SyncTokenGoneError, type CalendarApi } from "./types";

const BASE = "https://www.googleapis.com/calendar/v3";

interface ApiEvent {
  id: string;
  status?: string;
  summary?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  organizer?: { email?: string };
  attendees?: { email?: string; self?: boolean; responseStatus?: string }[];
}

const ts = (t?: { dateTime?: string; date?: string }) => (t?.dateTime ? Date.parse(t.dateTime) : t?.date ? Date.parse(`${t.date}T00:00:00Z`) : 0);

export function toCalendarEvent(e: ApiEvent): CalendarEvent & { cancelled?: boolean } {
  const self = e.attendees?.find((a) => a.self);
  return {
    id: e.id,
    summary: e.summary ?? "(no title)",
    start: ts(e.start),
    end: ts(e.end),
    status: e.status ?? "confirmed",
    organizer: e.organizer?.email,
    selfResponse: self?.responseStatus as CalendarEvent["selfResponse"],
    attendees: (e.attendees ?? []).map((a) => a.email ?? "").filter(Boolean),
    htmlLink: e.htmlLink,
    cancelled: e.status === "cancelled",
  };
}

export class CalendarRest implements CalendarApi {
  constructor(private auth: TokenProvider) {}

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${BASE}${path}`;
    const res = await this.auth.fetch(url, init);
    if (res.status === 410) throw new SyncTokenGoneError();
    if (!res.ok) throw new GoogleApiError(res.status, await res.text(), url);
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  async freeBusy(timeMin: number, timeMax: number) {
    const r = await this.req<{ calendars: Record<string, { busy?: { start: string; end: string }[] }> }>("/freeBusy", {
      method: "POST",
      body: JSON.stringify({ timeMin: new Date(timeMin).toISOString(), timeMax: new Date(timeMax).toISOString(), items: [{ id: "primary" }] }),
    });
    return (r.calendars.primary?.busy ?? []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
  }

  async insertEvent(e: { summary: string; description?: string; start: number; end: number; tentative: boolean }) {
    const r = await this.req<{ id: string; htmlLink?: string }>("/calendars/primary/events?sendUpdates=none", {
      method: "POST",
      body: JSON.stringify({
        summary: e.summary,
        description: e.description,
        start: { dateTime: new Date(e.start).toISOString() },
        end: { dateTime: new Date(e.end).toISOString() },
        status: e.tentative ? "tentative" : "confirmed",
        transparency: "opaque",
      }),
    });
    return { id: r.id, htmlLink: r.htmlLink };
  }

  async deleteEvent(eventId: string) {
    const url = `${BASE}/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=none`;
    const res = await this.auth.fetch(url, { method: "DELETE" });
    if (!res.ok && res.status !== 404 && res.status !== 410) throw new GoogleApiError(res.status, await res.text(), url);
  }

  async respond(eventId: string, response: "accepted" | "declined" | "tentative") {
    const ev = await this.req<ApiEvent>(`/calendars/primary/events/${encodeURIComponent(eventId)}`);
    const attendees = (ev.attendees ?? []).map((a) => (a.self ? { ...a, responseStatus: response } : a));
    if (!attendees.some((a) => a.self)) throw new Error("you are not an attendee of this event");
    await this.req(`/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
      method: "PATCH",
      body: JSON.stringify({ attendees }),
    });
  }

  async listEvents(syncToken: string | null, timeMin?: number) {
    const events: (CalendarEvent & { cancelled?: boolean })[] = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | null = null;
    do {
      const q = new URLSearchParams({ singleEvents: "true", maxResults: "250" });
      if (syncToken) q.set("syncToken", syncToken);
      else if (timeMin) q.set("timeMin", new Date(timeMin).toISOString());
      if (pageToken) q.set("pageToken", pageToken);
      const page = await this.req<{ items?: ApiEvent[]; nextPageToken?: string; nextSyncToken?: string }>(`/calendars/primary/events?${q}`);
      events.push(...(page.items ?? []).map(toCalendarEvent));
      pageToken = page.nextPageToken;
      nextSyncToken = page.nextSyncToken ?? nextSyncToken;
    } while (pageToken);
    return { events, nextSyncToken };
  }

  async watch(channelId: string, address: string, token: string) {
    const r = await this.req<{ resourceId: string; expiration: string }>("/calendars/primary/events/watch", {
      method: "POST",
      body: JSON.stringify({ id: channelId, type: "web_hook", address, token }),
    });
    return { resourceId: r.resourceId, expiration: Number(r.expiration) };
  }
}

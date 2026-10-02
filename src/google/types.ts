import type { CalendarEvent, EmailMessage, Interval } from "../types";

export class HistoryGoneError extends Error {
  constructor() {
    super("Gmail history is no longer available for this historyId");
  }
}

export class SyncTokenGoneError extends Error {
  constructor() {
    super("Calendar sync token expired");
  }
}

/** The narrow Gmail surface the agent may use (PRD §8.3). There is no generic send. */
export interface MailApi {
  getProfile(): Promise<{ emailAddress: string; historyId: string }>;
  /** Message ids added since `startHistoryId`. Throws HistoryGoneError when it has expired. */
  listHistory(startHistoryId: string): Promise<{ messageIds: string[]; historyId: string }>;
  listMessageIds(query: string, max: number): Promise<string[]>;
  getMessage(id: string): Promise<EmailMessage>;
  getThread(threadId: string): Promise<EmailMessage[]>;
  /** Label name → id, creating missing labels. */
  ensureLabels(names: string[]): Promise<Record<string, string>>;
  modifyThread(threadId: string, addLabelIds: string[], removeLabelIds: string[]): Promise<void>;
  createDraft(threadId: string, raw: string): Promise<{ draftId: string; messageId: string }>;
  /** Current state of a draft (the user may have edited it in Gmail); null if it is gone. */
  getDraft(draftId: string): Promise<{ messageId: string; recipients: string[]; body: string } | null>;
  deleteDraft(draftId: string): Promise<void>;
  sendDraft(draftId: string): Promise<{ messageId: string; threadId: string }>;
  /** Only used for the agent's own brief to the user's address; never exposed as a tool. */
  sendToSelf(raw: string): Promise<{ messageId: string; threadId: string }>;
  watch(topicName: string): Promise<{ historyId: string; expiration: number }>;
  stopWatch(): Promise<void>;
}

export interface CalendarApi {
  freeBusy(timeMin: number, timeMax: number): Promise<Interval[]>;
  insertEvent(e: { summary: string; description?: string; start: number; end: number; tentative: boolean }): Promise<{ id: string; htmlLink?: string }>;
  deleteEvent(eventId: string): Promise<void>;
  respond(eventId: string, response: "accepted" | "declined" | "tentative"): Promise<void>;
  listEvents(syncToken: string | null, timeMin?: number): Promise<{ events: (CalendarEvent & { cancelled?: boolean })[]; nextSyncToken: string | null }>;
  watch(channelId: string, address: string, token: string): Promise<{ resourceId: string; expiration: number }>;
}

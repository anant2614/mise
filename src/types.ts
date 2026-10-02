// Core domain types shared by the pipeline, the store and the Google adapters.

export interface Address {
  name?: string;
  email: string;
}

/** A Gmail message normalized into the fields the agent needs. Bodies are truncated. */
export interface EmailMessage {
  id: string;
  threadId: string;
  /** Epoch millis. */
  internalDate: number;
  from: Address;
  to: Address[];
  cc: Address[];
  replyTo?: Address;
  subject: string;
  snippet: string;
  /** Plain-text body, quoted history stripped where possible, truncated. */
  body: string;
  labelIds: string[];
  /** Lower-cased header names for the headers the rules filter and threading care about. */
  headers: Record<string, string>;
}

export type TriageBucket = "ignore" | "fyi" | "action_for_user" | "waiting_on_others" | "suspicious";

export const TASK_TYPES = [
  "reply_needed",
  "schedule_meeting",
  "follow_up",
  "deadline",
  "rsvp",
  "review_doc",
  "commitment",
  "pay_bill",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export type TaskStatus =
  | "detected"
  | "planned"
  | "awaiting_approval"
  | "done"
  | "dismissed"
  | "snoozed"
  | "expired";

export const OPEN_TASK_STATUSES: TaskStatus[] = ["detected", "planned", "awaiting_approval", "snoozed"];

export interface ProposedAction {
  tool: ToolName;
  args: Record<string, unknown>;
}

export interface Task {
  id: string;
  type: TaskType;
  threadId: string | null;
  messageId: string | null;
  counterparty: string | null;
  ask: string;
  dueAt: number | null;
  owner: "user" | "them";
  status: TaskStatus;
  confidence: number;
  proposedAction: ProposedAction | null;
  rationale: string | null;
  snoozedUntil: number | null;
  createdAt: number;
  updatedAt: number;
}

export type Tier = "free" | "reversible" | "outward" | "blocked";

export type ToolName =
  | "get_thread"
  | "search_threads"
  | "apply_label"
  | "remove_label"
  | "archive_thread"
  | "unarchive_thread"
  | "create_draft"
  | "delete_draft"
  | "get_free_busy"
  | "create_event"
  | "delete_event"
  | "snooze_task"
  | "send_draft"
  | "respond_to_invite"
  | "send_email"
  | "forward_email"
  | "delete_email"
  | "make_payment";

export interface ActionRecord {
  id: string;
  taskId: string | null;
  tool: ToolName;
  args: Record<string, unknown>;
  tier: Tier;
  /** "auto" when the policy allowed it without a human, "user" when approved, null when denied. */
  approvedBy: "auto" | "user" | null;
  status: "executed" | "denied" | "failed" | "undone";
  rationale: string | null;
  result: Record<string, unknown> | null;
  createdAt: number;
  executedAt: number | null;
  undoneAt: number | null;
}

export interface Interval {
  start: number;
  end: number;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: number;
  end: number;
  status: string;
  organizer?: string;
  /** The user's own RSVP state, if they are an attendee. */
  selfResponse?: "needsAction" | "accepted" | "declined" | "tentative";
  attendees: string[];
  htmlLink?: string;
}

export interface UserSettings {
  email: string;
  timezone: string;
  /** "HH:MM" local. */
  workingHours: { start: string; end: string; days: number[] };
  meetings: {
    durationMinutes: number;
    earliest: string;
    bufferMinutes: number;
    createHolds: boolean;
  };
  briefTime: string;
  endOfDaySummary: boolean;
  followUpBusinessDays: number;
  vips: string[];
  autoArchiveNewsletters: boolean;
  /** Action types the user promoted to automatic (e.g. "send_draft:reply_needed"). */
  autonomy: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: Omit<UserSettings, "email"> = {
  timezone: "UTC",
  workingHours: { start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5] },
  meetings: { durationMinutes: 30, earliest: "10:00", bufferMinutes: 15, createHolds: true },
  briefTime: "08:00",
  endOfDaySummary: false,
  followUpBusinessDays: 3,
  vips: [],
  autoArchiveNewsletters: false,
  autonomy: {},
};

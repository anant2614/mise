import { InboxCore } from "../../src/core/pipeline";
import { Store } from "../../src/core/store";
import { DEFAULT_SETTINGS, type UserSettings } from "../../src/types";
import { FakeAI, FakeCalendar, FakeMail, heuristicAI } from "./fakes";
import { memorySql } from "./sqlite";

export const USER = "anant@example.com";
/** Friday 2026-10-02 09:00 in Asia/Kolkata (03:30 UTC). */
export const NOW = Date.parse("2026-10-02T03:30:00Z");

export interface Harness {
  core: InboxCore;
  store: Store;
  mail: FakeMail;
  calendar: FakeCalendar;
  ai: FakeAI;
  clock: { now: number };
}

export function makeHarness(opts: { ai?: FakeAI; settings?: Partial<UserSettings>; now?: number } = {}): Harness {
  const clock = { now: opts.now ?? NOW };
  const store = new Store(memorySql(), () => clock.now);
  store.saveSettings({ ...DEFAULT_SETTINGS, timezone: "Asia/Kolkata", ...opts.settings, email: USER });
  store.set("user_name", "Anant Pathak");
  const mail = new FakeMail(USER);
  const calendar = new FakeCalendar();
  const ai = opts.ai ?? heuristicAI();
  const core = new InboxCore({ store, mail, calendar, ai, baseUrl: "https://mise.example" });
  return { core, store, mail, calendar, ai, clock };
}

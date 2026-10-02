// FR-24/25/26: learn from what the user did with the agent's drafts.

import { z } from "zod";
import { MODELS } from "../config";
import { generateStructured } from "../ai/structured";
import type { Inference } from "../ai/types";
import type { Store } from "./store";

const words = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim().split(" ").filter(Boolean);

/** Word-level Levenshtein distance normalized to 0 (identical) … 1 (completely different). */
export function normalizedEditDistance(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (!x.length && !y.length) return 0;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[y.length] / Math.max(x.length, y.length);
}

/** Below this the draft counts as sent unchanged ("approved"); above it, "edited". */
export const EDIT_THRESHOLD = 0.05;

export function classifyEdit(draft: string, sent: string): { signal: "approved" | "edited"; distance: number } {
  const distance = normalizedEditDistance(draft, sent);
  return { signal: distance <= EDIT_THRESHOLD ? "approved" : "edited", distance };
}

/** A compact, human-readable diff for the learning job: removed and added sentences. */
export function sentenceDiff(draft: string, sent: string): string {
  const split = (s: string) => s.split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
  const a = split(draft);
  const b = split(sent);
  const removed = a.filter((s) => !b.includes(s));
  const added = b.filter((s) => !a.includes(s));
  return [...removed.map((s) => `- ${s}`), ...added.map((s) => `+ ${s}`)].join("\n");
}

const NotesSchema = z.object({ notes: z.array(z.string().min(3).max(160)).max(6) });

/**
 * Turns recent edit diffs into style notes ("drop the 'Hope you're well' opener", "sign off
 * with '— A'"). Notes are stored as learned preferences that the user can view and delete
 * (FR-27) and are fed to the drafting prompt.
 */
export async function learnStyleFromEdits(ai: Inference, store: Store, diffs: string[]): Promise<string[]> {
  if (!diffs.length) return [];
  const existing = store.listPreferences().filter((p) => p.key.startsWith("style.")).map((p) => p.value);
  const res = await generateStructured(
    ai,
    MODELS.drafting,
    [
      {
        role: "system",
        content:
          "You study how a person edits drafts written for them and write short, general style rules for future drafts. Only describe writing style (length, tone, greetings, sign-offs, phrasing). Ignore facts specific to one email. Return JSON {\"notes\": [string]}.",
      },
      {
        role: "user",
        content: `Current notes:\n${existing.map((e) => `- ${e}`).join("\n") || "(none)"}\n\nRecent edits (- removed by the user, + added by the user):\n${diffs
          .map((d, i) => `Edit ${i + 1}:\n${d}`)
          .join("\n\n")}\n\nReturn the full updated list of notes (at most 6).`,
      },
    ],
    NotesSchema,
    { name: "style_notes", reasoningEffort: "high" },
  );
  if (!res) return existing;
  // Replace earlier learned notes; notes the user wrote or edited themselves are kept.
  for (const p of store.listPreferences()) if (p.key.startsWith("style.") && p.source === "learned") store.deletePreference(p.key);
  res.value.notes.forEach((note, i) => store.setPreference(`style.learned.${i + 1}`, note, "learned", 0.7));
  return res.value.notes;
}

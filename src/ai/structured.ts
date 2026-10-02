import { z } from "zod";
import type { ChatMessage, Inference } from "./types";

/** Strips reasoning blocks and code fences, then parses the first JSON object in the text. */
export function parseJsonLoose(text: string): unknown {
  let t = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new Error("no JSON object found in model output");
  }
}

export interface StructuredResult<T> {
  value: T;
  model: string;
  attempts: number;
}

/**
 * PRD §8.5.4: validate every output against its schema. On failure retry once with the
 * validation error, then escalate to the next model, then give up (the caller falls back to
 * "FYI in the brief" rather than acting).
 */
export async function generateStructured<T>(
  ai: Inference,
  models: string[],
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  opts: { name: string; maxTokens?: number; reasoningEffort?: "low" | "medium" | "high" },
): Promise<StructuredResult<T> | null> {
  const jsonSchema = { name: opts.name, schema: z.toJSONSchema(schema) as Record<string, unknown> };
  let attempts = 0;
  for (const model of models) {
    let convo = messages;
    for (let i = 0; i < 2; i++) {
      attempts++;
      let text = "";
      let error: string;
      try {
        text = await ai.generate(model, {
          messages: convo,
          jsonSchema,
          maxTokens: opts.maxTokens,
          reasoningEffort: opts.reasoningEffort,
        });
        const parsed = schema.safeParse(parseJsonLoose(text));
        if (parsed.success) return { value: parsed.data, model, attempts };
        error = z.prettifyError(parsed.error);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
      convo = [
        ...messages,
        { role: "assistant", content: text || "(no output)" },
        {
          role: "user",
          content: `That output was invalid: ${error}\nReturn only a JSON object that matches the schema.`,
        },
      ];
    }
  }
  return null;
}

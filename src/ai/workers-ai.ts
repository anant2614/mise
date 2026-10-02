import type { ClefAnswer, ClefAnswers, ClefQuestion, ClefQuestions, GenerateRequest, Inference } from "./types";

/** The subset of the Workers AI binding we use. */
export interface AiBinding {
  run(model: string, inputs: unknown, options?: unknown): Promise<unknown>;
}

export interface WorkersAiOptions {
  /** AI Gateway id; every call is routed through it for logging, caching and cost tracking. */
  gatewayId?: string;
  /** Tagged on gateway logs so cost can be tracked per user. */
  userId?: string;
}

export class WorkersAiInference implements Inference {
  constructor(
    private ai: AiBinding,
    private opts: WorkersAiOptions = {},
  ) {}

  private runOptions() {
    if (!this.opts.gatewayId) return undefined;
    return {
      gateway: {
        id: this.opts.gatewayId,
        metadata: this.opts.userId ? { userId: this.opts.userId } : undefined,
      },
    };
  }

  async decide(model: string, state: unknown, questions: ClefQuestions): Promise<ClefAnswers> {
    const selector = model.endsWith("clef-flash") ? "clef-flash" : "clef";
    const raw = await this.ai.run(model, { model: selector, state, questions }, this.runOptions());
    return parseClefResponse(raw, questions);
  }

  async generate(model: string, req: GenerateRequest): Promise<string> {
    const inputs: Record<string, unknown> = {
      messages: req.messages,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.2,
    };
    if (req.jsonSchema) {
      inputs.response_format = { type: "json_schema", json_schema: req.jsonSchema.schema };
    }
    if (req.reasoningEffort) inputs.reasoning = { effort: req.reasoningEffort };
    const raw = await this.ai.run(model, inputs, this.runOptions());
    return extractText(raw);
  }
}

/** Pulls the text out of the different response shapes Workers AI text models return. */
export function extractText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (!raw || typeof raw !== "object") return "";
  const r = raw as Record<string, any>;
  if (typeof r.response === "string") return r.response;
  if (r.response && typeof r.response === "object") return JSON.stringify(r.response);
  const choiceContent = r.choices?.[0]?.message?.content;
  if (typeof choiceContent === "string") return choiceContent;
  if (typeof r.output_text === "string") return r.output_text;
  if (Array.isArray(r.output)) {
    const parts: string[] = [];
    for (const item of r.output) {
      if (item?.type !== "message" || !Array.isArray(item.content)) continue;
      for (const c of item.content) if (typeof c?.text === "string") parts.push(c.text);
    }
    if (parts.length) return parts.join("");
  }
  return "";
}

const clamp01 = (n: unknown) => {
  const x = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.min(1, Math.max(0, x));
};

/**
 * Normalizes a Clef (System One API) response into one answer per question. The API returns,
 * per question: noul → P(yes); choice → chosen option + per-option probabilities + confidence;
 * score → probability-weighted score + per-level probabilities. We accept a few equivalent
 * encodings so the adapter keeps working across minor API revisions.
 */
export function parseClefResponse(raw: unknown, questions: ClefQuestions): ClefAnswers {
  const answers = ((raw as any)?.answers ?? (raw as any)?.result?.answers ?? {}) as Record<string, unknown>;
  const out: ClefAnswers = {};
  for (const [id, q] of Object.entries(questions)) {
    out[id] = parseAnswer(answers[id], q);
  }
  return out;
}

function parseAnswer(a: unknown, q: ClefQuestion): ClefAnswer {
  const obj = (a && typeof a === "object" ? a : {}) as Record<string, any>;
  if (q.type === "noul") {
    if (typeof a === "number") return { kind: "noul", p: clamp01(a) };
    const p = obj.noul ?? obj.probability ?? obj.p ?? obj.yes ?? obj.probabilities?.yes ?? obj.probabilities?.true;
    return { kind: "noul", p: clamp01(p) };
  }
  if (q.type === "choice") {
    const options = Object.keys(q.criteria);
    const rawDist = obj.probabilities ?? obj.probs ?? obj.distribution ?? obj.options ?? {};
    const dist: Record<string, number> = {};
    for (const o of options) dist[o] = clamp01(Array.isArray(rawDist) ? rawDist[options.indexOf(o)] : rawDist[o]);
    let top = typeof a === "string" ? a : (obj.choice ?? obj.answer ?? "");
    if (!options.includes(top)) top = options.reduce((best, o) => (dist[o] > (dist[best] ?? -1) ? o : best), options[0]);
    const sum = options.reduce((s, o) => s + dist[o], 0);
    if (sum === 0) {
      // Only a chosen option and a confidence were returned.
      const conf = clamp01(obj.confidence ?? 1);
      for (const o of options) dist[o] = o === top ? conf : options.length > 1 ? (1 - conf) / (options.length - 1) : 0;
    }
    return { kind: "choice", top, p: dist[top], dist };
  }
  const levels = q.criteria.length;
  const rawDist = obj.probabilities ?? obj.probs ?? obj.distribution ?? [];
  const dist: number[] = [];
  for (let i = 0; i < levels; i++) {
    dist.push(clamp01(Array.isArray(rawDist) ? rawDist[i] : (rawDist[q.criteria[i]] ?? rawDist[String(i)])));
  }
  let value: number = typeof a === "number" ? a : obj.score;
  if (typeof value !== "number") value = dist.reduce((s, p, i) => s + p * i, 0);
  if (!dist.some((p) => p > 0) && typeof value === "number") {
    // Only the weighted score was returned: put the mass on the nearest level.
    dist[Math.max(0, Math.min(levels - 1, Math.round(value)))] = 1;
  }
  return { kind: "score", value, dist };
}

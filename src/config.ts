// Model routing and thresholds (PRD §8.5). Model choice is config, not code: each pipeline step
// names an ordered chain of models; the first is the default and later entries are escalations.

export interface ModelConfig {
  /** Clef decision models. */
  triage: string[];
  quickDecision: string[];
  draftGate: string[];
  /** Generative models. */
  extraction: string[];
  drafting: string[];
  brief: string[];
  contentSafety: string | null;
}

export const MODELS: ModelConfig = {
  // PRD §8.5.2: triage moved to clef after the 2026-10-02 test (93% vs 73% bucket accuracy).
  triage: ["@cf/cloudflare/clef"],
  quickDecision: ["@cf/cloudflare/clef-flash", "@cf/cloudflare/clef"],
  draftGate: ["@cf/cloudflare/clef-flash", "@cf/cloudflare/clef"],
  extraction: ["@cf/qwen/qwen3-30b-a3b-fp8", "@cf/zai-org/glm-4.7-flash"],
  drafting: ["@cf/openai/gpt-oss-120b", "@cf/moonshotai/kimi-k2.6"],
  brief: ["@cf/openai/gpt-oss-120b"],
  contentSafety: "@cf/meta/llama-guard-3-8b",
};

export const THRESHOLDS = {
  /** addresses_ai_assistant / requests_sensitive_action at or above this → suspicious, never act. */
  suspicious: 0.5,
  /** P(phishing ∈ {medium, high}) at or above this → suspicious. */
  phishing: 0.6,
  /** Top bucket probability below this → escalate to the next triage model, then FYI. */
  bucketConfidence: 0.7,
  /** P(action_for_user) at or above this → run task extraction. */
  actionForUser: 0.85,
  /** Extracted tasks below this confidence go to the brief as FYI instead of becoming tasks. */
  extractionConfidence: 0.6,
  /** Sent mail: P(user_commitment) at or above this → extract a commitment. */
  commitment: 0.7,
  /** Sent mail: P(expects_reply) at or above this → track as waiting-on. */
  expectsReply: 0.6,
  /** Follow-up resolution: P(answers_request) at or above this closes the waiting-on task. */
  followUpResolved: 0.5,
  /** Approvals in a row without edits before the agent offers to automate an action type. */
  promoteAfter: 5,
};

/** Gmail labels applied by the agent (PRD §6.2). */
export const LABELS = {
  needsYou: "🤖 Needs you",
  draftReady: "🤖 Draft ready",
  waiting: "🤖 Waiting on them",
  handled: "🤖 Handled",
  suspicious: "🤖 Suspicious",
} as const;
export type LabelKey = keyof typeof LABELS;

/** Max characters of a message body we store or send to a model. */
export const BODY_LIMIT = 6000;

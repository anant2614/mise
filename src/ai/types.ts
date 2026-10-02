// Inference interfaces. The pipeline only ever talks to these, so tests can swap in fakes and
// production wires them to the Workers AI binding (routed through AI Gateway).

export type ClefQuestion =
  | { type: "noul"; instructions: string }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };

export type ClefQuestions = Record<string, ClefQuestion>;

export type ClefAnswer =
  | { kind: "noul"; p: number }
  | { kind: "choice"; top: string; p: number; dist: Record<string, number> }
  | { kind: "score"; value: number; dist: number[] };

export type ClefAnswers = Record<string, ClefAnswer>;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  messages: ChatMessage[];
  /** JSON schema to request structured output; the response is still validated by the caller. */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
}

export interface Inference {
  /** One Clef call: a state plus typed questions → a probability for every option. */
  decide(model: string, state: unknown, questions: ClefQuestions): Promise<ClefAnswers>;
  /** One generative call → the model's text output. */
  generate(model: string, req: GenerateRequest): Promise<string>;
}

export function noul(answers: ClefAnswers, id: string): number {
  const a = answers[id];
  return a && a.kind === "noul" ? a.p : 0;
}

export function choice(answers: ClefAnswers, id: string): { top: string; p: number; dist: Record<string, number> } {
  const a = answers[id];
  return a && a.kind === "choice" ? a : { top: "", p: 0, dist: {} };
}

export function score(answers: ClefAnswers, id: string): { value: number; dist: number[] } {
  const a = answers[id];
  return a && a.kind === "score" ? a : { value: 0, dist: [] };
}

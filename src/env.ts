import type { AiBinding } from "./ai/workers-ai";
import type { InboxAgent } from "./agent";

export interface Env {
  InboxAgent: DurableObjectNamespace<InboxAgent>;
  DB: D1Database;
  AI?: AiBinding;
  ASSETS?: Fetcher;

  /** Public origin of this deployment, e.g. https://mise.example.workers.dev */
  PUBLIC_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  /** Gmail push topic, projects/<project>/topics/<topic>. */
  PUBSUB_TOPIC: string;
  /** Audience configured on the Pub/Sub push subscription (defaults to the webhook URL). */
  PUBSUB_AUDIENCE?: string;
  /** Service account the push subscription signs as. */
  PUBSUB_SERVICE_ACCOUNT?: string;
  /** 32-byte base64 key (or passphrase) for encrypting refresh tokens. */
  TOKEN_ENC_KEY: string;
  SESSION_SECRET: string;
  AI_GATEWAY_ID?: string;
}

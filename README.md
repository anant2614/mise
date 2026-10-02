# Mise

An AI agent that lives in Gmail and Google Calendar, finds pending work (replies owed, meetings to schedule, follow-ups, deadlines, RSVPs, promises you made) and prepares it: drafts sit in the real thread, meeting slots come with tentative holds, and a morning brief lists everything with one-word reply commands. Nothing outward-facing happens without your approval unless you've turned on autonomy for that action type.

Built on Cloudflare: Workers, the Agents SDK (one Durable Object per user), D1 and Workers AI. The Clef decision models handle the deciding and open LLMs handle the writing. The spec is the PRD *Inbox Agent* v0.2; this repo implements its **demo cut** (M1 + M2 + reply drafts from M3 + the injection test from M6), plus parts of M3 to M5.

## How it works

```
Gmail push (Pub/Sub, OIDC-verified) ─┐
Calendar push (signed channel token) ─┼─▶ Worker ──▶ InboxAgent (Durable Object per user)
Forward-to-agent email ───────────────┘                │  SQLite store · durable queue · schedules
Dashboard (PWA) ─── JSON API (session + CSRF) ─────────┘
                                                       ▼
                         InboxCore pipeline (src/core, framework-free)
  rules filter ─▶ Clef triage (1 call, 11 questions) ─▶ quarantined extraction ─▶ plan
       │               │ suspicious → label, never act        │ low confidence → FYI
       ▼               ▼                                       ▼
   FYI / ignore   🤖 Suspicious                 draft (gpt-oss) → gate (Clef + static checks)
                                                → Executor (tier policy + audit log + undo)
```

| PRD | Where |
|---|---|
| FR-1/2 Gmail watch + incremental `history.list` sync, full-resync fallback | `src/agent.ts` (`syncMail`, `renewWatch`), `src/google/gmail.ts` |
| FR-3 Calendar sync with `syncToken`, 410 recovery | `src/core/pipeline.ts` (`syncCalendar`), `src/google/calendar.ts` |
| FR-5 rules pre-filter | `src/core/rules.ts` |
| FR-6 one Clef call per email, §8.5.3 question set and routing | `src/core/triage.ts` |
| FR-7 labels `🤖 Needs you / Draft ready / Waiting on them / Handled / Suspicious` | `src/config.ts`, `InboxCore.setLabel` |
| FR-8 to FR-11 extraction, commitments in sent mail, dedupe, auto-close | `src/core/extract.ts`, `InboxCore.handleSent`, `Store.upsertTask` |
| FR-12 to FR-15 reply drafts, slot proposals + holds, nudges, RSVP proposals | `src/core/draft.ts`, `src/core/slots.ts`, `InboxCore.plan*` |
| FR-16, FR-20 rationale on every proposal, audit log, undo | `src/core/executor.ts` |
| FR-17 tiers enforced in code | `src/core/policy.ts` |
| FR-18/19 approvals via dashboard and reply-to-brief, sender authenticated | `src/core/brief.ts`, `src/index.ts` |
| FR-21 morning brief at the user's local time | `InboxCore.sendBrief`, `InboxAgent.morningBrief` |
| FR-24 to FR-27 draft-diff learning, outcomes, style notes, editable memory | `src/core/learning.ts`, dashboard "Learned" tab |
| §6.3 graduated autonomy (offer after 5 clean approvals) | `policy.shouldOfferPromotion`, `InboxCore.maybeAutoApprove` |
| §8.5 model routing as config, validate → retry → escalate → FYI | `src/config.ts`, `src/ai/structured.ts` |
| §9.1 prompt-injection defenses | see below |
| §9.2 encrypted refresh tokens, full deletion on disconnect | `src/crypto.ts`, `InboxAgent.disconnect` |

### Prompt-injection defenses (PRD §9.1)

- **Clef flags it first.** `addresses_ai_assistant`, `requests_sensitive_action` and `phishing_likelihood` come back in the same triage call. Suspicious mail gets a label and an audit entry, and no generative model ever sees it.
- **Quarantine.** The models that read email bodies (extraction, drafting) have no tools. Their output is schema-validated and sanitized: counterparties must already be on the email, and due dates must parse and be plausible.
- **Code decides recipients.** Draft envelopes are built from the thread, not from model output. No generic `send_email` or `forward` tool exists, and blocked tools are denied by the policy even when a user approves.
- **Static draft checks.** A draft that mentions an address not on the thread, or a link not in the source email, is held back, even if the Clef draft gate approves it.
- **Send-time re-check.** On approval, the draft is re-read from Gmail. If anyone added a new recipient, the send is refused.
- **Brief commands** are honored only from mail carrying Gmail's `SENT` label (an outside sender can't forge it) that replies to a brief Mise sent. A forged `From:` header gets no special treatment anywhere.
- **Eval gate.** `test/eval/injection.test.ts` runs every adversarial fixture twice: once with a working detector, and once with **every model compromised** (triage fooled, extractor and drafter obeying the attacker, gate rubber-stamping). Zero successful injections is asserted.

## Running it

```bash
npm install
npm test            # unit + pipeline + injection eval (Node) and Worker/Agent integration (workerd)
npm run typecheck
npm run eval:live   # same fixtures against real Workers AI (needs CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN)
```

### Deploying

1. **Google Cloud**: create an OAuth client (web) with redirect `https://<your-worker>/auth/callback`, enable the Gmail and Calendar APIs, and add yourself as a test user (testing mode allows up to 100 users).
2. **Pub/Sub**: create a topic, grant `gmail-api-push@system.gserviceaccount.com` publish rights, and add a **push** subscription to `https://<your-worker>/webhooks/gmail` with authentication enabled (note the service account and audience).
3. **Cloudflare**:
   ```bash
   npx wrangler d1 create mise            # put the id in wrangler.jsonc
   npm run db:migrate
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put TOKEN_ENC_KEY   # openssl rand -base64 32
   npx wrangler secret put SESSION_SECRET  # openssl rand -base64 32
   npx wrangler secret put PUBSUB_SERVICE_ACCOUNT
   ```
   Set `PUBLIC_URL`, `PUBSUB_TOPIC` and `AI_GATEWAY_ID` in `wrangler.jsonc`, create the AI Gateway, then `npm run deploy`.
4. Optional: point an Email Routing address (e.g. `me@agent.<domain>`) at the Worker for forward-to-agent.

## Tests

| Suite | What it covers |
|---|---|
| `test/unit/*` | Rules, Clef parsing and triage routing, structured output retry/escalation, extraction sanitizing, timezone/slot math, policy tiers, MIME, brief compose/commands/auth, learning, and the full pipeline against in-memory Gmail/Calendar/AI fakes and `node:sqlite` |
| `test/eval/*` | Labeled fixture inbox and the injection release gate |
| `test/worker/*` | The real Worker + InboxAgent DO in workerd: OAuth with signed state, Pub/Sub OIDC verification, push → queue → draft in thread, suspicious labeling, CSRF/session checks, approval → send, slot holds + undo, settings validation, preferences, disconnect. Google is a fake REST server; only inference is faked. |
| `test/live/*` | Real Workers AI models (skipped without credentials) |

## Not built yet

- Web Push notifications (FR-23) and the end-of-day summary (FR-22). The setting exists; nothing sends it yet.
- Vectorize memory and reranking. Style few-shots are the most recent sent replies (same contact first) from SQLite.
- Cloudflare Workflows for long waits. Follow-ups run on the agent's hourly schedule instead.
- Nightly learning applies style notes directly. The PRD's "only if the eval suite doesn't regress" gate needs a hosted eval run.
- Audio brief, attachments/vision, translation, the browser sub-agent and per-user LoRA.
- The dashboard polls the JSON API rather than using `useAgent` live state.
- Model IDs and the Clef response shape follow the Workers AI catalog as of 2026-10-02. `parseClefResponse` accepts several equivalent encodings, but run `npm run eval:live` before relying on it.

# AI-Native Email Clients and Built-in Inbox Copilots (as of Oct 2, 2026)

Scope note: ~20 tool calls; many sources are third-party review blogs (agentys.io, usecarly, aiindigo), flagged as lower-confidence where used. Primary sources fetched: Google Keyword blog (Jan 2026), TechCrunch (Jul 2026). Several fetches (windowsforum, cyberpress) failed.

## Q1: What each product does with AI for pending work, where it lives, autonomy, personalization, integrations, target user

### Takeaway
By late 2026 the incumbents (Gmail/Gemini, Outlook/Copilot) and the premium clients (Superhuman, Fyxer) have all moved to background, proactive triage plus pre-written drafts; the field has bifurcated into "replacement client" (Superhuman, Shortwave, Spark, Canary) vs "inside Gmail/Outlook" (Gemini, Copilot, Fyxer, Notion's agents after Notion Mail's shutdown). Almost all still stop at "draft + suggest", with Copilot's Frontier agent going furthest into auto-acting (rules, archiving, calendar rescheduling).

### Cited Findings

**Superhuman (Superhuman Mail, now part of Superhuman Platform Inc., formerly Grammarly)**
- Grammarly acquired Superhuman in mid-2025 (Reuters exclusive, reported July 1, 2025; Superhuman last valued at $825M) — [TradeZero/Reuters repost](https://tradezero.com/en-at/blog/exclusive-grammarly-acquires-email-startup-superhuman-in-ai-platform-push); [Sacra](https://sacra.com/research/superhuman)
- Grammarly rebranded its parent company to Superhuman (Superhuman Platform Inc.) on Oct 29, 2025; in Feb 2026 it also acquired spreadsheet-AI startup Rows — [Sacra](https://sacra.com/research/superhuman)
- Building "Superhuman Go", a cross-platform AI assistant with context carryover — [TechCrunch, Jul 14 2026](https://techcrunch.com/2026/07/14/superhumans-new-auto-draft-feature-almost-makes-me-like-ai-replies/)
- Auto Drafts (new version, July 2026): identifies important incoming emails and generates reply drafts in the user's tone from prior conversations, plus two alternate variations; personalization via Settings > Personalization (role details, files, links) — [TechCrunch](https://techcrunch.com/2026/07/14/superhumans-new-auto-draft-feature-almost-makes-me-like-ai-replies/)
- Uses "a mixture of models" including frontier models from Anthropic and OpenAI; earlier versions used GPT-3.5 — [TechCrunch](https://techcrunch.com/2026/07/14/superhumans-new-auto-draft-feature-almost-makes-me-like-ai-replies/)
- Auto Drafts covers follow-ups for threads awaiting the user's reply, direct responses to inbound, and scheduling replies; adjusts tone per recipient (lower-confidence review site) — [fast.io](https://fast.io/resources/superhuman-ai-review-2026/)
- Learns from rejections: after the reviewer rejected post-midnight meeting suggestions, it stopped proposing them — [TechCrunch](https://techcrunch.com/2026/07/14/superhumans-new-auto-draft-feature-almost-makes-me-like-ai-replies/)
- Business tier includes auto-drafts with per-contact voice matching, read receipts, follow-up reminders, unlimited automations, CRM integrations (HubSpot, Salesforce, Pipedrive), bundled with Grammarly Pro and Coda; reviewer says AI features are real-time only and don't process the inbox while offline — [agentys.io](https://www.agentys.io/en/blog/superhuman-pricing) (third-party; offline claim unverified)
- Where it lives: replacement client (on top of Gmail/Outlook accounts). Target: execs, sales, power users/teams.

**Gmail with Gemini (Google)**
- Jan 8, 2026 "Gemini era" launch (Gemini 3): AI Overviews (thread summaries free for all; Q&A over inbox for Google AI Pro/Ultra), Help Me Write (free; personalization from other Google apps promised the following month), Suggested Replies (Smart Reply upgrade matching user tone/style; free), Proofread (AI Pro/Ultra), AI Inbox (filters clutter, highlights to-dos, identifies VIPs from frequency/contacts; trusted testers at launch). Google cites 3 billion Gmail users — [Google Keyword blog](https://blog.google/products-and-platforms/products/gmail/gmail-is-entering-the-gemini-era/)
- AI Inbox rolled out in beta to AI Ultra subscribers April 1, 2026, later expanding to AI Plus ($7.99/mo) and AI Pro ($19.99/mo), eligible Workspace Enterprise Plus customers in Gemini Alpha, and to Android/iOS; US-only and can be disabled — [9to5Google, Mar 31 2026](https://9to5google.com/2026/03/31/gmail-ai-inbox-beta-ultra/); [Ubergizmo, Apr 2026](https://www.ubergizmo.com/2026/04/google-ai-inbox-gmail-ultra/); [Primetel](https://primetel.com.cy/google-extends-ai-inbox-feature-to-gmail-on-android-and-ios-8637) (sources partly conflict on whether it is still Ultra-only vs broadly rolling to Plus/Pro — exact Oct 2026 state unclear)
- Google Labs "CC" (tested from Dec 2025): an agent that lives in email, reads Gmail, Drive and Calendar and sends a daily "Your Day Ahead" brief; users reply to the email to add to-dos, search files, save notes, or teach preferences. Consumer accounts only (not Workspace), US/Canada, 18+, priority to AI Ultra/paid — [SiliconANGLE, Dec 16 2025](https://siliconangle.com/2025/12/16/google-tests-cc-ai-agent-summarize-email-calendars-documents/); [ContentGrip](https://www.contentgrip.com/google-email-assistant-cc/); [Computerworld](https://www.computerworld.com/article/4107689/google-tests-an-ai-productivity-agent-that-lives-in-your-inbox.html)
- Gemini app also became "more agentic, delivering proactive 24/7 help" — [Google blog](https://blog.google/innovation-and-ai/products/gemini-app/next-evolution-gemini-app/) (not fetched; details unverified)

**Microsoft Copilot in Outlook**
- Settings include "Prioritize my inbox" (grades incoming mail high/normal/low with a short role-contextual reason), custom draft instructions and calendar instructions — [M365 Copilot Connection / search summary](https://m365copilotconnection.substack.com/p/copilot-in-outlook-a-full-deep-dive)
- April 27, 2026 (Frontier program): agentic Copilot for Outlook — triages (flag, archive, delete, pin, mark read/unread), creates rules, drafts replies in the user's voice, summarizes missed messages; calendar side responds to invites using sender/topic/hours rules, resolves 1:1 conflicts, reschedules rooms, blocks focus time, recommends meeting reductions. Runs as continuous background tasks where "each step is visible, editable, and reversible". Inbox features on Windows/web/mobile; calendar on Windows/web; GA date not specified — [MSFT News Now](https://msftnewsnow.com/copilot-in-outlook-always-on-email-calendar-agent/); [Business Standard, Apr 28 2026](https://www.business-standard.com/amp/technology/tech-news/copilot-can-reply-emails-outlook-draft-manage-calendar-new-features-126042800707_1.html); [Gethyn Ellis, Sep 2026](https://www.gethynellis.com/2026/09/copilot-outlook-inbox-management/)
- Lives inside Outlook; target: enterprise M365 Copilot seats.

**Shortwave**
- Gmail-only replacement client (no Outlook/Exchange) — [agentys.io review](https://www.agentys.io/en/blog/shortwave-review)
- AI features: semantic inbox search/Q&A, thread summaries, AI Write learning from sent mail; reviewer says no autonomous auto-drafting — [agentys.io](https://www.agentys.io/en/blog/shortwave-review); **contradicted in part by** Shortwave's Jan 2026 changelog: integration with Tasklet lets triggers draft replies when emails arrive (drafts appear in Shortwave) and connect to 3,000+ apps — [Shortwave changelog via search](https://shortwave.com/changelog)
- Feb 2026: models upgraded to Claude Sonnet 4.6 (Standard/Advanced) and Claude Opus 4.6 (Expert tier) — [Shortwave changelog](https://shortwave.com/changelog)

**Fyxer AI (newer AI-first, in-Gmail/Outlook) — important comparator**
- Inbox-native assistant inside Gmail and Outlook; sorts into categories like "To Respond", pre-drafts replies in the user's voice before the user opens the thread; also meeting notes — [Sacra](https://sacra.com/c/fyxer-ai)
- $10M Series A Mar 2025 (20VC); $30M Series B Sep 2025 (Madrona); ~$43M total — [Sacra](https://sacra.com/c/fyxer-ai); [Signalbase](https://www.trysignalbase.com/news/funding/fyxer-ai-secures-10m-to-revolutionize-email-meeting-management-efficiency)

**Notion Mail — shut down**
- Launched April 2025 as an AI overlay client on Gmail (auto-labeling via natural-language instructions) — [TechCrunch, Apr 15 2025](https://techcrunch.com/2025/04/15/notion-releases-its-ai-driven-email-inbox); [Notion help](https://www.notion.com/help/guides/organize-your-inbox-with-notion-ai-auto-labeling)
- Shut down Sept 22, 2026; Notion said "more than half of Notion Mail users manage emails without ever opening their inbox" and it is "going all in on using agents to run your inbox" — [Engadget](https://engadget.com/2201940/notion-mail-is-shutting-down); [The Next Web](https://thenextweb.com/news/notion-mail-shuts-down-ai-agents-email-productivity); [AlternativeTo, Jun 2026](https://alternativeto.net/news/2026/6/just-over-a-year-after-launch-notion-is-killing-notion-mail-as-it-shifts-to-ai-agents/)

**Spark (Readdle)**
- Replacement client; AI inbox sorting that learns importance, AI drafting, thread summaries — [Canary blog (competitor source)](https://canarymail.io/blog/canary-mail-vs-spark)
- Nov 2025: launched an AI assistant consolidating AI features plus new paid plans — [MacMagazine, Nov 7 2025](https://macmagazine.com.br/post/2025/11/07/spark-lanca-assistente-que-reune-funcoes-de-ia-e-novos-planos-pagos/)

**Canary Mail**
- Replacement client; optional AI reply drafting, summaries, prioritization; privacy pitch (local encryption), impersonation detection — [Canary blog (self-published)](https://canarymail.io/blog/canary-mail-vs-spark)

**Apple Mail (Apple Intelligence)**
- Priority messages at top of inbox, message/thread summaries, Smart Replies (since iOS 18.1) — [Tom's Guide](https://www.tomsguide.com/phones/iphones/how-to-use-smart-replies-in-apple-mail-on-your-iphone)
- Free with Apple devices; on-device/consumer focus.

**Newer AI-first entrants (2026)**
- Upstream (Paris, YC): GA of an AI-native collaborative inbox "designed for humans and agents", $3M pre-seed, Jun 2026 — [Tech.eu](https://tech.eu/2026/06/03/upstream-raises-3m-to-launch-collaborative-ai-inbox-backed-by-yc-and-xavier-niel/)
- AgentMail (YC S25): $6M seed (General Catalyst), Mar 2026 — email inboxes *for* AI agents (infrastructure, not a user client) — [TechCrunch, Mar 10 2026](https://techcrunch.com/2026/03/10/agentmail-raises-6m-to-build-an-email-service-for-ai-agents/)

### Inferences
- Notion's shutdown rationale is the strongest market signal for Mise: a credible vendor concluded users want an agent that works the inbox, not a new client UI. Mise's "agent inside existing Gmail + brief with reply commands" aligns with this direction, and with Google's CC (brief by email, reply to instruct).
- Google CC is functionally the closest analog to Mise's morning brief with reply commands, but is consumer-only and Labs-gated; Workspace users are not served by it.
- Copilot's Frontier agent is the closest analog to Mise's full scope (triage + drafts + calendar holds + rules) but is enterprise/M365-only.

### Gaps
- Missive and Front: not researched within budget (no sources gathered).
- Shortwave funding/traction not found.
- Apple Mail iOS 26 / 2026-era changes not found; sources reference iOS 18.1.
- Spark and Canary autonomy details (whether drafts are proactive) not verified from primary sources.

## Q2: Which proactively prepare drafts before the user opens a thread vs only on demand?

### Takeaway
Proactive (pre-drafted): Superhuman Auto Drafts, Fyxer, Copilot in Outlook (Frontier agent), and Shortwave only via Tasklet triggers. On demand / suggestion chips: Gmail Help Me Write and Suggested Replies, Apple Smart Replies, Spark, Canary, base Shortwave AI Write.

### Cited Findings
- Superhuman Auto Drafts generates drafts without prompting for emails needing response; co-founder reported 40% of auto-drafts sent within a day, 60% of those unedited — [TechCrunch](https://techcrunch.com/2026/07/14/superhumans-new-auto-draft-feature-almost-makes-me-like-ai-replies/)
- Fyxer pre-drafts replies "before they even open the email thread" — [Sacra](https://sacra.com/c/fyxer-ai)
- Copilot agent drafts follow-ups/replies as background tasks — [MSFT News Now](https://msftnewsnow.com/copilot-in-outlook-always-on-email-calendar-agent/)
- Gmail Suggested Replies are one-click contextual suggestions; Help Me Write is prompt-driven — [Google blog](https://blog.google/products-and-platforms/products/gmail/gmail-is-entering-the-gemini-era/)
- Shortwave: Tasklet triggers can draft replies when emails arrive — [Shortwave changelog](https://shortwave.com/changelog); base product described as having no auto-drafting — [agentys.io](https://www.agentys.io/en/blog/shortwave-review)

### Inferences
- Pre-drafting is table stakes at the premium end ($30+/seat). It is no longer a differentiator on its own; draft acceptance rate (Superhuman's 40%/60% stat) is becoming the metric to beat.

### Gaps
- Whether Gmail's AI Inbox pre-drafts replies (vs only surfacing to-dos) was not confirmed.

## Q3: Pricing per seat and traction (users, ARR)

### Takeaway
Prices range from free (Apple, Gmail basics) to ~$30-40/seat (Superhuman Business, M365 Copilot) and up to $100/seat (Shortwave Max). Hard traction numbers exist mainly for Superhuman/Grammarly and Fyxer.

### Cited Findings
- Superhuman: email requires Business plan, $33/member/mo annual or $40 monthly; Pro $12/$30 (no email); Free (no email); Enterprise custom; standalone Starter tier dropped for new subscribers after Oct 2025 — [agentys.io](https://www.agentys.io/en/blog/superhuman-pricing); Auto Drafts Business-only — [fast.io](https://fast.io/resources/superhuman-ai-review-2026/)
- Superhuman Mail ARR ~$30M (end 2024) to ~$35M (mid 2025); parent >$700M ARR by mid 2025, 40M+ DAU; $1B nondilutive financing from General Catalyst (May 2025) — [Sacra](https://sacra.com/research/superhuman) (secondary aggregator)
- Shortwave: no free tier; Pro $18/mo; Business $24/seat (annual); Premier $36; Max $100; enterprise negotiated; 14-day trial — [opentools/search summary](https://opentools.ai/tools/shortwave); [agentys.io](https://www.agentys.io/en/blog/shortwave-review)
- Gmail: summaries, Help Me Write, Suggested Replies free; Proofread and inbox Q&A for AI Pro ($19.99)/Ultra; AI Inbox started at Ultra ($249.99/mo) and expanded to Plus ($7.99)/Pro — [Google blog](https://blog.google/products-and-platforms/products/gmail/gmail-is-entering-the-gemini-era/); [Ubergizmo](https://www.ubergizmo.com/2026/04/google-ai-inbox-gmail-ultra/)
- Spark: Free, Plus $10/mo, Pro $20/mo (unlimited AI assistant), Enterprise custom; old Premium plan retired — [search summary of Readdle pricing](https://saas.apppricinglab.com/product/spark-ai/)
- Notion Mail AI required Notion Business/Enterprise for unlimited use (pre-shutdown) — [Notion help](https://www.notion.com/help/use-notion-ai-with-notion-mail)
- Fyxer ARR grew from $1M to $30M in 2025 — [Sacra](https://sacra.com/c/fyxer-ai)

### Inferences
- Fyxer's growth ($1M to $30M ARR in a year, inside Gmail/Outlook) shows that a non-replacement, inside-existing-inbox drafting assistant can rival Superhuman Mail's ARR without a new client.

### Gaps
- Microsoft 365 Copilot per-seat price for the Outlook agent in 2026 not confirmed in fetched sources (historically $30/user/mo; unverified for 2026).
- Fyxer per-seat pricing not found.
- Shortwave, Spark, Canary user counts/ARR not found.

## Q4: What's notably missing or criticized?

### Takeaway
Criticisms cluster around cost/lock-in (Superhuman), draft judgment errors (agreeing to pitches, bad meeting times), Gmail-only or enterprise-only availability, gated/US-only rollouts (Gemini), and unsafe prioritization (Apple flagging phishing as priority).

### Cited Findings
- Superhuman auto-drafts sometimes agreed to pitches or proposed meetings after midnight — [TechCrunch](https://techcrunch.com/2026/07/14/superhumans-new-auto-draft-feature-almost-makes-me-like-ai-replies/)
- Superhuman: high per-seat cost ($3,960/yr for 10 people), split inbox needs manual config, replacing Gmail/Outlook creates dependency risk, AI doesn't reduce email volume — [agentys.io](https://www.agentys.io/en/blog/superhuman-pricing)
- Shortwave: Gmail-only, switching cost, mixed-team asymmetry, doesn't solve composition bottleneck — [agentys.io](https://www.agentys.io/en/blog/shortwave-review)
- Apple Intelligence flagged phishing emails as Priority; priority picks mainly date/time-bearing messages and misses important ones — [Tom's Guide](https://tomsguide.com/ai/apple-intelligence-is-marking-phishing-scams-as-priority-emails-heres-what-you-need-to-know); [Cybernews](https://cybernews.com/editorial/apple-intelligence-reportedly-prioritizes-phishing-emails/)
- Gmail AI Inbox US-only, tiered paywall; CC consumer-only, not Workspace — [Ubergizmo](https://www.ubergizmo.com/2026/04/google-ai-inbox-gmail-ultra/); [ContentGrip](https://www.contentgrip.com/google-email-assistant-cc/)
- Copilot agentic Outlook limited to Frontier early access; calendar features not on Mac/mobile at launch — [MSFT News Now](https://msftnewsnow.com/copilot-in-outlook-always-on-email-calendar-agent/)
- Notion Mail users had to manually export drafts, snippets and auto-label instructions before shutdown — [search summary of Engadget/TNW](https://thenextweb.com/news/notion-mail-shuts-down-ai-agents-email-productivity)

### Inferences (differentiation, per product, and openings for Mise)
- Superhuman: speed + polished voice-matched auto drafts + Grammarly/Coda bundle; weakness is price and client lock-in.
- Gmail/Gemini: free baseline and 3B-user distribution; weakness is gating/US-only and suggest-only drafts. Its free baseline compresses willingness to pay for summaries/smart replies.
- Copilot: deepest autonomy (rules, calendar) with reversible steps; enterprise-only.
- Fyxer: closest commercial analog to Mise (in-Gmail, pre-drafted replies) with strong traction.
- Shortwave: best search/Q&A and model quality, extensible via Tasklet; Gmail-only client switch.
- Apple/Spark/Canary: device/privacy-oriented, light AI.
- Openings that no product clearly combines (based on gaps above): explicit commitment/follow-up tracking across threads, tentative calendar holds tied to proposed slots, configurable approval tiers per action type, and an email-native brief with reply commands for Workspace users (CC excludes Workspace). Explicit approval tiers are a differentiator vs Copilot's "reversible" model and vs Superhuman's binary send/don't-send drafts. These are inferences; I did not find sources confirming that no competitor offers commitment tracking.

### Gaps
- No systematic user-review data (G2/Reddit) gathered on Copilot or Gemini accuracy.
- Missive/Front AI capabilities not covered.

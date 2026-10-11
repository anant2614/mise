# Email-Agent Reliability and Inbox-Agent Unit Economics (as of Oct 2026)

## Q1. Which email-agent tasks are reliable today? (benchmarks, vendor metrics, failure modes)

### Takeaway
Single-step, bounded actions are reasonably reliable: filters and folders, settings, composing and sending a specified message, classification, and field extraction from clean documents. Multi-step, calendar and cross-domain workflows are not. In the newest email-specific benchmark (EmailBench, Microsoft, Sep 2026), the best frontier model passes only 33.5% of realistic enterprise email and calendar tasks overall, and 0–27% on multi-domain, cross-domain and orchestration tasks, even when about 99% of its tool calls succeed. Vendor-reported "reliability" numbers are mostly adoption proxies (drafts sent, retention), not accuracy, and their methodology is undisclosed.

### Cited Findings
**EmailBench (arXiv 2609.31906, Microsoft, 25 Sep 2026): the most relevant current benchmark**
- 206 scenarios in 16 categories on a synthetic single-persona corpus, with one run per configuration. The central claim is that "valid tool execution is not equivalent to task completion." — [EmailBench](https://arxiv.org/html/2609.31906)
- Overall pass rates: Claude Sonnet 4.5 33.5% (69/206), Claude Opus 4.1 29.6%, GPT-5.4-reasoning 28.2%, GPT-5.5-reasoning 27.7%, GPT-5.4 25.7%, GPT-5.2 22.8%, o3 22.3%, GPT-5 20.9%. Phi-4 and Mistral Large made no tool calls and scored 0%. — [EmailBench](https://arxiv.org/html/2609.31906)
- Sonnet had a 99.7% call success rate, and 94.7% of its scenarios had at least one tool call with no API failure, yet only 33.5% passed task-level grading. — [EmailBench](https://arxiv.org/html/2609.31906)
- Per-category pass rates (range across the 8 models, Table 33):
  - filters 20–90%
  - folders 44–89%
  - settings 50–75%
  - messages-write 47–73%
  - messages-read (search and answer) 23–38.5%
  - inbox-cleanup (triage) 11–56%
  - calendar-triage 25–37.5%
  - calendar-read 8–25%
  - calendar-write 8–25%
  - meeting-prep 0–22%
  - todo 0–22%
  - contacts 8–25%
  - orchestration 12–18%
  - multi-domain 0–17%
  - cross-domain 7–27%

  — [EmailBench](https://arxiv.org/html/2609.31906)
- Domain breadth hurts: Sonnet fell from 37.7% on one-domain tasks to 14.3% on four-domain tasks. Calendar and multi-domain tasks are overrepresented among scenarios that every model failed. — [EmailBench](https://arxiv.org/html/2609.31906)
- Failure modes:
  - Zero-tool responses: GPT-5 and GPT-5.2 answered 34.5% of scenarios without calling any tool.
  - Looping without finishing: in the OB-H307 ordered inbox-triage task, Sonnet made 29 calls over 15 iterations, re-created folders, and ended with "Let me continue getting all inbox messages:". All static checks passed, but the critical rubric scored 0.
  - Confidently wrong analytics: in OB-H312, the agent answered "100.0%" and the sender analysis was wrong.

  — [EmailBench](https://arxiv.org/html/2609.31906)
- The paper does not quantify long-thread, temporal-reasoning or hallucination failure rates. "No-hallucination" is only a judge dimension. — [EmailBench](https://arxiv.org/html/2609.31906)

**tau-bench / tau2-bench (Sierra): tool-calling consistency**
- Original tau-bench (2024): Claude 3.5 Sonnet scored pass^1 0.460 on airline, falling to 0.225 at pass^4, and 0.692 on retail, falling to 0.462 at pass^4. Consistency across repeated trials collapses even when single-try success looks moderate. These are older 2024 numbers. — [Steel tau-bench leaderboard summary](https://leaderboard.steel.dev/leaderboards/tau-bench/)
- tau2-bench (arXiv 2506.07982, Jun 2025) adds a "dual-control" telecom domain, where both the user and the agent act on shared state. The authors report "significant performance drops when agents shift from no-user to dual-control." The abstract gives no figures. — [tau2-bench arXiv](https://arxiv.org/abs/2506.07982)
- The original tau-bench task set is frozen, and Sierra points researchers to tau3-bench. Current tau2 airline data on aggregators is sparse: BenchLM shows a single sourced row, ZAYA1-74B-Preview at 56.1% avg@1 (Jul 2026). Scores across setups (user simulator, prompts, trial counts) are not comparable. — [Layer3 tau-bench guide](https://www.layer3labs.io/guides/tau-bench-explained); [BenchLM tau2 airline](https://benchlm.ai/benchmarks/tau2airline)

**Other email-agent evals**
- "Manipulation Is Task-Dependent" (arXiv 2606.25899) uses an email-triage environment with a planted distractor topic to test whether inbox content pulls frontier agents off task. Inbox content is an attack and distraction surface. — [arXiv 2606.25899](https://arxiv.org/pdf/2606.25899)
- "Privacy in Action" (arXiv 2509.17488) is a live MCP benchmark with Gmail and Notion tools, including Gmail send, that targets privacy leakage by agents. — [arXiv 2509.17488](https://arxiv.org/pdf/2509.17488)
- No widely adopted benchmark for email drafting quality was found. — [search result summary; EmailBench has no drafting category](https://arxiv.org/html/2609.31906)

**Extraction (invoices and orders)**
- Ramp benchmarked 13+ models on six finance tasks, including invoice OCR. It used a "Perfect Extraction Rate" metric: the share of invoices where every field matched the user's final submitted bill with zero edits. Gemini 3 Flash came close to GPT-5.1 (high reasoning) at under a third of the cost. — [ZenML LLMOps database: Ramp](https://www.zenml.io/llmops-database/comprehensive-llm-benchmarking-for-financial-automation-tasks)
- Vendor and blog benchmarks put field-level invoice accuracy at 85–99% depending on provider and document complexity. Line items and tables are consistently the weakest area: one tester saw Google Document AI drop from 83.8% to 68.1% once tables were included. — [invoicedataextraction.com](https://invoicedataextraction.com/blog/invoice-ocr-api-benchmarks); [HackerNoon test](https://hackernoon.com/can-your-llm-handle-an-invoice-i-tested-5heres-the-truth)
- A small RPA study (arXiv 2507.11364) found regex had higher precision than an LLM on invoice date, while the LLM had higher recall (0.94 vs 0.8). — [arXiv 2507.11364](https://arxiv.org/pdf/2507.11364)

**Vendor-reported metrics (adoption proxies, not accuracy)**
- Superhuman Auto Drafts: during testing, 40% of auto-generated drafts were sent within a day, and 60% of those were sent with zero edits. That implies roughly 24% of drafts were sent unedited. Sample and method are undisclosed. — [Winsome Marketing](https://winsomemarketing.com/ai-in-marketing/superhumans-auto-draft-where-ai-writing-is-headed)
- Superhuman also claims 3.3 hours per week saved, from a consulting firm's pilot with about 50 participants. — [Newsweek](https://www.newsweek.com/nw-ai/artificial-intelligence-ai-superhuman-time-saving-email-tools-2030122). Airframe says the hours-saved methodology is undisclosed and should be treated as directional. — [Airframe](https://www.airframe.ai/product/superhuman-com/analysis)
- Fyxer claims 90% of users are still active three months after starting. This is company-reported and a 2025 figure. — [Sifted](https://sifted.eu/articles/ai-exec-assistant-startup-fyxer-raises-30m-to-expand-to-the-us); [Fyxer blog](https://www.fyxer.com/blog/fyxer-mercury-ai-spending-report)
- Howie: a 24/7 team of former executive assistants verifies or handles work when AI confidence is low. The product is "optimized to avoid bad calendar decisions rather than respond instantly," and tasks may take 15+ minutes by design. No human-fallback percentage is disclosed. — [Sacra: Howie](https://sacra.com/c/howie/); [GeekWire](https://www.geekwire.com/2025/ai-scheduling-assistant-howie-raises-6m-launches-publicly-with-1000-paying-customers/)

### Inferences
- Reliability tiers for a Gmail agent built on frontier or near-frontier models:
  - **High** (automate, with an undo option): labeling, filtering, archiving rules, classification into a small fixed taxonomy, extraction of a few well-defined fields, and drafting a reply the user reviews before sending.
  - **Medium** (suggest, user confirms): search and answer over the mailbox (EmailBench messages-read about 25–38%), triage across a whole inbox, and to-do extraction.
  - **Low** (needs human-in-the-loop or a deterministic engine): calendar reads and writes, multi-party scheduling, meeting prep, and anything that spans email plus calendar plus contacts (0–27%).
- Open models are likely weaker than the tested frontier configs on agentic tool use. In EmailBench, Phi-4 and Mistral Large scored 0% because they made no tool calls. This argues for Mise to keep open models on narrow classification, extraction and drafting steps, and to orchestrate multi-step flows with deterministic code (a fixed pipeline) rather than free-form agent loops.
- Scheduling should be handled as a deterministic slot-finding engine, with the LLM used only to parse intent and draft text. That is consistent with calendar categories being the worst in EmailBench and with Howie's design choice to add human checks.
- pass^k collapse (tau-bench) means a 90% single-run success rate yields noticeably lower consistency across thousands of runs per user per month. Unattended sending or booking requires confirmation gates.

### Gaps
- No authoritative, current tau2 or tau3 leaderboard numbers were retrieved; taubench.com was not fetched.
- No independent measurement of draft acceptance across vendors was found, and no study quantifies ambiguous-date or long-thread failure rates in email specifically.
- EnronQA was not retrieved or verified in this pass.
- No email-triage classification accuracy study with frontier or open-model numbers was found.
- No benchmark numbers for gpt-oss-120b or qwen3 on email or agentic tasks were found.

## Q2. Costs: inference per user, compliance (CASA, SOC 2), and AI-app gross margins

### Takeaway
On Cloudflare Workers AI, open-model inference is cheap enough that roughly $1–3 per user per month is plausible for classify-and-draft workloads. At $20–30/month prices, that implies 85–95% gross margin on inference alone, well above the roughly 50–60% average reported for AI apps. The fixed costs that matter early are Google restricted-scope verification (CASA Tier 2, about $540/year first-hand, more with remediation) and, for B2B selling, SOC 2 (about $16k–60k in year one).

### Cited Findings
- Workers AI pricing: $0.011 per 1,000 Neurons, with 10,000 free Neurons per day. — [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

| Model | Input ($/M tokens) | Output ($/M tokens) |
|---|---|---|
| gpt-oss-120b | 0.35 | 0.75 |
| gpt-oss-20b | 0.20 | 0.30 |
| qwen3-30b-a3b-fp8 | 0.051 | 0.335 |
| qwen3.8-27b | 0.45 | 3.20 |
| llama-3.3-70b-fp8-fast | 0.293 | 2.253 |
| llama-3.1-8b-fp8 | 0.152 | 0.287 |
| qwen3-embedding-0.6b | 0.012 (input only) | — |

- Google CASA Tier 2 (restricted Gmail scopes): one developer with the `gmail.readonly` scope paid $540 for the scan plus two revalidations. The process ran from 5 Dec 2025 to 6 Jan 2026, and the audit flagged encryption settings that needed server changes. — [Indie Hackers: Mailnotes](https://www.indiehackers.com/product/mailnotes)
- Vendor estimates for CASA Tier 2: about $540–1k per year via self-serve labs, up to $15k–75k on the legacy track. The higher figures come from vendors selling pass-through access and are unverified. — [Unipile](https://www.unipile.com/integrating-google-oauth-2-0-user-authentication-into-your-app/); [Truto](https://truto.one/google.md)
- CASA must be renewed annually. Requesting 10+ restricted scopes or domain-wide delegation may trigger Tier 3, which is much costlier. Google rejects apps that request scopes they don't use. — [Nango docs](https://docs.nango.dev/integrations/google-security-review)
- Verification takes 2–8 weeks. — [Unipile](https://www.unipile.com/integrating-google-oauth-2-0-user-authentication-into-your-app/)
- SOC 2 Type II all-in cost, first year (vendor and consultancy estimates that vary widely):
  - by stage: about $16k–27k at seed (~25 people), $30k–50k at Series A, $95k–190k at Series B. — [UnderDefense: Vanta pricing](https://underdefense.com/blog/vanta-pricing/)
  - $20k–60k overall, with the CPA fee only 30–40% of that. — [Agency blog](https://blog.getagency.com/articles/soc-2-audit-cost-for-startups)
  - $30k–110k for a first engagement. — [Tracelayer](https://tracelayer.it.com/blog/soc2-compliance-cost-2026)
- AI-app gross margins: ICONIQ's January 2026 survey of about 300 AI executives reports average AI product gross margin of about 52% projected for 2026, versus about 45% in 2025 and 41% in 2024. Inference is about 23% of revenue (some sources say 23% of AI product costs; the denominator is unclear). Traditional SaaS runs at roughly 75–85%. This is secondary coverage; the original report was not opened. — [SaaStr on ICONIQ](https://www.saastr.com/iconiqs-latest-state-of-ai-report-the-10-most-important-data-points-for-saas-founders); [SoftwareSeni](https://www.softwareseni.com/why-ai-gross-margins-are-so-much-lower-than-saas-and-what-that-means-for-your-business/)
- Bessemer puts healthy AI-native gross margins at roughly 50–60%. Fast-scaling "supernova" AI startups have run at about 25% early, some briefly negative. This is secondary coverage. — [GetMonetizely](https://www.getmonetizely.com/articles/the-economics-of-ai-first-b2b-saas-in-2026-margins-pricing-models-and-profitability)

### Inferences
- Illustrative per-user calculation on gpt-oss-120b. These volumes are my assumptions, not sourced:
  - Classifying 3,000 emails per month at about 1,500 input and 100 output tokens each costs about $1.80.
  - Drafting 300 replies at about 4,000 input and 500 output tokens each costs about $0.53.
  - Routing classification to qwen3-30b-a3b (input $0.051/M) would cut classification cost by about 5–7x.
  - This is consistent with Mise's estimate of about $1.85 per user per month.
- At $1.85 of inference against a $20–30/month price, inference is roughly 6–9% of revenue. That is well below the ICONIQ average of about 23%. Gmail API usage, Workers and storage are additional but small.
- The structural margin risks are:
  - heavy users, where volume scales with inbox size, so a usage cap or tier is needed;
  - escalating to frontier models for hard tasks;
  - human-in-the-loop labor, if offered.
- Fixed compliance costs are about $0.5–1k per year for CASA, plus remediation engineering time. SOC 2 (about $16k+) is only needed when selling to companies. At $25/month, CASA is recovered by about 2–3 paying users and seed-stage SOC 2 by about 55–90 user-years.

### Gaps
- No verified current frontier-model per-token prices were fetched for a side-by-side frontier vs. open comparison.
- No reported per-user inference costs from Fyxer, Superhuman or Shortwave were found.
- The Information's specific reporting on AI app margins was not retrieved, and neither was the ICONIQ primary report.
- Neuron-to-dollar conversions above use Cloudflare's published per-M-token prices; Clef decision-model pricing was not checked.

## Q3. Pricing models that work

### Takeaway
Per-seat subscriptions in the $25–50/month range dominate inbox assistants and have produced the clearest revenue traction (Fyxer about $30–35M ARR). Premium tiers ($95–145/month) are used where humans or heavier compute back the product (Howie). Outcome-based pricing is proven in support (Intercom Fin at $0.99 per outcome), but I found no evidence of per-meeting or per-order pricing at scale in inbox agents.

### Cited Findings
- **Fyxer:** about $30M ARR per a January 2026 job posting; a May 2026 milestone of $35M per an ARR tracker; about $30M annualized revenue in 2025 after 2,900% year-over-year growth. A $100M end-of-2026 figure is a forecast. — [Madrona job post](https://jobs.madrona.com/companies/fyxer-ai-2-c5c4f4c5-f1a1-4618-84a1-215fd8259b53/jobs/65602097-head-of-revenue-operations); [ARR Club](https://www.arr.club/fyxer/fyxer-memo-2025-09-09-120); [Sacra: Howie page competitor data](https://sacra.com/c/howie/); [Growth Unhinged](https://www.growthunhinged.com/p/the-ai-native-growth-team)
- **Howie:**
  - Basic is $35/month ($25 annual); Pro is $145/month ($95 annual) and adds white-labeling, a custom-domain email and more compute per task. — [Sacra: Howie](https://sacra.com/c/howie/)
  - Launched publicly with 1,000+ paying customers and a $6M seed in Sep 2025, at $25 standard and $95 premium. — [GeekWire](https://www.geekwire.com/2025/ai-scheduling-assistant-howie-raises-6m-launches-publicly-with-1000-paying-customers/)
  - A 2026 review describes credit-based Team plans from $25/month for 1,250 credits up to $2,500/month for 150,000 credits. — [Carly review](https://www.usecarly.com/blog/howie-ai-review/)
- **Comparables:** Lindy starts at $49.99/month; Tasklet reached $10M ARR in May 2026; Calendly launched its "Callie" agent in May 2026. — [Sacra: Howie](https://sacra.com/c/howie/)
- **Intercom Fin (outcome-based reference):**
  - $0.99 per outcome (resolution, procedure handoff or disqualification) and $9.99 per lead qualification, with a 50-outcome monthly minimum, on top of $29–132 seats.
  - Critics estimate $900–1,000+ per month for 1,000 conversations.
  - Sources are third-party pricing blogs. — [Featurebase](https://www.featurebase.app/blog/fin-ai-pricing); [Gleap](https://www.gleap.io/blog/intercom-fin-ai-pricing-2026)

### Inferences
- For a consumer or prosumer Gmail agent, a flat seat price of about $20–35/month with an inference cost of about $2 is the proven pattern.
- Outcome or usage pricing fits B2B workflows where the outcome is countable and valuable, such as orders processed, invoices captured, or leads qualified (Fin's $9.99 qualification tier shows a willingness to pay much more per qualified lead than per resolution).
- A credit layer (as in Howie's Team plan) protects margin against heavy users.

### Gaps
- No public data was found on churn or ARPU differences between seat and outcome pricing for inbox agents.
- No examples of per-meeting-booked pricing in production were verified.

## Q4. Human-in-the-loop economics (x.ai vs. Howie)

### Takeaway
x.ai, whose assistants were sunset in 2021 after an acquisition, relied on human trainers who reviewed nearly all emails. That is a cost structure that cannot reach software margins at a low consumer price. Howie uses humans only on low-confidence or high-stakes cases, accepts slower turnaround, and charges premium tiers up to $95–145/month. Human backup makes sense when errors are costly and visible (calendars, external parties), when model confidence is well calibrated so only a small fraction escalates, and when price covers the labor.

### Cited Findings
- **x.ai (Bloomberg, Apr 2016):**
  - "Behind almost every e-mail" was a human. Trainers sometimes sat 12 hours a day highlighting phrases.
  - As recently as a few months before publication, trainers "looked over parts of almost all incoming e-mails" before Amy responded, and the company said trainers still verified "the vast majority" of information.
  - Clara, another scheduling service, used a similar model.

  — [Bloomberg](https://www.bloomberg.com/news/articles/2016-04-18/the-humans-hiding-behind-the-chatbots)
- x.ai's Amy and Andrew assistants were reportedly sunset in 2021 after an acquisition. The source is a competitor blog with no primary confirmation. — [Carly blog](https://www.usecarly.com/blog/calendly-vs-xai/)
- **Howie:**
  - Uses multiple fine-tuned models and escalates uncertain cases to human reviewers. — [GeekWire](https://www.geekwire.com/2025/ai-scheduling-assistant-howie-raises-6m-launches-publicly-with-1000-paying-customers/)
  - Former executive assistants handle "ambiguous or high-stakes edge cases."
  - Sacra infers that the hybrid model "implies lower gross margins than a pure scheduling SaaS product."
  - No fallback rate is disclosed.

  — [Sacra: Howie](https://sacra.com/c/howie/)

### Inferences
- An illustrative break-even, using my assumptions: at $25/month, a gross margin target of 70%, and inference of about $2, roughly $5.50 per user per month is left for human labor. At about $0.50–1.00 per human-reviewed task (a few minutes of assistant time), that funds only about 5–10 escalations per user per month. So human backup is viable only with confidence-gated escalation of a small share (well under 10%) of a low-volume task such as scheduling, or at a $95+ tier.
- Benchmark data (EmailBench calendar tasks at ≤25%) suggests fully autonomous scheduling is not reliable today. That makes calendar or scheduling the most natural place for a paid human-review premium tier. Classification, labeling and drafting can run fully automated.
- A practical design for Mise:
  - Make "user approves" the default human-in-the-loop, which costs nothing.
  - Reserve paid human review for a premium scheduling or executive-assistant tier.

### Gaps
- No disclosed Howie human-escalation rate or gross margin was found.
- No x.ai unit economics, price-to-cost data or definitive shutdown cause was found.
- No primary data was found on the per-task labor cost of human email or scheduling review.

# Open-source AI inbox / email agent repos: traction and commercial outcomes (as of Oct 11, 2026)

Method note: the GitHub API was blocked in this environment, so all star, fork and commit figures come from github.com page fetches on 2026-10-11 (rounded figures as GitHub shows them). Star-history curves could not be retrieved, so star *growth* is inferred from commit activity and archive status, not measured.

## Which repos exist, and what are their stars, activity, contributors and licenses?

### Takeaway
Two open-source email apps clearly lead: elie222/inbox-zero (about 12.4k stars, commits every day through Oct 11, 2026) and Mail-0/Zero / 0.email (about 10.8k stars, but no commits after Aug 31, 2025). Further down, the LangChain reference agent was archived in Jul 2026 and the best-known standalone Gmail MCP server was archived in Mar 2026. The most-starred Gmail MCP that is still maintained is now a general Google Workspace MCP, taylorwilsdon/google_workspace_mcp (about 3.3k stars). Below these, the "email agent" space is a long tail of repos with fewer than 200 stars.

### Cited Findings
**elie222/inbox-zero**
- 12.4k stars, 1.6k forks, 47 watchers, 11,503 commits. A hosted version runs at getinboxzero.com, and the project can be self-hosted via `npx @inbox-zero/cli setup` — [GitHub repo](https://github.com/elie222/inbox-zero)
- Very active. The latest commits on main are dated Oct 9–11, 2026 (PR numbers around #4113–#4125), many co-authored by "elie222 and claude". Recent work includes REST APIs for split-inbox tabs, team comments, Outlook draft fixes and desktop releases — [GitHub commits](https://github.com/elie222/inbox-zero/commits/main)
- License: AGPL-3.0 with added terms. Selling access or offering it as a paid service needs written permission from Inbox Zero Inc. Organizations with 5 or more business users need an enterprise license. Personal, educational, research and small-org (under 5 users) use is exempt. This makes it "source-available-ish" rather than pure OSI open source for commercial reuse — [LICENSE](https://github.com/elie222/inbox-zero/blob/main/LICENSE)
- The contributor count was not visible in the fetched page — [GitHub repo](https://github.com/elie222/inbox-zero)

**Mail-0/Zero (0.email)**
- 10.8k stars, 1.3k forks, 42 watchers, 3,785 commits on the `staging` branch, MIT license, not archived — [GitHub repo](https://github.com/Mail-0/Zero)
- The most recent commits on staging are dated Aug 25–31, 2025 and are mostly small UI fixes from community contributors (e.g. "Redesign mail header layout", "add cursor pointer to all button elements"). The listing shows nothing after Aug 31, 2025 — [GitHub commits](https://github.com/Mail-0/Zero/commits/staging)
- A search snippet describes the org's repository as "last updated August 18, 2025" — [Mail-0 GitHub org via search](https://github.com/Mail-0)

**langchain-ai/executive-ai-assistant (EAIA)**
- 2.2k stars, 724 forks, 41 commits, MIT. **Archived by the owner on Jul 27, 2026** (read-only) — [GitHub repo](https://github.com/langchain-ai/executive-ai-assistant)

**Gmail MCP servers**
- GongRzhe/Gmail-MCP-Server: 1.2k stars, 416 forks, 55 commits, MIT. **Archived on Mar 3, 2026** — [GitHub repo](https://github.com/GongRzhe/Gmail-MCP-Server)
- taylorwilsdon/google_workspace_mcp: 3.3k stars, about 1.0k forks, 3,229 commits, MIT ("no CLA and no dual licensing"). It includes 15 Gmail tools (search, send, draft, labels, filters, attachments) — [GitHub repo](https://github.com/taylorwilsdon/google_workspace_mcp)
- Other Gmail MCPs are small. ArtyMcLabin/Gmail-MCP-Server has about 133 stars — [gittrend](https://gittrend.io/repo/ArtyMcLabin/Gmail-MCP-Server). A Jul 2026 Skillselion ranking of Gmail MCP servers put ClawLink (122 stars) and pulsemcp/mcp-servers (74 stars) at the top — [Skillselion](https://skillselion.com/best/gmail-mcp-servers). (These are aggregator snapshots and may be stale.)

**Long tail of self-hosted triage agents** (all small, star counts not captured)
- aziruhq/aziru: a self-hostable Gmail triage tool with a read-only Gmail scope. Drafts require approval and it never auto-sends — [GitHub](https://github.com/aziruhq/aziru)
- dmarchevsky/gmail-triage: local llama.cpp classification, dry-run by default, Telegram digests — [GitHub](https://github.com/dmarchevsky/gmail-triage)
- fazlerocks/jevmail: read-only local triage into five trays — [GitHub](https://github.com/fazlerocks/jevmail)
- Munawarx/gmail-agent: a Python IMAP/OAuth triage agent — [GitHub](https://github.com/Munawarx/gmail-agent)
- In the GitHub "email-agent" topic sorted by stars, the top repo is tokencanopy/e2a at 193 stars, an email API for AI agents (infrastructure, not an inbox assistant). Everything else has 5 stars or fewer — [GitHub topic](https://github.com/topics/email-agent?o=desc&s=stars)

### Inferences
- Open-source inbox agents have **winner-take-most** attention. Only Inbox Zero and Zero passed 10k stars. The next tier (2–3k) is a framework demo (EAIA) and a general Workspace MCP, not inbox products.
- Inbox Zero's star count is broadly similar to Zero's. Its commit volume (more than 11k commits and daily merges in Oct 2026) shows it is the only large open-source inbox agent under active development.
- The archiving of the LangChain reference agent and the top single-purpose Gmail MCP points to consolidation. Generic Gmail tools are being absorbed into broad Workspace MCPs and first-party connectors.

### Gaps
- Exact star growth over 2025–2026 (star-history.com was not fetched). Contributor counts for each repo were not visible.
- Whether Zero has a newer default branch with 2026 commits. Only `staging` was checked, and it is the branch the repo page showed.
- No reliable star counts for the newer long-tail repos (aziru etc.).

## Which have hosted paid versions, and is there public revenue, user-count or funding data?

### Takeaway
Inbox Zero is the only clear open-source-to-revenue case. It is bootstrapped (later TinySeed per an aggregator), sells a hosted plan around $20/user/month, and reported more than $10k MRR around late 2024. No verified 2026 revenue was found. Zero (0.email) raised about $2M through YC X25 but shows no public revenue. EAIA and the Gmail MCPs have no business attached, apart from a small "$5/mo managed instance" offer on google_workspace_mcp.

### Cited Findings
- **Inbox Zero, hosted:** "We offer a hosted version of Inbox Zero at getinboxzero.com" — [GitHub README](https://github.com/elie222/inbox-zero). Hosted plan "priced from US$20 per user" per an aggregator — [everydev.ai](https://www.everydev.ai/developers/inbox-zero-inc). A third-party roundup says the hosted version costs $20/month — [search summary of getinboxzero blog / aggregators](https://www.getinboxzero.com/blog/post/best-ai-email-assistants). The live pricing page did not render prices when fetched — [pricing](https://www.getinboxzero.com/pricing)
- **Inbox Zero, revenue:** An Indie Hackers feature reports "Revenue: >$10K a month" — [Indie Hackers](https://www.indiehackers.com/post/tech/carving-out-a-small-niche-in-a-big-market-and-bringing-in-10k-mrr-5Ohy2XHaeq3EeN4rtWHy). An aggregator headline dates "Inbox Zero reaches $10,000 MRR milestone" to Nov 2024 and gives an *estimated* $330k ARR (2025/26). It may refer to "Inbox Zero Tabs", so it is unverified — [everydev.ai](https://www.everydev.ai/developers/inbox-zero-inc)
- **Inbox Zero, funding:** The Product Hunt v2 launch post (Oct 1, 2024) said "Self-funded. No YC or VC backing. But it's open source, so expect a YC company to clone it soon" — [Elie Steinbock on X](https://x.com/elie2222/status/1841010490819932315). An aggregator says Inbox Zero Inc. (Tel Aviv) took a seed from TinySeed, claims SOC 2, and has "20,000 professional users" in a 2026 listing. All of this is unverified — [everydev.ai](https://www.everydev.ai/developers/inbox-zero-inc); [Crunchbase](https://www.crunchbase.com/organization/inbox-zero)
- **Inbox Zero, users (conflicting, self-reported):** "over 8,000 users" (LinkedIn) vs "15k+ sign ups" (personal site) — [LinkedIn](https://www.linkedin.com/in/elie222/); [elie.tech](https://elie.tech/). It won Best AI Software at the 2025 FOSS awards (per search summary of his profiles) — [20i interview](https://www.20i.com/blog/interview-with-elie-steinbock-founder-of-inbox-zero/)
- **Inbox Zero, monetization levers:** The license requires a commercial or enterprise license for orgs with 5 or more users and bans reselling as a service without permission — [LICENSE](https://github.com/elie222/inbox-zero/blob/main/LICENSE). Self-hosters can bring their own OpenAI key or run Ollama locally — [getinboxzero blog](https://www.getinboxzero.com/blog/post/best-open-source-email-automation-tools-for-gmail)
- **Zero / 0.email, funding:** YC X25. Raised $2M from 1984 Ventures, Pioneer Fund and YC. Founders listed as Nizar Abi Zaher (CEO) and Adam Wazzan (CTO). The YC listing shows a team of 2 and status Active — [Clay dossier](https://www.clay.com/dossier/zero-funding); [YC jobs page](https://www.ycombinator.com/companies/zero/jobs). Another profile says "Total funding Undisclosed" (conflict) — [vcbacked](https://www.vcbacked.co/company/zero)
- **Zero, users:** The about page claims "over 15,000 signups in just under 3 months of its early access program" (undated, likely 2025) — [0.email/about](https://0.email/about). The README mentions no paid tier. It references Autumn (a billing service) as a setup dependency, which suggests billing was wired in — [GitHub repo](https://github.com/Mail-0/Zero). The 0.email homepage returned only "Zero" when fetched on Oct 11, 2026, so its live status could not be confirmed — [0.email](https://0.email/)
- **No 2026 funding, shutdown or pivot news for Zero was found** in an extended search — [search results incl. aiemaily](https://aiemaily.com/blog/zero-mail0-alternatives-open-source)
- **google_workspace_mcp:** a managed cloud instance "starting at $5/mo… can be arranged". The self-hosted version is free under MIT — [GitHub repo](https://github.com/taylorwilsdon/google_workspace_mcp)
- **Context:** Notion shut down its Notion Mail client, reportedly because "AI agents already do the job" — [The Next Web](https://thenextweb.com/news/notion-mail-shuts-down-ai-agents-email-productivity)

### Inferences
- The only confirmed open-source email-agent business is a **solo or small bootstrapped company at roughly $10k+ MRR in 2024**. That is a modest ceiling, even for the category leader with more than 12k stars. If the $330k ARR estimate is right, it is a profitable small business, not a venture outcome.
- Inbox Zero's move from plain AGPL to AGPL plus commercial restrictions (5+ users need an enterprise license) shows that open source alone did not protect revenue. Its founder publicly expected YC clones, and Zero (YC X25) followed.
- The VC-backed open-source client (Zero) shows star traction (10.8k) without visible revenue and with stalled commits. GitHub stars do not predict revenue in this category.

### Gaps
- No verified 2025–2026 MRR, ARR or paying-customer count for Inbox Zero. The Indie Hackers page and pricing page could not be fully fetched (403 / empty render).
- No public revenue or paid-user data for Zero, and no confirmation of whether the 0.email hosted product is still operating.
- Exact current Inbox Zero tier names and prices could not be confirmed from the primary page.

## What features do the most-starred ones focus on?

### Takeaway
The leaders are built around "AI rules in plain English", drafts in the user's voice, reply tracking, bulk unsubscribe and archive, cold-email blocking and analytics. Inbox Zero is now adding meeting briefs, chat-surface control (Slack/Telegram), MCP, Outlook and a desktop app. Zero is a full client replacement (a Superhuman/Gmail alternative) rather than an agent layer. Scheduling and approval-first triage appear mainly in demos and small repos.

### Cited Findings
- **Inbox Zero features:** AI assistant that organizes and pre-drafts replies in your tone. Plain-English AI rules. "Reply Zero" tracking of emails needing a reply or awaiting one. Bulk Unsubscriber. Bulk Archiver. Cold Email Blocker. Email Analytics. Meeting Briefs (pre-meeting briefings from email and calendar). Smart Filing of attachments to Drive/OneDrive. Slack and Telegram integration. The repo has a `plugins/inbox-zero-mcp` folder — [GitHub README](https://github.com/elie222/inbox-zero). The marketing site stresses labels/rules, style-matched drafts, cold-email blocking, bulk unsubscribe, analytics, Slack/Telegram, and Gmail plus Outlook — [getinboxzero.com](https://www.getinboxzero.com/)
- **Inbox Zero recent direction (Oct 2026 commits):** split-inbox tabs REST API, team comments (multi-user), compose signatures, Outlook drafts, desktop releases. This suggests it is moving toward a full client and team features — [commits](https://github.com/elie222/inbox-zero/commits/main)
- **Zero features:** open-source, AI agents/LLMs, privacy-first ("does not track, collect, or sell user data"), self-hosting, unified inbox for Gmail and Outlook, customizable UI. Last commits include scheduled send and SPF/DKIM/DMARC sender verification — [GitHub repo](https://github.com/Mail-0/Zero); [commits](https://github.com/Mail-0/Zero/commits/staging)
- **EAIA features:** triage (ignore / notify / draft), drafting, tone rewrite, calendar lookup to propose meeting times, memory via reflection graphs, cron ingestion on LangGraph Platform, and human review in "Agent Inbox" — [GitHub repo](https://github.com/langchain-ai/executive-ai-assistant)
- **Gmail MCP features:** send/draft, search, labels, filters, batch modify, attachments — [GongRzhe](https://github.com/GongRzhe/Gmail-MCP-Server); [google_workspace_mcp](https://github.com/taylorwilsdon/google_workspace_mcp)
- **Small triage repos** emphasize safety: read-only scopes, approval-required drafts, never auto-send, dry-run defaults, and digests to Telegram — [aziru](https://github.com/aziruhq/aziru); [gmail-triage](https://github.com/dmarchevsky/gmail-triage)

### Inferences
- The features that monetized (for Inbox Zero) are concrete and quickly felt: bulk unsubscribe and archive, cold-email blocking, and reply tracking. "AI drafting" and rules are table stakes.
- Meeting scheduling with calendar holds, commitment tracking and approval tiers are thinly covered in open source. EAIA had meeting-time proposals and human-in-the-loop review but is archived. Inbox Zero has meeting *briefs*, not scheduling with holds. Of Mise's features, scheduling with holds and commitment tracking look least crowded in open source; morning briefs, labels and drafts are crowded.

### Gaps
- No usage data on which Inbox Zero features drive paid conversion.
- No data on whether Inbox Zero's MCP plugin has meaningful adoption.

## Are there signs of stalling or abandonment?

### Takeaway
Yes, for most of the field. Zero's public repo has had no commits since Aug 31, 2025 despite YC funding. LangChain's EAIA was archived Jul 27, 2026. The top Gmail MCP (GongRzhe) was archived Mar 3, 2026. Inbox Zero is the exception, shipping daily.

### Cited Findings
- Zero: latest staging commits Aug 25–31, 2025, mostly community UI fixes. The repo is not formally archived — [commits](https://github.com/Mail-0/Zero/commits/staging). A third-party guide (Aug 2026) still describes it as labelled "active development / work in progress" — [aiemaily](https://aiemaily.com/blog/zero-mail0-alternatives-open-source). The 0.email homepage rendered nearly empty on Oct 11, 2026 — [0.email](https://0.email/)
- EAIA archived Jul 27, 2026 — [GitHub](https://github.com/langchain-ai/executive-ai-assistant)
- GongRzhe/Gmail-MCP-Server archived Mar 3, 2026, with 38 open issues and 32 open PRs at archive — [GitHub](https://github.com/GongRzhe/Gmail-MCP-Server)
- Inbox Zero: commits on Oct 9, 10 and 11, 2026 — [commits](https://github.com/elie222/inbox-zero/commits/main)
- google_workspace_mcp: 3,229 commits and an active managed-hosting offer. The latest release date was not visible — [GitHub](https://github.com/taylorwilsdon/google_workspace_mcp)

### Inferences
- Thirteen-plus months without public commits, while the founders were funded, suggests Zero either moved development to a private repo or deprioritized or wound down the open-source client. This is unconfirmed, since no announcement was found.
- Framework-vendor demos (LangChain) and hobby MCP servers get archived once the vendor's focus moves on or first-party connectors appear. They are not durable competitors.
- The durable pattern is a single founder-led company that ties the open-source repo to a hosted, paid SaaS with a restrictive license (Inbox Zero).

### Gaps
- No official statement from Zero/0.email on its status in 2026.
- Star-history curves were not retrieved, so "stalled" is judged from commit and archive data, not from star velocity.

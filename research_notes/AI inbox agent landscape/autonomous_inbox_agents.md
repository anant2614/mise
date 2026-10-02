# Autonomous AI Inbox / Executive-Assistant Agents (state as of Oct 2026)

Research date: 2026-10-02. Sixteen searches/fetches. Source-quality caveat: many 2026 "comparison" pages (usecarly.com, serif.ai/guides, getinboxzero.com/blog, catchagent.ai, marblism.com) are written by competing vendors as SEO content. I used them only for feature descriptions, not for traction claims. Latka, Tracxn and Pitchbook ARR figures are estimates.

## Which products act autonomously (send, schedule) and which only draft?

### Takeaway
The market splits in three. (1) Draft-only "in-Gmail" assistants such as Fyxer, Cora, Ellie and Inbox Zero (by default) put drafts and labels in the user's own inbox and never send without a click. (2) Agents that send, which are usually CC'd or messaged rather than living in the inbox: Serif (auto-answers routine mail), Howie (CC'd scheduling), Martin, Wajo/Fo (calls, emails and pays from its own address), Lindy and Catch. (3) Horizontal assistants (ChatGPT, Claude, Gemini) that can now send from Gmail, but only one message at a time after an explicit confirmation. The "approval queue plus audit log" pattern (Alyna) is becoming standard among agents that send.

### Cited Findings
**Draft-only / human sends**
- Fyxer: "Fyxer can't send emails on your behalf. We only draft your emails. We never send them." It organizes the inbox with labels, drafts replies, takes meeting notes, and keeps follow-up lists. Works in Gmail and Outlook. — [Fyxer pricing](https://www.fyxer.com/pricing)
- Cora (Every): screens the inbox, archives non-urgent mail, writes drafts in the user's voice, sends a brief twice a day, and accepts commands by chat or by email. Gmail only. Launched June 26, 2025. — [Every.to launch post](https://every.to/on-every/cora-is-out-of-beta-give-ai-your-inbox-take-back-your-life). A 2026 review says drafts are "for review before sending" and that Cora left private beta in Feb 2026 after a waitlist of about 10,000. This conflicts with the June 2025 "out of beta" post, which mentions 2,500 beta users. — [tooldirectory.ai](https://tooldirectory.ai/tools/cora)
- Ellie: a Chrome/Firefox extension that writes Gmail replies in the user's style. Free tier; paid plans allow up to 100 replies per day. It is a writing aid, not an agent. — [Product Hunt](https://www.producthunt.com/products/ellie-your-ai-email-assistant); [Chrome Web Store](https://chromewebstore.google.com/detail/ellie-your-professional-a/mhcnlcilgicfodlpjcacgglchmpoojcp?hl=en-US)
- Inbox Zero (open source): triages, drafts replies in the user's voice, bulk-unsubscribes, blocks cold email and tracks replies. Gmail and Outlook. Users write rules that can auto-label, archive or draft. — [getinboxzero.com](https://www.getinboxzero.com/); [AI email assistant page](https://www.getinboxzero.com/ai-email-assistant)
- Alyna: "triages, drafts, and queues — you approve. Nothing sends without approval," with an audit trail. Channels: Slack/Teams, email, calendar, WhatsApp, voice. — [tryalyna.com](https://tryalyna.com/)
- Claude: the Google Workspace connector can read, search, label, draft, send, reply and forward in Gmail, and asks for approval before send actions. It has read/write calendar access (create, move, RSVP). Cowork's wider enterprise release in Feb 2026 added Gmail and Drive connectors. — [usecarly (competitor content)](https://www.usecarly.com/blog/claude-cowork-connectors/); [Wikipedia](https://en.wikipedia.org/wiki/Claude_(language_model))
- ChatGPT: since about June 5, 2026 the Gmail connector can send a drafted message from the user's address after the user confirms, one message per request. Agent Mode requires confirmation for every high-impact action. "ChatGPT Work" (July 9, 2026) is an extended agent mode with more than 1,400 connectors that can work across a Gmail inbox for hours. — [dragapp.com](https://www.dragapp.com/blog/connect-gmail-to-chatgpt/); [usecarly](https://www.usecarly.com/blog/chatgpt-gmail-integration/). Not verified against an OpenAI primary source. I found no source that describes Pulse specifically using Gmail.
- Gemini: "Agent Mode" for Gemini 3.1 can automate Gmail, plan travel and manage tasks inside Workspace, and it sends natively on paid Workspace plans. — [Tom's Guide](https://www.tomsguide.com/ai/google-just-unlocked-agent-mode-for-gemini-3-1-here-are-7-things-it-can-now-do-for-you); [claudable.work](https://claudable.work/blog/can-gemini-send-emails)

**Acts autonomously (sends, schedules, calls, pays)**
- Serif: "runs your inbox like an employee." It answers customers, collects documents, sends quotes and chases unpaid invoices in Gmail and Outlook. It answers routine messages on its own, in the user's voice, and escalates only the threads that need judgment. — [serif.ai agent page](https://www.serif.ai/ai-email-agent); [serif.ai Gmail page](https://www.serif.ai/ai-email-assistant-for-gmail)
- Howie: the user CCs Howie on a thread. It coordinates times, adds events to calendars, follows up and flags conflicts. — [GeekWire](https://www.geekwire.com/2025/ai-scheduling-assistant-howie-raises-6m-launches-publicly-with-1000-paying-customers/)
- Martin (YC S23): users text, call, email, WhatsApp or Slack it. It manages inbox, calendar, to-dos, phone calls and reminders, drafts emails and schedules. — [tooldirectory.ai](https://tooldirectory.ai/tools/martin); [MOGE](https://moge.ai/product/martin); [YC](https://www.ycombinator.com/companies/martin/jobs)
- Wajo "Fo" (Foible), launched Sept 29, 2026: calls, emails and coordinates with people to finish to-dos. It sends email from its own address (fo@foibleai.com), pays with a single-use card per purchase, and hands off to trained human EAs when needed. In Wajo's own tests, Fo finished 71% of setback-heavy tasks without help and stayed within user-approved limits on 94% of runs. — [Startup Fortune](https://startupfortune.com/wajos-fo-agent-can-call-email-and-pay-on-its-own-beating-rivals-at-getting-things-done/); [progressiverobot](https://www.progressiverobot.com/2026/09/29/wajo-launches-fo-ai-agent-calls-payments/); [foibleai.com](https://foibleai.com/)
- Lindy: self-serve AI agents across email, Slack, calendar and CRM. The founder-focused assistant "works out of Slack" and handles email, scheduling, meeting notes and CRM updates. — [Tracxn](https://tracxn.com/d/companies/lindy/__FJe0QVe6UcRHtdiPJpmyRG3livSd4eIGsIxMxz-kNPI); [press release syndication](https://lifestyle.middletownlifemagazine.com/story/672382/lindy-provides-an-ai-assistant-for-founders-that-handles-email-scheduling-and-crm-work-from-slack/)
- alfred_: "takes action autonomously." It triages, drafts replies the user sends with one tap, extracts tasks and manages the calendar. — [get-alfred.ai](https://get-alfred.ai/alfred-ai)
- Jace (Zeta Labs): positioned in 2024 as an action-oriented web agent that books trips, pays invoices and sets up job posts. It later repositioned toward email (jace.ai blog). — [SiliconANGLE, Jun 2024](https://siliconangle.com/2024/06/13/zeta-labs-unveils-jace-action-oriented-generative-ai-assistant-quite-unlike/); [jace.ai blog](https://jace.ai/blog)
- Catch (Sept 3, 2026): an AI EA that "autonomously manages" scheduling, travel and correspondence for C-suite executives. — [pomegra.io (aggregator)](https://pomegra.io/startups/catch-raises-5m-seed-for-ai-executive-assistant-2026-09-05)
- Sol: "proactive AI" that scans Gmail for commitments the user has made, gathers context, and does the task (research, documents, decks, meeting coordination) before final approval. — [Dealroom](https://dealroom.co/news/155499-ex-cred-executives-ai-startup-sol-raises-4m-to-build-proactive-email-ass/)
- Scape (Sweden): drafts replies before the thread is opened and attaches documents it has created or edited. — [Seedtable](https://seedtable.com/companies/scape-2/funding-rounds/seed-2026-07)
- Mindy: an email-first "chief of staff" at m@mindy.com that researches, summarizes, drafts and helps with the calendar. In June 2026 the team joined WorkWhile and the consumer product is winding down. — [usecarly (competitor content)](https://www.usecarly.com/blog/mindy-alternatives/); [futurepedia](https://www.futurepedia.io/tool/mindy)

### Inferences
- The core inbox products with real traction (Fyxer, Cora) are all draft-only. The send-autonomy products are either narrow in scope (Howie: scheduling; Serif: routine SMB customer mail) or are delegation agents with their own identity (Fo, Mindy, Howie, Martin). Users seem to accept autonomy when the agent acts as itself, CC'd from its own address, but not when it sends as them.
- Mise's approval tiers sit between these camps. Graduating per action type (draft, then send with approval, then auto-send for low-risk classes) is a defensible differentiator. Alyna and the platform assistants only do approve-each-action, and Fyxer and Cora never send.
- The Mindy wind-down and the platform assistants (ChatGPT, Claude, Gemini) gaining Gmail send are pressure signals for thin "email a bot" products.

### Gaps
- Exact autonomy defaults for Lindy, Martin and alfred_ (whether auto-send is on by default) were not confirmed from primary docs.
- No primary OpenAI source confirms Pulse using Gmail or the "ChatGPT Work" naming. Treat it as unverified.
- "Fixer AI" appears to be a misspelling of Fyxer; I found no separate product. No results for "Wajo / Foible" beyond Fo.
- Hey (37signals), SaneBox AI and Superhuman/Shortwave agents were not researched because of the tool budget.

## What is each product's wedge (target user + the one job it does best)?

### Takeaway
Wedges cluster around one job each. Fyxer: "label plus draft in your inbox, plus meeting notes" for SMB professionals and teams, especially in real estate. Cora: daily-brief inbox screening for individual knowledge workers. Inbox Zero: open-source, rule-driven triage for privacy- and dev-minded users. Serif: autonomous customer-facing replies for owner-operators. Howie: CC'd scheduling for heavy meeting-bookers. Martin, Alyna, alfred_ and Fo: multi-channel "real EA" for founders and executives. Lindy: configurable agents for teams in Slack. Sol and Scape: proactive task completion from commitments.

### Cited Findings
| Product | Lives where | Target | Wedge / one job | Learning | Beyond email | Pricing |
|---|---|---|---|---|---|---|
| Fyxer | Gmail/Outlook labels + drafts; meeting bot | Professionals, SMB teams; enterprise logos include Knight Frank, eXp Realty, AT&T, Starbucks ([tldv review, Jul 2026](https://tldv.io/blog/fyxer-ai-review/)) | Inbox sorted + drafts + meeting notes/follow-ups | Learns tone from past emails ([Fyxer](https://www.fyxer.com/ai-email-assistant)) | Meetings, shared spaces, team follow-up owners | Free (400 credits); Pro $37/user/mo annual ($49 monthly); Team $64 annual ($99 monthly); Enterprise min 50 seats ([pricing](https://www.fyxer.com/pricing)) |
| Cora | Gmail + twice-daily brief email + chat | Individual knowledge workers / Every readers | Screen everything, brief the rest | Reads email patterns to learn work, style, priorities ([Every](https://every.to/on-every/cora-is-out-of-beta-give-ai-your-inbox-take-back-your-life)) | Gmail only | $15/mo at launch (2025) ([Every](https://every.to/on-every/cora-is-out-of-beta-give-ai-your-inbox-take-back-your-life)); 2026: Professional $20/mo annual or $25 monthly (2 accounts), Unlimited $39 annual or $49 monthly ([tooldirectory](https://tooldirectory.ai/tools/cora)) |
| Inbox Zero | Gmail/Outlook (labels, drafts) + web app; MCP server | Devs, privacy-conscious users, teams who want to self-host | Open-source, rule-based triage + bulk unsubscribe + reply tracking | Drafts in user's voice; user-written rules | Calendar | Starter $20/user/mo, Plus $35; self-host free; 12k+ GitHub stars; SOC 2 ([efficient.app](https://efficient.app/apps/inbox-zero); [getinboxzero](https://www.getinboxzero.com/)) |
| Serif | Gmail/Outlook via official API | Founders, small teams, service SMBs ([fritz.ai](https://fritz.ai/serif-ai-review/)) | Autonomously answers routine customer mail, quotes, invoice chasing | Learns from sent mail, including per-recipient tone ([serif.ai](https://www.serif.ai/ai-email-assistant-for-gmail)) | Docs/quotes/invoices | Not found |
| Howie | CC'd email agent | Heavy meeting schedulers | Scheduling by CC | Not found | Calendar | Not found |
| Martin | SMS, WhatsApp, voice/phone, email, Slack, iOS app | Busy individuals | "JARVIS"-style multi-channel EA | Keeps inbox, calendar and history in working memory ([tooldirectory](https://tooldirectory.ai/tools/martin)) | Calls, reminders, web search | Not found |
| Alyna | Slack/Teams, email, WhatsApp, voice | Executives / work users | Approval-queue EA with audit trail; "nothing critical slips" | Not found | Calendar, Slack/Teams | Not found |
| alfred_ | App + email/calendar | Founders, consultants, executives | Triage + one-tap drafts + task extraction | Not found | Calendar, tasks | $24.99/mo ([get-alfred.ai](https://get-alfred.ai/alfred-ai)) |
| Lindy | Slack + email + agent builder | Founders and teams | Configurable agents; Slack-native EA | Not found | Slack, calendar, CRM, meeting notes, voice | Not found in this pass |
| Wajo Fo | Own email address; phone; payments | Consumers / busy individuals | Real-world errands end to end, with human-EA fallback | Not found | Calls, payments | Not found |
| Jace | Web agent → email | Professionals | Action-taking agent (2024 positioning) | Not found | Browser actions | Not found |
| Ellie | Browser extension in Gmail | Individuals | Reply-in-your-style writing aid | Learns writing style | None | Free tier; paid up to 100 replies/day |
| Mindy | Email (m@mindy.com) | Individuals, home + work | Forward-to-delegate research and drafting | Not found | Calendar, research | Winding down (Jun 2026) |
| Sol | Gmail-connected app | Professionals | Detects commitments in email and executes them | Not found | Docs, decks, meetings | Not found |
| Catch | Not found | C-suite | Autonomous C-suite admin (scheduling, travel, correspondence) | Not found | Travel | Not found |
| ChatGPT / Claude / Gemini | Chat apps with Gmail/Calendar connectors | Everyone already paying for the assistant | General agent that can also do email | Memory / project context | Thousands of connectors | Bundled in subscriptions |

### Inferences
- Fyxer and Cora both have the closest overlap with Mise: labels plus drafts in the thread, and a brief for Cora. Neither, from what I found, offers meeting-slot proposals with tentative calendar holds, commitment tracking from the user's own sent mail, or reply-by-command in the brief. Cora does accept commands via email or chat, so check that overlap.
- Sol ("commitments you make in Gmail") is the closest conceptual match to Mise's commitment tracker, and Alyna is the closest match to its approval-tier design.
- Scheduling is owned by CC'd agents (Howie, Martin). Mise's "propose slots plus place holds inside the reply draft" is a hybrid none of the inbox products clearly ships.
- The platform assistants are generalists with per-action confirmation. They lack persistent background triage, labels and a proactive brief (except possibly Pulse, unverified). An always-on, opinionated workflow is the defensible gap against them.

### Gaps
- Pricing for Serif, Howie, Martin, Alyna, Lindy, Fo, Jace and Sol was not retrieved.
- Learning mechanisms (fine-tuning, retrieval over sent mail, or feedback from edits) are mostly undisclosed.

## Reported traction and funding (with dates)

### Takeaway
Fyxer is the clear traction leader: from $1M to about $17M ARR in under 8 months during 2025, a $30M Series B in Sept 2025, and a stated $100M ARR target for 2026. No confirmed 2026 ARR figure was found. Most others are seed-stage. Lindy is the best-funded agent platform (about $50M, a16z). 2026 brought a wave of EA-agent seed rounds: Catch $5M, Sol $4M, Scape $3.2M and Wajo's launch.

### Cited Findings
- **Fyxer**: $30M Series B, Sept 2025, led by Madrona, with Lakestar and Marc Benioff participating. — [EU-Startups](https://www.eu-startups.com/2025/09/british-startup-fyxer-ai-bags-e25-5-million-to-free-professionals-from-repetitive-admin-work/); [Startups Magazine](https://startupsmagazine.co.uk/article-fyxer-ai-secures-30m-expand-ai-executive-assistant-platform). Total raised is reported as $40M ([Tracxn](https://tracxn.com/d/companies/fyxer/__4WJDNopySFY-UYw-Ky1DM5as9muOSwhgKv-TGSYqaYQ/funding-and-investors)) and as $43M ([tldv](https://tldv.io/blog/fyxer-ai-review/)), so the sources conflict. Madrona reports "$10M ARR in 6 months" ([Madrona](https://www.madrona.com/fyxer-ai-productivity-tools-for-email-and-meetings/)). Other sources report $1M to $17M ARR in under 8 months, more than 180k users in 7 months, more than 15M drafts, more than half a million meeting notes, 90% three-month retention, and a target of $50M ARR by end of 2025 and $100M by end of 2026 ([LionHerald](https://lionherald.com/uk-ai-startup-fyxer-ai-secures-30-million-series-b-as-it-eyes-50-million-arr-by-year%E2%80%90end/); [tldv, Jul 2026](https://tldv.io/blog/fyxer-ai-review/)). OpenAI published a customer story on Fyxer ([OpenAI](https://openai.com/index/fyxer/), fetch blocked). An April 2026 product update added shared meeting notes ([tldv](https://tldv.io/blog/fyxer-ai-review/)). Latka's ARR estimates ($2.9M / $6.4M) conflict with the reported figures and look unreliable ([Latka](https://getlatka.com/companies/fyxer.com)).
- **Cora (Every)**: 2,500 beta users at the June 2025 launch ([Every](https://every.to/on-every/cora-is-out-of-beta-give-ai-your-inbox-take-back-your-life)); a waitlist of about 10k ([tooldirectory](https://tooldirectory.ai/tools/cora)). Every says 80% of users say "Cora changed my life" and that it cut inference cost 10x. No separate funding; Cora is an Every product.
- **Inbox Zero**: 12k+ GitHub stars; SOC 2. — [efficient.app](https://efficient.app/apps/inbox-zero); [openalternative](https://openalternative.co/inboxzero). No funding found.
- **Lindy**: about $50M+ raised, a16z-led. One source puts the Series A in late 2024 at about a $200M valuation and about $7M ARR at the time; this is Sacra/estimate-level and should be verified. — [Sacra](https://sacra.com/c/lindy/); [extruct](https://www.extruct.ai/hub/lindy-ai-funding/)
- **Howie**: $6M seed led by True Ventures, with Jason Calacanis, Aravind Srinivas and Rahul Vohra participating; more than 1,000 paying customers at public launch (2025); reported $30M valuation. — [GeekWire, 2025](https://www.geekwire.com/2025/ai-scheduling-assistant-howie-raises-6m-launches-publicly-with-1000-paying-customers/); [WebProNews](https://www.webpronews.com/howie-ai-scheduler-raises-6m-from-sequoia-a16z-at-30m-valuation/)
- **Martin (YC S23)**: raised $2M (2024). Five months after launch it had 30k users and 500k tasks completed, growing 10% a week. — [VentureBeat](https://venturebeat.com/ai/these-yale-and-berkeley-dropouts-just-raised-2-million-to-build-an-ai-assistant-that-could-rival-openai); [knowtechie](https://knowtechie.com/martin-ai-personal-assistant/)
- **Jace / Zeta Labs**: $2.9M pre-seed (June 2024) led by Daniel Gross and Nat Friedman, with Earlybird and Kaya. — [SiliconANGLE](https://siliconangle.com/2024/06/13/zeta-labs-unveils-jace-action-oriented-generative-ai-assistant-quite-unlike/); [PYMNTS](https://www.pymnts.com/artificial-intelligence-2/2024/ai-agent-helpers-gain-traction-as-zeta-labs-raises-2-9-million/). No later round found.
- **Catch**: $5M seed, emerged Sept 3, 2026, co-led by Entrée Capital and Pitango. — [pomegra.io](https://pomegra.io/startups/catch-raises-5m-seed-for-ai-executive-assistant-2026-09-05)
- **Sol**: $4M early-stage round; founders are ex-Cred. — [Dealroom](https://dealroom.co/news/155499-ex-cred-executives-ai-startup-sol-raises-4m-to-build-proactive-email-ass/)
- **Scape**: $3.2M seed, July 2026, Sweden. — [Seedtable](https://seedtable.com/companies/scape-2/funding-rounds/seed-2026-07)
- **Wajo (Fo)**: launched Sept 29, 2026 by Shivani Poddar. Funding not found. — [Startup Fortune](https://startupfortune.com/wajos-fo-agent-can-call-email-and-pay-on-its-own-beating-rivals-at-getting-things-done/)
- **Adjacent**: AgentMail raised $6M (Mar 2026) for email infrastructure for AI agents ([TechCrunch](https://techcrunch.com/2026/03/10/agentmail-raises-6m-to-build-an-email-service-for-ai-agents/)). Pally raised $5.2M seed for an assistant that lives in texts ([Dealroom](https://dealroom.co/news/143591-pally-raises-5-2m-seed-for-an-ai-assistant-that-lives-in-your-texts/)).
- **Mindy**: team joined WorkWhile in June 2026; product winding down. — [usecarly](https://www.usecarly.com/blog/mindy-alternatives/) (single, competitor source)

### Inferences
- Fyxer's growth suggests the "draft in your own inbox, never send" design plus a paid-acquisition engine wins mass SMB adoption. Trust and low setup friction beat autonomy.
- Seed money in 2026 is flowing to proactive, action-completing EAs (Catch, Sol, Fo) rather than to pure triage and drafting, which is being commoditized by Fyxer, Cora and the platforms.

### Gaps
- No verified 2026 ARR for Fyxer, Lindy or Cora.
- Funding for Serif, Alyna, alfred_, Ellie, Wajo and Inbox Zero was not found.
- The Catch and Mindy facts each come from a single secondary source.

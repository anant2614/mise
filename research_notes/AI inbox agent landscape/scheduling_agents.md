# AI Scheduling Assistants and Calendar Agents (as of Oct 2026)

Research date: 2026-10-02. Older facts carry their dates. Some figures come from secondary or aggregator sources (Sacra, usecarly.com, which is a competitor's blog, plus startupwired and rywalker.com). Treat those as directional.

## How each product schedules (CC'd email assistant vs links vs auto-planning calendar), autonomy, preferences/holds/rescheduling

### Takeaway
The market has split into three types. (1) CC'd or invoked email/Slack agents that negotiate for you: Howie, Blockit, Calendly's Callie, Lindy, Skej, and earlier x.ai, Clara and Julie Desk. (2) Booking links: Calendly and Cal.com. (3) Auto-planning calendars that defend your time: Reclaim, Motion, Clockwise (now dead) and Vimcal. Since mid-2025 the CC'd-agent type has had a revival, and in Aug 2026 Calendly entered it directly.

### Cited Findings
**Howie (CC'd email agent with human QA)**
- Users CC Howie on email threads. It proposes times, interprets preferences, follows up when people go quiet and watches for calendar conflicts. — [Sacra](https://sacra.com/c/howie/)
- It is a hybrid model: "A key product choice is to trade speed for accuracy." Several models run, and when confidence is low a 24/7 team of former executive assistants verifies or completes the task. — [Sacra](https://sacra.com/c/howie/)
- Personalization is rules-based, stored as a "personal policy engine". Each scheduling thread shows Howie to the counterparty, so growth is product-led. — [Sacra](https://sacra.com/c/howie/)
- Target users are founders, VCs, recruiters, consultants and journalists. Founded 2023, based in Seattle, CEO Austin Petersmith. — [Sacra](https://sacra.com/c/howie/)

**Blockit (autonomous email/Slack agent with an agent-to-agent network)**
- Users CC Blockit on an email or message it in Slack, and it negotiates the time and location. When both sides use Blockit, the two agents settle the time directly with no email ping-pong. — [usecarly / aggregated TechCrunch coverage](https://www.usecarly.com/blog/blockit-alternatives/); [rywalker research](https://rywalker.com/research/blockit)
- It builds preference models (deep-work times, which meetings matter) and weighs time zones, deadlines, participant seniority, meeting goals and past behavior. It positions itself as "intent and negotiation" rather than slot matching. — [StartupWired, Jan 2026](https://startupwired.com/2026/01/23/blockit-raises-5m-to-redefine-ai-driven-calendar-scheduling/)
- Fully autonomous, with no human in the loop. Claims scheduling time drops from "1-3 days" to "1-3 minutes". The "time graph" network effect is its distinctive feature. Listed weaknesses: high price, resistance to full calendar OAuth, and dependence on counterparties adopting it. — [rywalker research](https://rywalker.com/research/blockit)
- Founder Kais Khimji, a Sequoia partner for 6 years, revived an idea he first explored at Harvard. — [rywalker / search summary](https://rywalker.com/research/blockit)

**Calendly Callie (incumbent's CC'd agent, launched Aug 2026)**
- Announced Aug 19, 2026 and released Aug 20, 2026 in beta, alongside Calendly Notetaker. Users add callie@calendly.com to any email thread. It follows the thread's context, checks availability and "adapts when a meeting doesn't follow the usual rules." — [destinationCRM](https://www.destinationcrm.com/Articles/CRM-News/CRM-Across-the-Wire/Calendly-Launches-Callie-an-AI-Assistant-and-Notetaker-176229.aspx); [Calendly help center](https://calendly.com/help/ai-scheduling-assistant-callie-overview)
- Replies within a minute and offers up to 3 days of availability with up to 5 slots per day. — [Calendly help center](https://calendly.com/help/ai-scheduling-assistant-callie-overview)
- Conflict: Sacra dates Callie to May 2026 and says it reaches 20M+ existing users. Calendly's own release is dated Aug 2026, so the May date may refer to an earlier preview. — [Sacra](https://sacra.com/c/howie/) vs [Calendly newsroom](https://calendly.com/newsroom/press-release/calendly-new-ai-product-suite)

**Lindy (general agent platform with a scheduling use case)**
- You loop Lindy into email threads or Slack. It finds times, contacts people, confirms meetings, follows the buffer rules you set, and handles follow-ups and rescheduling. Other Lindy agents can chain on to prepare agendas or take notes. — [Lindy blog](https://www.lindy.ai/blog/automated-meeting-scheduling); [aiagentrank Lindy review 2026](https://aiagentrank.io/blog/lindy-review-2026)

**Skej (CC'd assistant in Gmail and Outlook)**
- An AI scheduling assistant that "works right in Gmail or Outlook". Built by 3Gen Internet Corporation. Has a free tier and a Pro tier. — [Capterra](https://www.capterra.co.uk/software/1069897/Skej)

**Kronologic (sales "calendar monetization", hold-first)**
- It sends calendar invites on behalf of salespeople as the first and main touchpoint with buyers, putting the meeting on the calendar before any reply. It integrates with Microsoft, Google and Salesforce and calls itself "the world's first calendar monetization engine". Customers include VMware, CDW, PayScale and Dialpad. — [Demand Gen Report](https://demandgenreport.com/financial-news/kronologic-raises-20m-in-seed-financing/6947/); [VentureBeat](https://venturebeat.com/ai/sales-meeting-booking-platform-kronologic-nabs-20m)

**Vimcal (fast calendar app plus an EA product)**
- Vimcal is "an executive assistant, disguised as a calendar app". Its AI Free Time Finder suggests times, and Company Briefs profile participants. Its second product, Maestro, is "the first calendar designed specifically for executive assistants". — [VKTR, Nov 2023](https://www.vktr.com/the-wire/vimcal-secures-45-million-in-seed-funding-led-by-altos-ventures)

**Reclaim.ai (auto-planning calendar, owned by Dropbox)**
- A calendar app that uses AI to prioritize tasks and coordinate schedules. Dropbox acquired it in 2024 and the whole 22-person team joined Dropbox. — [GeekWire, Aug 2024](https://geekwire.com/2024/dropbox-acquires-reclaim-a-calendar-app-that-uses-ai-scheduling-to-boost-productivity/); [TechCrunch, Aug 22 2024](https://techcrunch.com/2024/08/22/dropbox-acquires-index-ventures-backed-ai-scheduling-tool-reclaim-ai)

**Motion (auto-planning calendar turned "AI employees" suite)**
- Started as an AI calendar and task manager, then pivoted from consumer calendaring to a B2B "agent-native work suite". Its AI agent bundle for SMBs launched in May 2025. — [Reworked / BusinessWire, Sep 2025](https://www.reworked.co/the-wire/motion-raises-60m-at-550m-valuation-to-build-the-agentic-work-suite-for-businesses/)

**Clockwise (team calendar optimizer, shut down)**
- Salesforce acquihired the team for Agentforce. The shutdown was announced Mar 19, 2026 and the product closed Mar 27, 2026, giving about one week's notice. User data was deleted with no export window and unused subscriptions were refunded pro rata. — [usecarly](https://www.usecarly.com/blog/is-clockwise-shutting-down/); [Yahoo Finance](https://finance.yahoo.com/sectors/technology/articles/salesforce-recuits-team-behind-calendar-103000806.html)
- Founded 2016 by Gary Lerhaupt, Matt Martin and Mike Grinolds, all ex-RelateIQ. Customers included Uber, Netflix and Atlassian. It reported 8M hours of Focus Time and 23M optimized meetings. — [aiforautomation.io](https://aiforautomation.io/news/2026-03-20-clockwise-ai-scheduling-salesforce-acquires-shuts-down)
- Dealroom's headline says Salesforce "kills $76M calendar AI product in one week" ($76M is presumably total funding). — [Dealroom](https://app.dealroom.co/news/feed/salesforce-acquires-clockwise-for-talent-kills-76m-calendar-ai-product-in-one-week)

**Historical: x.ai (Amy/Andrew Ingram)**
- Users wrote a normal email ("let's grab 30 minutes next week") and CC'd Amy. Amy emailed the other person, negotiated a time against the user's calendar and booked it. There were no links. — [usecarly](https://www.usecarly.com/blog/calendly-vs-xai/)
- x.ai built separate models for each intent (parsing, rescheduling, a first meeting) after 14+ months spent modeling the scheduling conversation. Mortensen admitted he was not sure the problem was "really solvable". — [MIT Technology Review, 2015](https://www.technologyreview.com/2015/06/26/167289/is-now-a-good-time-to-meet-your-new-virtual-assistant/amp/)
- Bizzabo acquired x.ai on Jun 3, 2021. The standalone scheduling service shut down on Oct 31, 2021. Terms were not disclosed. — [CB Insights](https://www.cbinsights.com/company/xai-bizzabo/); [Wayback x.ai notice](https://webcf.waybackmachine.org/web/20210929055623/https://x.ai)

**Historical: Clara Labs**
- An email-embedded assistant that scheduled meetings and follow-ups. It used human-in-the-loop, semi-supervised ML so that people did not have to check every thread. — [BlazingCDN blog](https://blog.blazingcdn.com/en-us/clara-labs-ai-powered-meeting-scheduler); [Fast Company](https://www.fastcompany.com/90133300/slack-invests-in-a-part-human-ai-for-business)
- It later refocused on recruiters ("The Recruiter's Digital Assistant"), was acquired by TopFunnel, and TopFunnel was acquired by Gem in Feb 2022. Acquisition date conflict: one source says Aug 2019, another Dec 2020. — [crm.org](https://crm.org/news/clara-by-clara-labs-the-recruiters-digital-assistant); [Global Venturing](https://globalventuring.com/topfunnel-sucks-in-clara-labs/)

**Historical: Julie Desk**
- A French "AI virtual assistant" for scheduling meetings and appointments. It raised €2.5M in 2017. — [TechCrunch, Jun 2017](https://techcrunch.com/2017/06/01/julie-desk-an-ai-virtual-assistant-that-helps-you-schedule-meetings-and-more-scores-e2-5m-funding)

### Inferences
- Kronologic's model of sending the invite first is the closest precedent to Mise's tentative holds. It showed that putting something on the calendar before negotiating can work in outbound sales.
- Mise's model is a drafted reply the user approves, with slots and holds. It sits between links, where the user does all the work, and the CC'd agents (Howie, Blockit, Callie), where the agent negotiates on its own under its own identity. No product I found leads with drafting in the user's own voice plus holds.

### Gaps
- I found no reliable source for Cal.com's AI features (for example Cal.ai, a phone and voice agent) or for Calendly's AI features other than Callie.
- Howie's handling of holds and rescheduling and Blockit's hold mechanics are not documented in detail.
- Reclaim's 2025-2026 roadmap under Dropbox and Vimcal's latest funding after 2023 were not found.
- Julie Desk's current status (pivot or shutdown) was not found.

## Why x.ai and Clara struggled

### Takeaway
Pre-LLM NLU could not handle open-ended scheduling email reliably, so both companies relied heavily on human reviewers. That made unit economics poor, created a trust and privacy problem, and was costly to build: x.ai raised about $44M for a feature that sounds simple. Meanwhile booking links (Calendly) won the low end cheaply. In the end both were absorbed into narrower vertical products: events for x.ai, recruiting for Clara.

### Cited Findings
- Bloomberg (Apr 2016) reported that "behind almost every email is an actual human". x.ai trainers reviewed parts of almost all incoming emails, and the company confirmed trainers verify "the vast majority" of information. One trainer earned $45k a year and sometimes worked 12-hour days highlighting phrases. — [Bloomberg](https://www.bloomberg.com/news/articles/2016-04-18/the-humans-hiding-behind-the-chatbots)
- On Hacker News, people described humans hidden behind "blind-AI" as "unsettling" and raised confidentiality concerns when third parties CC'd Amy on sensitive threads. A bot developer noted that users expect general conversation, and when the bot can't manage it "he's perceived as stupid — he can't even say hello properly, how can he possibly do scheduling?" — [HN thread](https://news.ycombinator.com/item?id=11530417)
- x.ai needed about $44M "for such a simple concept". — [Growth Everywhere podcast transcript title](https://www.singlegrain.com/wp-content/uploads/2018/01/Why-x.ai-Had-to-Raise-44M-in-Funding-for-Such-a-Simple-Concept-as-Amy-the-Personal-AI-Assistant-TRANSCRIPT.pdf). An earlier round was $9.2M at a $40M valuation. — [TechCrunch](https://techcrunch.com/?p=1100512)
- A reviewer reported it "took 3 years and millions to build". — [Pritzker Group repost](https://www.pritzkergroup.com/this-ai-personal-assistant-took-3-years-and-millions-to-build-it-completely-fooled-me/)
- Mortensen argued that earlier tools failed because they treated scheduling as a "shared activity". x.ai narrowed its scope to scheduling only. — [MIT Technology Review](https://www.technologyreview.com/2015/06/26/167289/is-now-a-good-time-to-meet-your-new-virtual-assistant/amp/)
- Clara's adoption was "flatter than expected". A consultant found its positioning was off: it was selling to executive assistants, but the value landed with executives and founders. — [search summary of Clara case](https://blog.blazingcdn.com/en-us/clara-labs-ai-powered-meeting-scheduler) (secondary; treat with caution)
- Exit outcome: x.ai went to Bizzabo (events) and its scheduler was sunset. Clara went to TopFunnel (recruiting) and then Gem. — [CB Insights](https://www.cbinsights.com/company/xai-bizzabo/); [Global Venturing](https://globalventuring.com/topfunnel-sucks-in-clara-labs/)

### Inferences
- Lessons: (1) If the system needs humans for accuracy, a product priced like SaaS can't support labor-like costs. (2) Being opaque about who reads email destroys trust, so disclose any human review. (3) A third-party bot persona adds awkwardness and slows things down; in Bloomberg's account, emails often waited for human verification. (4) A scheduling-only tool is easy to replace with free booking links. (5) Narrow verticals (events, recruiting) were where the tech found a home.
- LLMs remove most of the parsing problem that drove x.ai's human costs. That is why the category is back.

### Gaps
- I found no first-person postmortem from Dennis Mortensen or the Clara founders (Maran Nelson, Michael Akilian). x.ai's revenue or user counts at shutdown were not found.

## What current winners do differently (LLMs, human backup, embedded in calendar)

### Takeaway
Current winners use LLMs for parsing, but they differ on reliability. Howie openly sells human-verified accuracy as a premium. Blockit is fully autonomous and builds an agent-to-agent network effect. Calendly bundles a CC'd agent into an existing 20M-user base. Calendar optimizers turned out to be weak standalone businesses: Clockwise was acquihired and shut down, Reclaim was absorbed by Dropbox, and Motion pivoted to general "AI employees".

### Cited Findings
- Howie treats human QA as a premium feature, "not a temporary workaround", and makes speed the tradeoff. — [Sacra](https://sacra.com/c/howie/)
- Blockit's agents negotiate with each other ("time graph"), and it learns preferences. — [rywalker](https://rywalker.com/research/blockit)
- Callie lives inside Calendly's existing product and needs Standard Plus or Teams Plus. Sacra flags it as a "significant bundling risk" to Howie. — [Calendly help](https://calendly.com/help/ai-scheduling-assistant-callie-overview); [Sacra](https://sacra.com/c/howie/)
- Lindy chains scheduling with prep and notes agents. Callie ships alongside Notetaker. Vendors are bundling scheduling with the rest of the meeting lifecycle. — [Lindy](https://www.lindy.ai/blog/automated-meeting-scheduling); [Calendly newsroom](https://calendly.com/newsroom/press-release/calendly-new-ai-product-suite)
- Motion found traction only after broadening: its SMB AI-agent bundle reached 10,000+ B2B customers and $10M ARR within 4 months of its May 2025 launch. — [Reworked](https://www.reworked.co/the-wire/motion-raises-60m-at-550m-valuation-to-build-the-agentic-work-suite-for-businesses/)
- Clockwise's large base (about 40,000 orgs) did not save the standalone product. Salesforce "wanted the people for Agentforce, not the calendar app." — [usecarly](https://www.usecarly.com/blog/is-clockwise-shutting-down/)

### Inferences
- Scheduling alone is turning into a feature. Calendly, Dropbox (Reclaim) and Salesforce (the Clockwise team) are absorbing it. Independent players either charge premium prices to high-value users (Howie Pro, Blockit at $1k a year) or broaden scope (Motion, Lindy).
- Mise's differentiation could come from: drafting in the user's voice instead of a bot persona (avoiding the x.ai awkwardness and Callie's branded address); scheduling embedded in a general inbox agent rather than standalone; tentative holds that stop double-booking while a proposal is pending (Kronologic-style, but applied to inbound threads); and keeping the human (the user) as the approver, which gives the reliability of Howie's human QA without its labor cost.

### Gaps
- No independent accuracy or reliability benchmarks across Howie, Blockit, Callie and Lindy exist.
- User reviews of Callie since launch were not found (it is only about 6 weeks old).

## Pricing and reported traction

### Takeaway
Prices range from about $10 a month (Skej) through $18-35 a month (Callie, Howie Basic, Vimcal) to $95-145 a month (Howie Pro) and $1,000 a year (Blockit). Disclosed traction is modest for the new CC'd agents (Howie at 1,000+ paying customers at launch, Blockit at 200+ companies) compared with incumbents.

### Cited Findings
| Product | Pricing | Funding / traction | Source |
|---|---|---|---|
| Howie | Basic $35/mo ($25/mo annual); Pro $145/mo ($95/mo annual), with white-label, custom assistant name and custom-domain email | $1M pre-seed early 2024; $6M seed Sep 2025 led by True Ventures (angels incl. Rahul Vohra, Jason Calacanis); launched publicly with 1,000+ paying customers | [Sacra](https://sacra.com/c/howie/); [Techleap](https://finder.techleap.nl/news/feed/howie-raises-6m-launches-publicly) |
| Blockit | $1,000/yr individual; $5,000/yr team; 30-day trial (per TechCrunch, via rywalker) | $5M seed Jan 2026 led by Pat Grady (Sequoia), with Haystack, Adjacent, Original and Jeff Weiner; 200+ companies (Together AI, Brex, Rogo, a16z, Accel, Index) | [rywalker](https://rywalker.com/research/blockit); [Entrepreneur India](https://india.entrepreneur.com/news-and-trends/blockit-ai-raises-usd-5-mn-in-seed-funding-led-by-sequoias/502208) |
| Calendly Callie | Needs Standard Plus $18/seat/mo annual ($24 monthly) or Teams Plus $24 ($32 monthly) | Beta Aug 2026; Calendly base 20M+ users (per Sacra) | [usecarly Callie](https://www.usecarly.com/blog/calendly-callie/); [Sacra](https://sacra.com/c/howie/) |
| Lindy | From $49/mo | n/a | [Fast.io roundup](https://www.fast.io/resources/best-ai-scheduling-assistants-2026.md) |
| Skej | From $10, free tier | n/a | [Capterra](https://www.capterra.co.uk/software/1069897/Skej) |
| Vimcal | Standard $20/mo ($16.67 annual); EA $75/mo ($62.50 annual) | $4.5M seed led by Altos Ventures (Nov 2023) | [Vimcal EA pricing](https://www.vimcal.com/ea/pricing); [Pulse2](https://pulse2.com/vimcal-calendar-app-company-raises-4-5-million/) |
| Reclaim | n/a | Acquired by Dropbox (closed Jul 26 2024) for a reported $40.2M cash; 320k users across 43k companies, about 23k paying | [GeekWire](https://geekwire.com/2024/dropbox-acquires-reclaim-a-calendar-app-that-uses-ai-scheduling-to-boost-productivity/); [fintool DBX filing summary](https://fintool.com/app/research/companies/DBX) |
| Motion | n/a | $60M total across Series C/C2 at a $550M valuation (Sep 2025), led by Scale Venture Partners; 10k+ B2B customers and $10M ARR in the agent segment | [BusinessWire](https://www.businesswire.com/news/home/20250905188051/en/Motion-Raises-$60M-at-$550M-Valuation-to-Build-the-Agentic-Work-Suite-for-Businesses) |
| Kronologic | Enterprise (n/a) | $20M seed (2021) led by Signal Peak; about $27.2M total | [VentureBeat](https://venturebeat.com/ai/sales-meeting-booking-platform-kronologic-nabs-20m); [CB Insights](https://www.cbinsights.com/company/kronologic) |
| Clockwise | n/a | About $76M raised (Dealroom headline); about 40k orgs; acquihired by Salesforce and shut down Mar 27 2026 | [Dealroom](https://app.dealroom.co/news/feed/salesforce-acquires-clockwise-for-talent-kills-76m-calendar-ai-product-in-one-week); [usecarly](https://www.usecarly.com/blog/is-clockwise-shutting-down/) |
| x.ai (hist.) | n/a | About $44M raised; acquired by Bizzabo Jun 2021; sunset Oct 31 2021 | [Singlegrain transcript](https://www.singlegrain.com/wp-content/uploads/2018/01/Why-x.ai-Had-to-Raise-44M-in-Funding-for-Such-a-Simple-Concept-as-Amy-the-Personal-AI-Assistant-TRANSCRIPT.pdf); [CB Insights](https://www.cbinsights.com/company/xai-bizzabo/) |
| Julie Desk (hist.) | n/a | €2.5M (2017) | [TechCrunch](https://techcrunch.com/2017/06/01/julie-desk-an-ai-virtual-assistant-that-helps-you-schedule-meetings-and-more-scores-e2-5m-funding) |

- Sacra notes that SEC filings show about $4.7M sold in 2024 against Howie's announced $1M pre-seed, so the round sizes are unclear. — [Sacra](https://sacra.com/c/howie/)
- Motion's round breakdown is inconsistent across sources: a $38M Series C led by Scale, then a C2, with one source citing an "$8M Series C" in Sep 2025. — [multiples.vc / search summary](https://multiples.vc/private-comps/motion)

### Inferences
- Willingness to pay is highest among founders, VCs, recruiters and sales, the same beachhead Howie and Blockit target. A general Gmail agent like Mise would compete on price against Callie's bundle at $18-24 a seat, unless it bundles scheduling into wider inbox value.

### Gaps
- Current list prices for Reclaim, Motion and Kronologic were not verified.
- Howie and Blockit revenue are undisclosed.
- I found no other notable new entrants for 2025-2026 beyond Howie, Blockit and Callie. Smaller tools (Carly, Meet-Ting, Lifestack) appear on comparison sites but have no verified funding or traction.

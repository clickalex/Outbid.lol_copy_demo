# BlogRank — India Legal Compliance Review

**Idea:** Bloggers & YouTubers pay to rank their content on BlogRank. Visitors click, watch/read, return and answer a question about the content. Correct answer + verified real time spent = reward. Wrong answer = nothing.

**Scope:** India-focused regulatory review as of 27 Aug 2026. Structural analysis + reward-model variants (§11), product guardrails (§12), pre-launch checklist (§13), and the full **start-to-end launch roadmap — domain buy → go-live → day-1 ops (§14)**.
**Disclaimer:** This is research, not legal advice. Have an Indian gaming/consumer-tax lawyer sign off on the final rewards structure before launch.

---

## 0. Executive summary

| Question | Answer |
|---|---|
| Is "watch to earn" illegal gambling in India? | **No** — as long as visitors never pay or stake anything to participate. No stake ⇒ not betting/wagering, and not an "online money game" under the 2025 central gaming law. |
| Does the new online gaming law (in force 1 May 2026) ban this? | **No** — but it is the single biggest trap door. The *Promotion and Regulation of Online Gaming Act, 2025* bans any game where the **user pays fees/deposits/stakes with an expectation of winning**, skill or chance irrelevant, with **criminal penalties (up to 3 years / ₹1 crore)**. If BlogRank ever charges viewers (entry fee, paid retries, "earn boost" coins, premium earning passes), it becomes a banned online money game overnight. |
| Is "pay to rank" legal? | **Yes** — it is paid placement / native advertising. But rankings sold for money **must be clearly disclosed as sponsored**; hiding it is a misleading advertisement under the Consumer Protection Act, 2019 (CCPA fines ₹10 lakh–₹50 lakh). |
| Do we owe tax on viewer rewards? | Yes — treat rewards as prize winnings: **30% TDS (Sec. 194B)** once a user's winnings cross ₹10,000 in a financial year; 30% flat tax for the user (Sec. 115BB). GST on your creator-facing fees at **18%** (advertising/platform services). The 28%-on-stakes GST regime applies only to stake-based money gaming — not to you, because there are no stakes. |
| Biggest residual risks | (1) Viewer-side monetization creep → gaming ban; (2) undisclosed paid rankings → CCPA action; (3) prize-competition licensing laws in ~16 states; (4) Ponzi-law (PCMCSA) exposure if you ever take deposits or pay referral chains; (5) minors + DPDP Act; (6) gig-worker law recharacterization of micro-rewards. |
| No-reward or coupon versions? | **§11** — side-by-side comparison. No rewards ≈ an ordinary ad platform (most duties vanish). Coupons ≈ cash for gaming/prize/TDS law but simpler GST & rails — cap users under ₹10,000/FY and TDS vanishes too. |
| Launch steps (domain → go-live → ops)? | **§14** — 8-phase roadmap, ~9–10 weeks, with costs and the India-specific gotchas (DLT, PG KYC, penny-drop payouts, GST-from-invoice-#1). |

**Verdict: the model is lawful in India in its described form — viewers pay nothing, creators pay for placement — provided you hold five red lines (§12) and file the compliance items in §13.**

---

## 1. How Indian law sees the two sides of BlogRank

BlogRank is **not one product but two**, and the law treats them very differently:

1. **Creator side (pay to rank):** a B2B **advertising / paid-placement / content-discovery service**. Selling rank positions is legal commerce (like Google Ads, sponsored listings). Regulated mainly by consumer-protection and ad-disclosure law, GST, and contract law.
2. **Viewer side (watch/read → answer → earn):** a **free-to-enter skill quiz with rewards/prizes**, funded by the creator's ad spend. Because the viewer stakes nothing, it falls outside gambling law and outside the 2025 online-money-game ban. The risk areas instead are prize-competition licensing, tax withholding on winnings, money-circulation (Ponzi) law if the model ever mutates, data protection, and (arguably) gig-work law.

Everything below follows from keeping these two sides cleanly separated.

---

## 2. Gambling & the new central gaming law — the big one

### 2.1 The Promotion and Regulation of Online Gaming Act, 2025 (in force 1 May 2026)

- Presidential assent 22 Aug 2025; Act + the Promotion and Regulation of Online Gaming Rules, 2026 (notified 22 Apr 2026) came into force **1 May 2026**, administered by the **Online Gaming Authority of India** under MeitY.
- It splits online games into three categories:
  - **Online money games** — user pays fees/deposits/"other stakes" in expectation of monetary or other enrichment, *irrespective of skill or chance* → **banned entirely**: offering, aiding, advertising, and even bank/payment facilitation are prohibited; penalties up to **3 years' imprisonment and ₹1 crore**; cyber cells investigate.
  - **E-sports** — skill-only, registered under the National Sports Governance Act; not relevant here.
  - **Online social games** — no staking, entertainment/recreation/skill-development only; may charge subscription/access fees that are *not* wagers → **permitted**; registration only if the Central Government specifically notifies a category.
- "Other stakes" is defined broadly: credits, coins, tokens or any real/virtual thing purchased with money directly or indirectly in relation to a game.
- Classification factors (Rule 9) include whether the user pays fees/stakes at any stage, whether users expect to win money in return, and whether rewards can be monetised outside the platform.

**Application to BlogRank:** the viewer's quiz involves **no payment, no deposit, no stake by the user**. The reward is funded by the creator's advertising spend, and the viewer puts nothing at risk — a wrong answer costs the viewer nothing they paid. So the mechanic is **not an online money game**, and (if a regulator even treats it as a "game") it sits in the permitted social-game bucket, where no registration is currently required. Precedents (R.M.D. Chandra Bose Kumar v. Muthialu Chettiar; K.R. Lakshmanan v. State of Tamil Nadu; Dr. K.R. Chaudhari v. State of Maharashtra) also consistently treat free-entry, skill-based prize contests as outside "gaming".

**The trap doors — each of these flips you into the banned category:**

- ❌ charging viewers any entry/attempt fee to join the quiz;
- ❌ selling coins/tokens/credits that buy more earning attempts or higher reward rates;
- ❌ "premium earning membership" or deposit-to-unlock schemes;
- ❌ letting viewers "re-buy" after a wrong answer;
- ❌ wagering-style features (viewers stake their existing reward balance for a bigger one). Note: even letting users stake *previously earned rewards* is dangerous — "other stakes" is broad and rewards convertible to money may qualify.

### 2.2 State gambling laws

- The Public Gambling Act, 1867 and successor state statutes criminalise "gaming" (games of chance for stakes); games of *skill* are exempt in most states. **No stakes by your viewers ⇒ no gaming**, even in strict states.
- Telangana and Andhra Pradesh ban even skill games played for stakes — again, only relevant if you introduce stakes. From 1 May 2026 the central Act largely pre-empts the field anyway.
- Practical note: keep the viewer experience free forever, and this entire chapter stays closed.

---

## 3. Prize-competition and prize-scheme laws (the legacy trap)

### 3.1 Prize Competitions Act, 1955 (central Act, adopted state-by-state)

- In force in roughly 15–16 states incl. Andhra Pradesh, Maharashtra, Tamil Nadu, Odisha, Uttar Pradesh, Madhya Pradesh, Gujarat, Punjab, Delhi, Himachal Pradesh, Tripura, Manipur.
- Covers competitions "in which prizes are offered for the solution of any puzzle, based upon the building up, arrangement, combination or permutation, of letters, words or figures" (crosswords, missing-word, picture puzzles). Above **₹1,000 aggregate prize value per month** or **more than 2,000 entries**, a licence from the state licensing authority is required; unlicensed operation is punishable (up to 3 months' imprisonment / fine).
- **BlogRank's position:** a factual comprehension question about content the user just consumed is arguably *not* a "puzzle based upon the building up, arrangement, combination or permutation of letters, words or figures" — it's closer to a quiz/skill test. That is the standard industry argument used by quiz apps, and it is colourable. But the statute is pre-internet and broadly worded; some commentators read it to extend to online puzzle-style competitions.
- **Mitigations:** (a) design questions as knowledge/comprehension quizzes, never word-puzzles/anagram-style formats; (b) document the skill-based character; (c) if you scale in PCA states, take a state-by-state legal opinion on licensing; (d) be consistent: the same "it's a skill quiz, not a puzzle" position supports you here and under consumer law.

### 3.2 State overlays

- **Tamil Nadu Prize Schemes (Prohibition) Act, 1979** — prohibits "prize schemes" run to promote a business, including contests/lotteries (even of skill) used to promote sale/use of products or a business interest. "Watch this creator's content, answer, win" is promotion of that creator's business — a creative regulator could try this Act in TN. Structure the reward as paid by the *platform's rewards programme*, not by each creator per piece, and get a TN-specific opinion.
- **West Bengal Gambling and Prize Competitions Act, 1957** — similar licence regime above ₹1,000/month prize value in WB.
- **Kerala** restricts prize competitions/lotteries via state lottery rules — opinion needed if targeting Kerala users.

---

## 4. Consumer protection & advertising — the "pay to rank" disclosure duty

### 4.1 The core duty: disclose paid placement

- Consumer Protection Act, 2019 s.2(28) defines "misleading advertisement" to include ads that *conceal material information* / deceive consumers about commercial intent. CCPA's **Guidelines for Prevention of Misleading Advertisements, 2022** require honest representation and disclaimers that don't hide material facts; hiding the *commercial intent* of a listing is exactly what these rules target.
- If ranking position is bought, every paid slot must carry a clear, prominent label — **"Sponsored" / "Paid placement" / "Promoted"** — visible at first glance, not buried in T&Cs. The ASCI Code (recognised in the CCPA/DoCA-ASCI MoU) and ASCI's influencer guidelines apply the same logic; the same rules also bite creators who promote their BlogRank listing on Instagram/YouTube without #ad/#sponsored.
- Penalties: CCPA can fine up to **₹10 lakh (first) / ₹50 lakh (repeat)**, order discontinuation and corrective advertising; endorsers can be barred 1–3 years.
- Also relevant: separate any *organic* ranking from paid slots (e.g., "Top picks" vs "Sponsored"), because presenting a paid list as an objective ranking is the misleading element. If there is no organic ranking at all, say so plainly ("All positions on BlogRank are paid").

### 4.2 The reward promise must be honoured

- "Correct answer + enough real time spent = reward" is an advertisement/promise to consumers. Reneging, quietly shrinking rewards, or using opaque "time spent" measurement to deny payouts invites **unfair trade practice** claims (s.2(47) CPA) before District/State Consumer Commissions, CCPA action, and chargebacks.
- Publish, in plain language: how "real time spent" is measured, what counts as correct, reward amounts and caps, payout thresholds and timelines, and fraud/bot disqualification rules. Apply them consistently.
- Avoid "bait" structures under the 2022 Guidelines (advertising rewards you routinely don't pay) and "free claims" that aren't really free.
- If you use countdown urgency ("only 3 slots left"), it must be true — fictitious scarcity is a misleading ad.

---

## 5. Tax

### 5.1 GST (platform side)

- Your charge to creators for ranking/placement is an **advertising / online platform (intermediary) service** — standard rate **18%** (SAC 998365/998366 family) *once you are registered*.
- **You can lawfully operate with no GST at all while aggregate turnover stays under ₹20 lakh per financial year** (₹10 lakh in the special-category north-eastern states). Crucially, inter-state supply of **services** does *not* force early registration: Notification No. 10/2017-Integrated Tax (13 Oct 2017) exempts service suppliers ≤ ₹20 lakh from compulsory registration notwithstanding s.24 CGST — a website selling to creators across India qualifies. (Correction to earlier drafts of this memo: the "GST from invoice #1" rule applies to inter-state *goods*, not services.)
- **Fine print on the GST-free window:**
  - *Aggregate turnover is PAN-wide* — all services of the same legal entity count together. A clean Pvt Ltd keeps the calculation simple.
  - *Register within 30 days* of crossing ₹20 lakh — track monthly; crossing mid-year makes you liable from that day, not next April.
  - *RCM trigger:* any reverse-charge liability (e.g. advocate fees, goods transport) technically compels registration irrespective of turnover — route such purchases through a registered vendor where possible.
  - *ECO caveat:* s.24(x) forces registration on "e-commerce operators" required to collect TCS. BlogRank sells **its own** ad inventory (not other suppliers' services through the platform), so the standard position is that it is *not* an ECO for TCS — get your CA to confirm this in writing, since some advisors read "ECO" broadly.
  - *Cost of staying unregistered:* you charge no GST, issue simple invoices, but cannot claim ITC — the GST inside your gateway/SaaS/vendor bills becomes a dead cost (usually trivial at this scale).
- **Once registered:** 18% on fees; opt into the **QRMP scheme** (turnover ≤ ₹5 crore) — GSTR-1 and GSTR-3B filed **quarterly** with monthly tax payment by challan, instead of monthly filings. Composition (6%) is effectively unusable: composition suppliers cannot make inter-state supplies, and a website sells nationwide.
- The **28%-on-full-stakes** regime (Rule 31B CGST Rules; confirmed by the Supreme Court in *DGGI v. Gameskraft*, 2026 — online money-gaming platforms are suppliers of betting actionable claims, GST on the entire bet value) applies **only to stake-based money gaming**. With no stakes, it does not apply. Guard this classification jealously; mis-design (viewer fees) would create both criminal gaming exposure and ruinous 28% full-value GST exposure.
- Rewards: cash payouts to viewers are your expense (no GST charged to the user). Vouchers/gift rewards: post-GST-Council circular these are not taxable at issuance — see §11.2. If foreign creators pay you, that is export of service (zero-rated with LUT) — see §10.

### 5.2 Income tax & TDS (viewer rewards)

- **Sec. 194BA / 115BBJ** (30% on net winnings from "online games") apply to games played "by putting in money or stakes". Your viewers put in nothing ⇒ these sections **should not apply**. Keep evidence of the free-entry structure — payment gateways and tax authorities will ask.
- **Sec. 194B / 115BB**: winnings from **crossword puzzles, quiz/game shows, card games, lotteries** attract **30% TDS** once a user's winnings exceed **₹10,000 in a financial year** (31.2% with cess), and flat 30% tax for the recipient. Deterministic micro-rewards sit in a grey band between "prize winnings" (194B) and "consideration for a micro-task" (no specific TDS head; the viewer's ordinary income). Prudent course: apply 194B with the ₹10,000 threshold, obtain PAN at payout (else higher TDS u/s 206AA — 20%), deduct before delivering in-kind rewards too, deposit TDS monthly, file Form 26Q and issue Form 16A quarterly.
- Users must declare rewards in ITR; publish a tax-information page — it also strengthens your "prize, not wage" position (§7).
- Corporate side: your ranking revenue is ordinary business income; creator payments are your revenue, not pass-throughs.

### 5.3 PMLA / AML

- Online money gaming was brought under PMLA (2023) — again keyed to money gaming, so not your bucket. Mass retail payouts still warrant KYC-lite controls (PAN + bank/UPI verification at payout, velocity limits, fraud screening) — your payment partner will impose these anyway.

---

## 6. Ponzi / money-circulation law — the "watch to earn" graveyard

- **Prize Chits and Money Circulation Schemes (Banning) Act, 1978** bans any scheme in which people make payments in expectation of benefits derived from enrolling further members or from money circulated by the scheme — cognizable offence, investigated aggressively (UP "Social Trade" — pay-to-like task app — arrests are the cautionary tale; enforcement in this space is trigger-happy).
- **BlogRank is safe only while:** viewers never pay you anything, and earnings never depend on recruiting others. Your reward pool must visibly come from creator ad spend (real revenue), never from user deposits.
- ❌ Red lines: viewer "memberships" that unlock earning; referral earnings paid as % of downline activity; "top-up to withdraw" or activation fees; security deposits for payout eligibility. Any one of these converts a rewards programme into a prosecution magnet — PCMCSA + IT Act s.66D (cheating by personation) + state lottery/prize-chit enforcement.
- Practical hygiene: publish the reward funding model ("rewards are funded by creator sponsorship fees, not by user money"), keep payouts liquid (no forced wallet lock-ins), and never let wallet balances require a payment to unlock.

---

## 7. Gig-work recharacterization (medium risk, watch it)

- Micro-rewards for verified tasks ("watch 3 min, answer, earn ₹5") look like **piece-rate platform work**. The Code on Social Security, 2020 defines gig workers broadly; **Rajasthan** (Platform Based Gig Workers (Registration and Welfare) Act, 2023) and **Karnataka** (Platform-Based Gig Workers (Social Security and Welfare) Ordinance, 2025 — its schedule covers e-marketplaces and content/media sectors) impose aggregator registration, welfare fees/cess and algorithmic-transparency duties; Telangana and Jharkhand have drafts in the pipeline.
- Whether a prize/rewards programme for consumers is "platform work" is untested — but a regulator could argue that deterministic pay-per-task makes viewers "workers". Factors that cut against characterization: rewards framed as **bona fide prizes/engagement benefits** (not wages), variable/limited, no "assignment" or acceptance workflow, no productivity metrics communicated as work expectations, tax treated as prize winnings (§5.2), and T&Cs expressly stating no employment/partnership.
- Revisit when Karnataka's ordinance is operationalised and if you launch leaderboard "pro earner" tiers — the more it looks like a job, the higher the levy risk (registration + cess on payouts in those states).

---

## 8. Data protection — DPDP Act, 2023 + DPDP Rules, 2025

- The DPDP Rules were notified in 2025 with phased compliance rolling through 2026–27; penalties run to **₹250 crore**. You are a **data fiduciary**: you profile attention (watch-time, scroll behaviour), device/bot signals, KYC and payout data.
- Must-dos:
  - **Standalone, plain-language consent notice** (not fused into T&Cs) itemising purposes: rewards programme, watch-time verification, fraud/bot detection, payouts; consent withdrawal and erasure rights; **breach notification to the Data Protection Board (72 hours)**.
  - **Children:** under-18s require **verifiable parental consent**, and you may not track/target-ad children — for an "earn money" product that attracts teens, the clean answer is: **18+ only, age-gated at KYC/payout**. Without this, behavioural tracking (your core anti-fraud mechanic) is unlawful for minors.
  - Anti-fraud (device fingerprinting, attention analytics) is personal-data processing — cover it in the notice, minimise, and document safeguards.
  - Watch for SDF designation (volume/sensitivity triggers) — would add DPO, DPIAs, audits.
- Cross-border: creator data of foreign users / foreign creator payments engage FEMA + transfer restrictions if any; default to India-resident processing where possible.

---

## 9. Intermediary, content & IP exposure

- **IT Rules, 2021 (intermediary due diligence):** if users post anything (comments, submissions), you need published community guidelines, a **grievance officer** (India-based, 15-day resolution), 24-hour urgent-takedown capability for prohibited content, and monthly compliance reports once you qualify as a significant social media intermediary (ignore until scale; basic intermediary duties apply from day one).
- **Ad screening:** you are also an *advertiser/publisher* of creator placements. Under the 2025 Gaming Act, **advertising online money games is itself an offence** — betting/casino/RMG apps will chase distribution as their industry collapses. Screen advertiser verticals: no betting/RMG, no prohibited categories (tobacco/surrogate, alcohol where barred, predatory lending, obscene content, misleading claims). Written ad-acceptance policy + takedown terms in the creator contract.
- **Copyright:** linking out to blogs/YouTube is fine; use YouTube's official embed API (don't rip/re-host). Questions about content = facts/ideas, generally not infringing, but don't copy substantial excerpts into your quiz. Keep a DMCA-style takedown channel for creator disputes.
- **IT Act criminal exposure:** s.66D cheating and s.420 IPC analogues are what police invoke when reward apps bait-and-switch — honour published reward terms (§4.2) and keep audit logs of denial decisions.

---

## 10. Payments, FEMA, FDI, entity setup

- **Payment rails:** creator collections via an Indian payment aggregator; viewer payouts via a licensed payout provider (penny-drop verification, TDS hooks). Facilitating banned money-game payments is an offence for banks — another reason to never touch viewer stakes (you'd lose your banking rails instantly).
- **Foreign creators paying you:** export of service — GST zero-rating with LUT, FEMA reporting, invoice in FX; no FDI concern.
- **FDI:** 100% automatic route is available for an advertising/e-commerce marketplace platform like this (unlike real-money gaming, which faces FDI restrictions) — keep the model clean and foreign investment stays easy.
- **Entity:** Indian private limited (or start foreign-owned via the automatic route); Shops & Establishments registration; professional tax where applicable; trademark "BlogRank" (TM class 35/41/42) in India; startup DPIIT recognition if desired.

---

## 11. Reward-model variants: no rewards vs coupons vs cash

Compliance scales with what you give viewers. The three build options compared:

| Regime / duty | No rewards | Coupon rewards | Cash rewards |
|---|---|---|---|
| Gaming Act 2025 / gambling law | Moot — nothing to win | ✅ Same as cash: reward form irrelevant, viewers stake nothing | ✅ Fine while viewers pay nothing |
| Prize Competitions Act 1955 / TN Prize Schemes Act | ❌ Gone — no prize offered | ⚠️ Applies — prizes count "whether in cash or otherwise" | ⚠️ Applies |
| TDS 194B / 30% tax (115BB) | ❌ Nothing to withhold | ✅ Applies, with in-kind mechanics (below) | ✅ Applies |
| GST on the reward itself | n/a | ✅ Simple — vouchers not taxable at issuance (below) | ✅ Cash payout = expense |
| Payout rails, penny-drop, AML/KYC | ❌ Gone | ⚠️ Lighter — codes by email/SMS; identity only for TDS tracking + fraud | ✅ Full stack |
| PCMCSA (Ponzi) | ❌ Moot | ⚠️ Red lines apply — never sell/trade coupons | ⚠️ Red lines apply |
| Gig-work recharacterization | ❌ Gone — no compensation | ⚠️ Medium | ⚠️ Medium |
| DPDP / children / attention data | ⚠️ Lighter — may not even need accounts | ✅ Full | ✅ Full |
| Ad disclosure, entity, GST 18% on fees, ad screening | ✅ Always | ✅ Always | ✅ Always |

### 11.1 Variant A — no rewards to viewers

The product becomes a **sponsored-listings / content-discovery board**: creators pay for rank, visitors just consume (quiz optional, for engagement only).

**Drops off entirely:** prize-competition licensing (no prize offered), all winnings tax/TDS (194B, 115BB — no Forms 26Q/16A for viewers, no PAN collection), payout rails + penny-drop + payout KYC, PMLA/AML surface, PCMCSA exposure, gig-work recharacterization, and the 18+ payout gate (DPDP children's duties still apply to behavioural tracking, but you can design an anonymous, login-free product and shrink data duties further).

**Still required:** Indian entity + **GST 18% on ranking fees only above the ₹20 lakh threshold** (§5.1) + invoicing/ITR/ROC; **paid-slot disclosure** ("Sponsored/Paid" — CPA 2019 + CCPA 2022, still the core duty); ad-acceptance screening (no betting/RMG advertisers — advertising money games is itself an offence); DPDP basics (notice, security, breach runbook); IT Rules intermediary duties if users post content; copyright/embed rules; creator agreement + T&C; ASCI-compliant own marketing.

**Net effect:** roughly two-thirds of this memo's obligations disappear. You are running an ordinary ad platform — the lowest-risk version of BlogRank.

### 11.2 Variant B — coupon rewards

- **Gaming law: identical to cash.** The 2025 Act cares whether the *user* paid stakes, not what the prize is made of. Keep coupons unpurchasable, non-tradeable and never cash-outable — coupons that users can buy, sell or convert start to look like "other stakes"/tokens.
- **Prize laws: identical to cash.** PCA 1955 and the TN/WB Acts count prizes "whether in cash or otherwise" — coupon face value counts toward the ₹1,000/month licence threshold and the 2,000-entries cap in adopting states.
- **TDS — winnings in kind:** 194B applies to the *value* of the coupon once a user's winnings cross ₹10,000 in a FY. Where the prize is wholly in kind, the payer must **ensure the tax is paid before releasing the prize** (recover from the winner or bear it yourself). Cleanest design: **cap per-user coupon value below ₹10,000/FY → zero TDS duty** (still taxable income for the user in theory). Collect PAN once a user approaches the cap; 20% higher TDS without PAN (s.206AA).
- **GST — now simple:** per the GST Council decision and CBIC circular, vouchers are either "money" (if RBI-compliant) or actionable claims — **not taxable at issuance**; the underlying supply is taxed at redemption by the brand. Buying Amazon/Flipkart/brand gift cards is not a taxable supply, so there is no GST cost or ITC complication on the voucher itself. Discount coupons (no face value) are lighter still.
- **RBI — use third-party coupons only.** Gift cards you buy and distribute are the *issuer's* regulatory problem (gift PPIs: ≤₹10,000, ≤1 year, non-reloadable, no cash-out). **Never issue your own stored-value "BlogRank balance" redeemable in money** — that needs RBI PPI authorisation and resembles stakes/deposits (PCMCSA adjacency).
- **Consumer law:** disclose validity, brand, minimum-spend and single-use terms **at the moment of the offer** — expired or unusable coupons = CCPA bait/free-claim problems. Single-use codes, device limits against code resale.
- **Ops:** no bank payout rails, no penny-drop, smaller AML surface — but keep identity/velocity controls for multi-account farming.

### 11.3 Choosing

Validate with **no rewards or capped coupons** first: coupons deliver most of the engagement loop at roughly half the operational stack. Cash rewards require the full §14 roadmap (payout rails, TDS engine, KYC) from day one.

### 11.4 The compliance ladder — design choices that shrink the legal stack

Every feature you **don't** build deletes a chapter of this memo:

| Cut this feature | Law / risk that disappears |
|---|---|
| Rewards entirely | Gaming analysis moot; PCA 1955 & TN prize laws; 194B TDS + 26Q/16A; payout rails & penny-drop; AML; PCMCSA; gig-work recharacterization; 18+ payout gate |
| Cash → third-party coupons capped < ₹10,000/FY/user | TDS engine (threshold never crossed); bank payout rails; AML surface; GST on rewards becomes trivial |
| On-platform wallet (instant redemption instead) | RBI PPI exposure; "deposit" optics under PCMCSA |
| Referral rewards | PCMCSA adjacency entirely |
| Viewer accounts (login-free product) | DPDP shrinks to notice + security; no DLT/SMS vendor stack (email-only) |
| Comments / user posts | IT Rules intermediary duties (grievance officer, takedown SLAs, monthly reports) |
| Content hosting (links + official embeds only) | Copyright takedown machinery |
| Under-18 access (18+ only) | DPDP verifiable parental consent + ban on behavioural tracking of children |
| Foreign creators (India-only at start) | FEMA + GST export zero-rating paperwork |
| Urgency/scarcity claims in marketing | CCPA bait-advertising exposure |

**The ladder:**

- **Level 0 — lightest legal footprint:** no rewards, no login, links/embeds only, board openly labelled "all placements are paid", proprietorship or Pvt Ltd, and — while turnover stays under ₹20 lakh — **no GST registration at all**. Remaining stack: entity + ITR/ROC, sponsored-slot labels, ad screening, DPDP-lite, T&C + creator agreement (GST joins only at the threshold, §5.1). Legally, this is an ordinary ad platform.
- **Level 1 — engagement with coupons:** Level 0 + third-party coupon rewards capped < ₹10,000/FY/user, email login, 18+. Adds: Rewards T&Cs (measurement + caps), prize-law opinion for launch states, fraud/velocity controls, full DPDP consent flow.
- **Level 2 — full economy:** cash rewards + accounts + referral gift. Adds: TDS engine (194B, PAN, 206AA), payout rails + penny-drop KYC, monthly TDS calendar, gig-risk disclaimers, and (if you add UGC) the entire intermediary stack.

**Do-not-build list (each multiplies compliance or creates crime):** any viewer payment (fees, retries, boosts, tokens — banned money game); staking earned rewards; wallet balance redeemable in money; referral earnings as % of downline; self-issued "BlogRank coins"; under-18 access with attention tracking; foreign payouts before FEMA review.

An interactive version of this ladder (toggle features → see the remaining stack and hard warnings) is on `legal-checklist.html`.

---

## 12. The five red lines (product guardrails)

1. **Viewers never pay or stake anything** — no entry fees, no paid retries, no coins/boosts/multipliers, no deposit-to-withdraw, no staking earned balances. (Gaming Act + GST 28% + banking rails + PCMCSA all live behind this one door.)
2. **No earnings from recruiting** — no referral chains, no % of downline activity. Referral bonuses, if any, are one-time fixed gifts for a signup, never tied to the referred user's earnings.
3. **Every paid slot is labelled** — "Sponsored/Paid" visible on the card; no blended organic-looking paid ranking.
4. **Published reward rules are honoured** — transparent measurement of "real time spent", payout timelines, no retroactive shrinking; fraud denials logged and appealable.
5. **18+ only, KYC at payout** — kills the DPDP children's problem and supports TDS/PAN discipline.

## 13. Pre-launch compliance checklist

- [ ] Indian entity + GST registration; invoicing stack for creator fees (18%).
- [ ] Creator agreement: paid placement T&Cs, ad content standards, takedown rights, refund policy, disclosure cooperation clause.
- [ ] Viewer rewards-programme T&Cs: eligibility (18+), measurement methodology, reward schedule & caps, payout thresholds/timelines, fraud & clawback rules, tax disclosure, "not employment" disclaimer.
- [ ] Consent notice + privacy policy (DPDP-compliant, standalone), breach-response runbook (72 h).
- [ ] Grievance officer appointed + published; community guidelines; monthly compliance report calendar.
- [ ] TDS engine: PAN capture, 194B logic (₹10,000 FY threshold, 30%), Form 26Q/16A calendar; no-PAN 206AA handling.
- [ ] Ad-acceptance policy excluding betting/RMG and prohibited verticals; advertiser KYC.
- [ ] Legal opinion (gaming counsel) on: PCA 1955 exposure per launch state; TN Prize Schemes Act structuring; reward instrument (cash vs voucher) tax treatment.
- [ ] Watchlist reviews: Online Gaming Authority notifications on registration of "social games"; Karnataka/Rajasthan gig rules; DPDP SDF designations; CCPA enforcement on paid rankings.

---

## 14. Launch roadmap: domain → go-live → steady ops (every step)

**Realistic timeline: ~9–10 weeks part-time team, ~6 weeks full-time. Costs are ballpark INR (2026).**

| Phase | Weeks | Output | Ballpark cost |
|---|---|---|---|
| 0 — Lock identity | 1 | Name cleared, domain + handles owned, TM filed | ₹6k–12k |
| 1 — Entity & money rails | 1–3 | Pvt Ltd + PAN/TAN + bank + GSTIN | ₹7k–15k |
| 2 — Vendors | 2–4 | SMS/OTP, payment gateway, payouts, APIs | ₹1k–6k setup |
| 3 — Build MVP | 3–7 | Working product + legal pages | ₹0–2k/mo infra |
| 4 — Legal dry-run | 7 | Counsel sign-off on reward design | ₹25k–75k one-time |
| 5 — Private beta | 8 | Money loop verified end-to-end | Small reward budget |
| 6 — Public launch | 9–10 | Live board, creators onboarded | Marketing budget |
| 7 — Steady ops | ongoing | Compliance calendar running | ₹2.5k–5k/mo CA |

### 14.1 Fast lane: legally launching in 1–3 days (Level 0, no viewer rewards)

The long phases above exist for the reward economy. A **no-rewards sponsored-listings board** is an ordinary advertising business, and almost nothing in it legally requires a waiting period:

| Roadmap item | Days-version | Why it's legal to skip/defer |
|---|---|---|
| Pvt Ltd incorporation (1–3 wks) | **Launch as a sole proprietor / individual** — zero registration needed to exist and trade | Proprietorship has no formation requirement; your PAN + a bank account is a valid business. Convert to Pvt Ltd when revenue/investors justify (2–3 weeks, done in parallel) |
| GST registration | **Skip entirely** | Not required below ₹20 lakh/yr turnover for services, including inter-state (Notification 10/2017-IT, §5.1). Issue simple (non-tax) invoices |
| Trademark filing | Optional, file in week 1–2 | Using a name doesn't require registration; you get common-law rights from use. Do a quick conflict search before Day 1; file when convenient |
| Payment gateway KYC (1–3 days) | **Day 1: manual UPI QR / bank transfer + a form** — you invoice and activate the slot yourself | Receiving payments for your own services needs no licence; only *aggregating* payments for others does. Submit PG KYC on Day 1 anyway so automation arrives by Day 3–5 |
| DLT/SMS, OTP logins | No accounts at all | Login-free board = no SMS stack, minimal DPDP surface |
| Counsel sign-off (₹25–75k) | Not needed at this level | No rewards, no prize law, no payout law in play. Get the opinion *before* adding coupons/cash, not before launch |
| Legal pages | Template T&C + privacy notice + refund policy + contact page — hours | Required for PG KYC and good consumer-law hygiene; templates are a legitimate starting point, tightened later |
| DPDP | Privacy notice + cookie consent banner, GA4 behind it | Day-1 compliant posture for a low-data site |
| Grievance officer | Publish a contact/grievance email | Full IT-Rules machinery only bites with user-generated content — don't launch with comments |

**Day-by-day minimum:**

- **Day 0 (evening):** name conflict search; buy domain; deploy the board (static site is fine) with pricing, "every slot is a paid placement" labelling, T&C/privacy/refund/contact pages, UPI QR + submission form.
- **Day 1:** first paid slots live (manual confirmation); ad-screening checklist for submissions (reject betting/RMG/prohibited verticals); submit PG KYC; open a fintech current account (1–3 days); publish grievance email; books spreadsheet started.
- **Day 2–3:** PG payment pages live → automated checkout; TM filing; escalate announcements.
- **Week 2–3 (parallel, post-launch):** Pvt Ltd incorporation (or continue as proprietor), counsel opinion, then flip on **coupon rewards** (Level 1) with caps < ₹10,000/user/yr.

**Hard rules that still apply on Day 1:** every slot labelled Sponsored; no viewer payments of any kind; no rewards promised until the Level-1 legal work is done; honour refunds per the published policy; screen advertisers. Break these and the fast lane is illegal — keep them and a Day-1 launch is fully lawful.

### Phase 0 — Lock the identity (Week 1)


1. **Name clearance:** search the [IP India trademark registry](https://iprsearch.ipindia.gov.in/tmrpublicsearch/frmmain.aspx) (Classes 35, 41, 42) for "BlogRank" conflicts; check MCA name availability and Google the name + "app". Shortlist 2–3 fallbacks.
2. **Buy the domain:** `blogrank.in` and `blogrank.com` (`.in` ~₹500–900/yr, `.com` ~₹1,000–1,500/yr — Cloudflare Registrar / Namecheap / GoDaddy). Immediately: enable 2FA, registrar lock, auto-renew.
3. **Grab every handle now** (X, Instagram, YouTube, LinkedIn, Telegram) even if unused — free.
4. **File the trademark application** (Form TM-O online, ₹4,500/class for individuals & startups, ~₹9,000 otherwise). You get a filing number in days; registration takes ~1–2 years but your priority date starts now.

### Phase 1 — Entity & money rails (Weeks 1–3)

5. **Choose the vehicle.** Sole proprietorship is faster, but a **Private Limited Company** is the right call here — payment gateways, payout providers, creator contracts and future investment all get easier, and FDI stays clean (§10). Use a formation service or CA (₹6k–15k all-in): SPICe+ on MCA → **COI, CIN, company PAN, TAN, MOA/AOA**. Minimum 2 directors (you + co-founder/family), DSC + DIN.
6. **Registered office:** your home address works fine in most states; or a virtual office (~₹2k–4k/yr) if you want privacy.
7. **Current account** in the company's name (any bank, or startup-friendly fintech current accounts).
8. **GST: decide threshold vs registration.** No registration is needed while annual turnover stays under **₹20 lakh** (services; inter-state services included — Notification 10/2017-IT). Track turnover monthly; register within 30 days of crossing. When you register: 18% on ranking/ad services (SAC 998365/998366) and opt into **QRMP** (quarterly filings below ₹5 crore). Skip GST entirely if you also want the ₹0-tax launch: unregistered = no GST on invoices, no ITC.
9. **Optional but useful:** DPIIT Startup Recognition (free — tax & compliance benefits), Udyam/MSME (free).
10. **If you have an office/employees:** Shops & Establishments registration (state portal) and professional tax registration (state-dependent). EPF/ESI only kick in at 10/20 employees.

### Phase 2 — Vendor onboarding (Weeks 2–4, runs parallel)

11. **DLT registration for SMS/OTP** — the step everyone forgets: India mandates sender registration on telecom DLT portals (Jio/Airtel/Vi — register as a *Principal Entity*, ~₹1,000–6,000 one-time), then approve a 6-char sender ID + OTP templates. Without this, no phone OTP login. Lead time ~1 week.
12. **Payment gateway** for creator payments (Razorpay/Cashfree, setup free, ~2% fees). Their KYC needs: COI, PAN, GSTIN, cancelled cheque, **and a live website with pricing, T&C, refund policy and contact page** — so put the landing page up first (see step 18).
13. **Payout rails for rewards** (RazorpayX / Cashfree Payouts): UPI transfers + **penny-drop** bank verification (name-match is mandatory for payouts), and download their TDS-friendly reports.
14. **API keys:** Google Cloud project → YouTube Data/Player API (request quota), GA4 (behind a consent banner), Sentry, transactional email (SES/Resend).
15. **Data residency:** host in an **India region** (AWS Mumbai / DO Bangalore) — simplifies your DPDP posture (§8).

### Phase 3 — Build the MVP (Weeks 3–7)

16. **Stack (suggestion):** Next.js + Node/Python API + Postgres + Redis; Vercel/Railway or a Mumbai VPS; GitHub CI. No build step is fine for the landing page; the app itself needs the full stack.
17. **Build modules in this order** (each is independently testable):
    - **a. Landing + waitlist** (also unblocks PG KYC, step 12) — pricing, "all slots are paid placements" disclosure, contact, T&C.
    - **b. Creator side:** submit link (blog URL / YouTube link), pay-to-rank checkout via PG, sponsored-slot board (every slot labelled **Sponsored/Paid**), spend dashboard.
    - **c. Viewer side:** content page — YouTube official embed or article reader with **attention tracking** (dwell timer, Page Visibility API for tab-switches, scroll depth), quiz unlocked only after the time threshold, answer check.
    - **d. Question bank:** start with human-authored questions per submitted link (admin review); automate later. Knowledge/comprehension format only — never anagram/word-puzzle formats (§3.1).
    - **e. Wallet & payouts:** reward ledger (immutable entries), daily/user caps, **18+ age gate**, PAN capture at first payout, **194B TDS logic** (30% once ₹10,000 FY winnings crossed; 20% u/s 206AA if no PAN), UPI payout queue, monthly payout statement.
    - **f. Anti-fraud:** device fingerprint, IP/velocity caps, duplicate-account detection, manual review queue, audit log for every denied reward (feeds §4.2 fairness).
    - **g. Admin console:** content review (reject betting/RMG/prohibited verticals per your ad-acceptance policy), question moderation, reward config, refunds, takedown action.
18. **Legal pages (required before PG activation and before beta):** Terms (creator + viewer), **standalone DPDP consent notice** (separate from T&C), Privacy Policy, **Rewards Programme T&Cs** (measurement methodology, caps, timelines, clawback/fraud rules, "not employment" disclaimer), Refund Policy, **Grievance Officer page** (named person, India address, 15-day SLA), cookie/consent banner.
19. **Age gate:** 18+ checkbox at signup, enforced hard at payout KYC (§8, §12).

### Phase 4 — Legal dry-run (Week 7)

20. **Counsel sign-off** (₹25k–75k one-time, gaming/consumer lawyer) on: free-entry reward structure (no viewer stakes), PCA-1955/TN-Prize-Schemes positioning per your launch states, reward instrument (cash vs voucher — GST treatment differs), creator agreement template, T&C set.
21. **Appoint the Grievance Officer** (published), and retain a **CA** for the GST/TDS calendar (₹2.5k–5k/month).
22. Archive your **evidence pack**: screenshots of free entry (no payment path for viewers), reward funding source (creator fees), question design rationale — this is what you show a tax officer asking "why no 194BA?" or a police officer asking "is this betting?".

### Phase 5 — Private beta (Week 8)

23. Onboard 5–10 friendly creators (free/discounted slots); 50–100 invited viewers; rewards capped small (₹5–20/day/user).
24. **Run the full money loop once, physically:** creator pays → GST invoice issued → viewer completes watch+quiz → reward credited → TDS withheld in ledger → UPI payout lands → books reconcile. Fix everything that breaks.
25. **Attack your own product:** multi-accounts, VM/emulator, tab-idle, script playback. Tune "real time spent" thresholds and velocity limits.

### Phase 6 — Public launch (Weeks 9–10)

26. Seed the board with founding-creator slots; announce on Product Hunt / X / relevant communities.
27. **Marketing compliance:** every paid promo #ad/#sponsored (ASCI + CCPA); never market as an "earning app" or make income claims — call it a **rewards programme**; never target under-18s in ad targeting.
28. **Day-1 runbook ready:** support channel, refund path, content-takedown path, incident escalation (incl. 72-hour DPDP breach runbook).

### Phase 7 — Steady-state operations (ongoing)

| Cadence | Tasks |
|---|---|
| Monthly (7th) | Deposit TDS deducted on rewards |
| Monthly (11th / 20th) | File GSTR-1 / GSTR-3B — **only if GST-registered** (skip entirely below ₹20 lakh turnover; QRMP makes both quarterly under ₹5 crore) |
| Monthly | Payout reconciliation; grievance log review; reward-denial audit; intermediary compliance data |
| Quarterly | TDS return **Form 26Q**; issue **Form 16A**; board meeting minutes (Pvt Ltd) |
| Annual | ITR; ROC filings (AOC-4, MGT-7, DIR-3 KYC); TM status check; insurance/infra renewals |
| Continuous | DPDP rights requests (access/erasure), watchlist from §13 (Gaming Authority social-game registration notifications, Karnataka/Rajasthan gig rules, DPDP SDF list, CCPA actions on paid rankings) |

**India-specific gotchas that stall launches:** PG KYC refuses sites without live pricing/T&C/refund/contact pages; no SMS without DLT; GST is *not* due from invoice #1 for inter-state **services** — you stay unregistered under ₹20 lakh, but must register within 30 days of crossing; payout name-mismatch (penny-drop) blocks UPI transfers; and never let a "paid retry" or "earn boost" feature sneak into a sprint — that single button converts the whole product into a banned online money game (§2.1).

---

## 15. Primary sources

- Promotion and Regulation of Online Gaming Act, 2025 & Rules, 2026 — PIB backgrounder (30 Apr 2026); MeitY enforcement notification (22 Apr 2026); Cyril Amarchand Mangladas, "New Game, New Rules" (Apr 2026); Acuity Law FAQ (2026); ICLG Gambling Laws India 2026.
- Prize Competitions Act, 1955 & state regimes — Lexcounsel regulatory note; Nishith Desai, *Legal Stakes in Gaming*; Sai Krishna & Associates gaming docket.
- Consumer Protection Act, 2019 & CCPA Guidelines, 2022 — Mondaq note on the 2022 Guidelines; CCPA/ASCI enforcement commentary.
- GST — Supreme Court, *DGGI v. Gameskraft Technologies* (2026) INSC 595 (28% on full stakes for money gaming); A2Z Taxcorp analysis.
- Income-tax — Sections 194B, 194BA, 115BB, 115BBJ; ClearTax & TaxGarden explainers (2025–26); s.194B proviso on winnings in kind ("ensure tax paid before releasing").
- GST on vouchers — GST Council decision & CBIC circular (vouchers = money or actionable claims, not taxable at issuance); Karnataka HC *Premier Sales Promotion*; Madras HC *Kalyan Jewellers* (Nov 2023).
- RBI PPI regime — Draft Master Direction on Prepaid Payment Instruments, 2026 (gift PPIs ≤₹10,000, ≤1 year, non-reloadable, no cash-out); PPI Master Direction 2021.
- PCMCSA, 1978 — India Code text; Prize Chits enforcement commentary.
- Gig-work — Rajasthan Act 2023; Karnataka Ordinance 2025 (ELP note); PRS state-comparison tables; Telangana draft Bill 2025.
- DPDP — DPDP Act, 2023; Digital Personal Data Protection Rules, 2025 (notified Nov 2025, phased to 2026–27); Mondaq 2026 compliance update.

*Prepared 27 Aug 2026 for the BlogRank concept documented in `ideas.html` / `docs/pay-to-rank-new-ideas.csv`. Not legal advice; engage licensed Indian counsel before launch.*

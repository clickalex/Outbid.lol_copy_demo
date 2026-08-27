# Level 0 launch pack — the full document list

**Level 0 = a pay-to-rank board that sells advertising slots. Nobody else pays anything, nobody earns anything, no
balances, no rewards, no payouts.** At that scope you are an ordinary advertising-services business run by one
person in India, and the document set is short on purpose. This pack is written for BlogRank (bloggers as
advertisers) but every file is a find-and-replace away from any other niche.

> Research and templates, not legal advice. One CA conversation (~₹2–5k) and a 30-minute lawyer read of file `01`
> and `04` before the first paid slot is the only professional spend Level 0 needs.

---

## 1. The list — what exists, who sees it, what it blocks

| # | Document | Audience | Blocks launch? | Write time | Cost |
| --- | --- | --- | --- | --- | --- |
| 00 | **This pack index** (`README.md`) | you | — | done | — |
| 01 | [Terms of Service](01-terms-of-service.md) | **public**, linked in footer + on the order form | **Yes** — payment processors require it | 40 min | ₹0 |
| 02 | [Privacy notice](02-privacy-notice.md) | **public**, linked in footer | **Yes** — PG KYC + DPDP | 25 min | ₹0 |
| 03 | [Refund & cancellation policy](03-refund-cancellation-policy.md) | **public** | **Yes** — PG KYC demands it | 15 min | ₹0 |
| 04 | [Ad content policy + screening checklist](04-ad-content-policy-and-screening.md) | internal + a 5-line public summary | **Yes** — this is what keeps the money clean | 30 min | ₹0 |
| 05 | [Paid-placement disclosure notice](05-sponsored-disclosure-notice.md) | **public** (the label spec + the wording) | **Yes** — the one duty you can't skip | 10 min | ₹0 |
| 06 | [Invoicing, books and tax](06-invoicing-books-tax.md) | internal | Not before slot #1. Before ₹18 lakh and before the first contractor payment | 45 min | ₹0 + CA |
| 07 | [Entity, bank, vendors, trademark](07-setup-entity-and-vendors.md) | internal | Partially — bank + PG onboarding need it | 60 min spread over a week | ₹0–6k |
| 08 | [Ops SOP + pre-launch gate](08-ops-sop-and-pre-launch-gate.md) | internal | **Yes** — the go/no-go sheet | 15 min | ₹0 |
| 09 | [guardrails: what Level 0 forbids](09-guardrails-scope-lock.md) | internal, pinned above your desk | No, but it's the one that saves you later | 5 min read | ₹0 |

Site-facing pages for launch are already assembled from 01–03 + 05 into **`launch/legal.html`** (one page, four
anchored sections) and linked from the board's footer, so you publish all of it by deploying one folder.

**Files that are already written for you:** `01`, `02`, `03`, `04`, `05`, `06`, `07`, `08`, `09` in this folder,
plus `launch/legal.html`. What is genuinely yours to do: fill 6 placeholders (brand, domain, contact email, city
for jurisdiction, UPI VPA, payee name) and read `09`.

---

## 2. What Level 0 does NOT need (and the exact stage that adds each one)

Deliberately listed so nobody has to relitigate this every week. Each of these is a *later* document for a *later*
product.

| Document | Why it isn't needed now | Stage that adds it | Trigger |
| --- | --- | --- | --- |
| Prize / competition rules & state lottery-permit analysis | No prize is offered; visitors get nothing | Level 1 (coupons) | First reward idea |
| s.194B TDS engine: PAN capture, Form 26Q/16A, monthly deposit calendar | Nothing to withhold — no winnings exist | Level 2 (cash payouts) | Any money to a visitor |
| Payout provider agreement + penny-drop + AML/KYC at payout | No payouts exist | Level 2 | Any withdrawal |
| Gaming-law opinion (PCA 1955, state amendments, 2025 RMG Act) | No stakes, no entry fee, no prize ⇒ not gaming | Level 1/2 | If a visitor ever pays or risks anything |
| **DPDP consent-manager integration, DPIA, data-auditor** | Not a Significant Data Fiduciary at this scale; no behavioural tracking | Only if SDF-notified | Volume/sensitivity thresholds |
| Grievance Officer appointment + IT Rules 2021 intermediary notice | You publish your own rows; users don't post content | The day you open comments/profiles | UGC feature |
| Copyright takedown register under Copyright Rules (Rule 75 grievance) | You are not an intermediary hosting third-party uploads | Same as above | UGC feature |
| Content takedown under IT Rules for user posts | You edit and publish every row yourself | Same | UGC feature |
| GST registration, LUT for exports, GSTR-1/3B (QRMP) | Below ₹20 lakh aggregate turnover for services — inter-state services included (Notification 10/2017-IT, still current in 2026) | On the month you cross **₹18 lakh** | `06` tracker |
| Pvt Ltd incorporation, MOA/AOA, DSC/DIN, ROC filings, board minutes | A proprietor can trade lawfully | Investors, or a buyer who demands an entity | First real funding conversation |
| Escrow / refund reserve account | You hold nothing back; slot is either published or refunded | Never at Level 0 | — |
| VDA/crypto accounting policy, s.43VC/194S tracking, Schedule VDA | No crypto accepted (correct call) | Only if you add a crypto rail | — |

---

## 3. The three dates that actually matter

| Date | What happens | Source |
| --- | --- | --- |
| **14 May 2027** | DPDP Rules' core obligations become operative: itemised consent notice, security safeguards, breach intimation, data-principal rights. Your `02` notice is written to be compliant on day 1, which is cheaper than retrofitting. | DPDP Rules 2025, phased rollout (Rules notified Nov 2025; consent-manager registration from 14 Nov 2026) |
| **14 Nov 2026** | Consent Manager framework opens. Irrelevant to you unless you ever rely on a third-party consent platform. | same |
| **30 days after you cross ₹20 lakh aggregate turnover** | GST registration becomes compulsory. Aggregate turnover is all-India, same PAN, **including exports and exempt supplies** — so foreign bidders count toward the line. Register at ₹18 lakh, not ₹20.5 lakh. | CGST s.22/24 + Notification 10/2017-IT carve-back for service suppliers |
| **FY end (15 Jul)** | ITR-3/ITR-4 for a proprietor (advance-tax dates and the presumptive-tax question are in `06`). | Income-tax Act s.139/207 |

---

## 4. Order of work (the "as soon as possible" path)

1. **Tonight, 90 minutes:** read `09` → paste `01`+`02`+`03`+`05` into `launch/legal.html` placeholders → fill
   `CONFIG` in `launch/index.html` → `python3 launch/build_data.py` → drop the folder on Cloudflare Pages.
2. **Before the first payment (day 1):** `04` screening checklist printed/open, `06` ledger sheet created with
   invoice #1 reserved, `07` §bank — open the current account and submit PG KYC.
3. **Week 1:** `07` §trademark (file TM-O yourself, ₹4,500, class 35), `08` daily routine, `06`'s GST tracker.
4. **Day 30:** `08` §review. Continue only on evidence.

Every file ends with a one-line sign-off block. If a box in `08` is unticked, the board doesn't take money.

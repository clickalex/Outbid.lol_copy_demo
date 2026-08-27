# 06 · Invoicing, books and tax at Level 0

**Status:** internal. This is the "paperwork" that makes the business legal — it is four documents, one sheet and
five dates, not a compliance department. **Numbers here are as of August 2026 and must be confirmed once with a
CA (₹2–5k for a 45-minute call); GST and income-tax thresholds and due dates do move.**

---

## 1. Your tax position in one table (sole proprietor, no rewards, no crypto, all receipts digital)

| Obligation | Position at Level 0 | What changes it |
| --- | --- | --- |
| GST registration | **Not required** while aggregate turnover ≤ **₹20 lakh**/FY for services (₹10 lakh in Manipur, Mizoram, Nagaland, Tripura). Inter-state supplies of *services* do **not** force early registration — Notification 10/2017-Integrated Tax still gives that relief in 2026. | Register within 30 days of crossing; **act at ₹18 lakh**. Turnover = all-India, same PAN, **including exports and exempt supplies**. |
| GST charged on invoices | **0%** — and you must *not* show a GSTIN or a GST line while unregistered. Mark invoices "unregistered proprietor, below the threshold — no tax charged". | At 18% on advertising-space/advertising-service SAC (your memo cites 998365/998366; confirm which applies) once registered; opt into **QRMP** below ₹5 crore (GSTR-1 quarterly + PMTP/challan monthly). |
| Export of service (foreign bidders) | Allowed. You can't zero-rate formally without registration; simply invoice without GST and let the buyer self-assess local VAT/GST. | Once registered: file an **LUT** to export without paying IGST, or pay IGST and claim refund. |
| Income tax | Business income taxed at **your slab rates**; the deemed-profit route (**s.44AD**: 6% of digital receipts, eligible business, limit ₹3 crore) usually makes the taxable profit tiny and, after the new-regime rebate, the tax **nil or near-nil** at your scale. No books of account required if you declare presumptively (ask the CA to confirm you're an "eligible business"). | Real profit, big expenses, a partner, or an investor ⇒ regular ITR-3 accounting. |
| Advance tax (s.207) | Pay only if total tax for the year ≥ **₹10,000**: 15% by 15 Jun, 45% by 15 Sep, 75% by 15 Dec, 100% by 15 Mar. Interest under 234A/234B/234C is what late money costs you — this is the *only* tax date risk at Level 0. | Any year where you'd owe ≥ ₹10k — model it in Dec, not July. |
| TDS **you must deduct** | **None** at Level 0 — no salaries, no prizes (no rewards!), no rent. | First contractor/freelancer invoice > ₹30,000 single or ₹1,00,000 aggregate (194C); professional/technical fees > ₹30,000/yr (194J); commission/interest on sales > ₹15,000 (194H). Then you need a TAN, monthly deposits and 26Q. |
| TDS **on your income** | None today. If a corporate bidder ever says "we'll deduct 10% u/s 194C on advertising", say yes, take the challan copy, and claim the credit in your ITR (it appears in 26AS/AIS). | — |
| 194B / 115BB on viewer winnings | **Does not exist for you** — no visitor gets anything. | Only if you launch Level 1/2 rewards. |
| s.43VC / 115BBH / 194S (VDA rules) | Not engaged — **no crypto accepted** (the correct call; see `09`). | Any crypto rail. |
| PMLA / RBI registration as an intermediary | Not applicable: you accept payment for your own service, hold no balances, never pay out to users, transact in no VDA. | Wallet balances, payouts, refunds-to-third-party, token issuance. |
| Professional tax | State payroll tax — only relevant with employees (and only in some states for proprietors). | First hire. |
| Shops & Establishments registration | State-by-state; many require it even for a home office. Cheap, online, one day. | Any local inspector query, or a bank that asks. |
| MSME (Udyam) | Free, 10 minutes, **not mandatory** — but it is the easiest way to get a current account when a bank asks for a business proof, and it buys you delayed-payment protections. | — |
| DPIIT Startup recognition | Free, but needs a **private limited company** with the right attributes — not available to a proprietorship. | Incorporation. |
| Records retention | Books & invoices: 8 assessment years (income-tax) and 6 years for GST once registered. Screenshots of published rows: keep — they are your *proof of delivery* in any dispute. | — |

**One-line summary for a nervous moment:** at Level 0 you have no GST to file, no TDS to deposit, no VDA math, no
payout KYC, and probably ₹0–a-few-thousand of income tax. The paperwork you owe is: invoices, a ledger, one ITR,
and five advance-tax dates if you cross ₹10k of tax.

## 2. Invoice template (one file per slot, numbered forever)

```
TAX INVOICE / BILL OF SALE — [BRAND]
Proprietor: [PAYEE NAME], PAN: [XXXXX0000X]
Address: [CITY, STATE]   Contact: [CONTACT]   (GSTIN: not registered — below threshold)
Invoice no: BR-2026-0001        Date: 2026-__-__
Billed to: [Advertiser legal name / site], [email]
Place of supply: [state] / outside India

Description                                          Amount
Advertising placement — row #_ on the [BRAND] board,    ₹____
live from __-__-____, position held until outbid.
Category: ____   Bid: ₹____   Payment: UPI ref ____

Total ₹____   (no GST charged — supplier unregistered, aggregate turnover below threshold)
Terms: paid in advance; refund per policy at [DOMAIN]/legal#refunds.
```
Rules: year-wise consecutive numbering, **no gaps and no reuse**; PDF per invoice; one folder per FY; and for a
foreign buyer add the currency invoiced, the rupee amount converted at the rate on the invoice date, and the bank
advice/FIRC reference.

## 3. The ledger (one Google Sheet, one row per event — this replaces "accounting")

| Col | Field |
| --- | --- |
| A | Invoice no (BR-FY-####) |
| B | Payment date / C Publication date / D Amount / E Rail + txn reference |
| F | Advertiser + domain / G Category / H Row position at publication |
| I | Screening done (1–10 pass, initials) / J Screenshot filename |
| K | Refund? (blank/amount/reason) / L Follow-up (link change, suspended, reinstated) |
| M | **FY cumulative turnover** (formula: sum of D where month ≤ this month) |
| N | Notes (disputes, unusual requests — every complaint lands here, not in your head) |

Second tab: monthly totals + a line "₹18,00,000 remaining to the GST trigger". Third tab: refund register (the one
`03` promises). Print the whole sheet into `07`'s backup folder monthly; if the laptop dies, that sheet is the
difference between a business and a mystery.

## 4. Revenue recognition (so the "accrual vs withdrawal" myth can't come back)

Revenue is earned **when the placement is delivered** — the publication date (column C), not the day the UPI ping
arrives, and definitely not the day you move money to another account. If someone pays in March for a row you
publish in April, it belongs to April for your books and to FY-end for your ITR; and if it is paid but never
delivered it is a liability, not income. One column of discipline now saves an argument with a GST officer later,
because the moment you register, GST is due on the earlier of invoice, payment and completion of service.

## 5. The five things to do, in order, this week

1. Reserve numbering `BR-2026-0001` and make the sheet **before** the first payment.
2. Open the current account (`07` §2) — no mixing of personal and business money, ever; the mixing is what turns
   a ₹2 lakh scrutiny into a ₹20 lakh one.
3. Ask the CA one question in writing: *"proprietorship, online advertising placements, all digital receipts,
   FY-end turnover under ₹20 lakh — 44AD at 6%, ITR-4, and no GST: correct? What would change it?"* Save the reply.
4. Calendar the four advance-tax dates + the ITR date + a monthly 10-minute "ledger + screenshot folder" slot.
5. If any bidder asks for a GST invoice: **that is your registration trigger**, not a negotiation. A registered
   buyer's ₹5,000 order with 18% shown separately is a customer you keep; telling them "we're unregistered" is
   fine once and costs you the enterprise deal forever.

---

**Sign-off:** sheet created on `____`; CA reply saved as `ca-note-____.pdf`; first invoice `BR-2026-0001` on `____`.

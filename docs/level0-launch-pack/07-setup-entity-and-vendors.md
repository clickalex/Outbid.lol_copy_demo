# 07 · Entity, bank, payment rails, trademark, hosting

**Status:** internal checklist. Everything here is DIY in India in 2026; the only line item that needs a
professional is the current account if your bank is difficult. **Total spend to be legally tradeable: ₹0–6,000.**

---

## 1. Entity — stay a sole proprietor

| Item | What to do | Notes |
| --- | --- | --- |
| Registration to exist | **None.** A proprietor with a PAN and a bank account is a valid business in India. | Don't let a "startup package" seller tell you otherwise at this stage |
| Name rules | Trade as `[BRAND]`; never append "Pvt Ltd"/"LLP"/"Company". | Misusing those suffixes is an offence |
| PAN | Your personal PAN is the business PAN. Quote it on invoices. | — |
| GSTIN | None (see `06` §1). Do **not** "register early for credibility" — it adds 3 filings a quarter and a compliance habit you must never drop. | Register at the ₹18 lakh line |
| TAN | Not needed (no TDS to deduct at Level 0). | Needed the day you hire or pay a contractor above limits |
| When to incorporate | First investor cheque, first enterprise contract that demands a company, or if the board is earning >₹25 lakh/FY and you want a clean wall between you and it. | SPICe+ on MCA, ₹7–15k via a CA, 2–3 weeks, and it's done *while* you keep trading as a proprietor |

## 2. Bank — the one thing that must be right on day 1

1. **Current account in your name as proprietor** ("`[PAYEE NAME], proprietor — [BRAND]`"). Fintech current
   accounts open same-day with modest balance requirements; a nationalised bank works too and is often friendlier
   about "online services".
2. **What they'll ask:** PAN, Aadhaar-linked, address proof, and *something that says the business exists*. If the
   branch balks, do **Udyam/MSME registration first** (free, 10 minutes, udyamregistration.gov.in) and bring the
   certificate. Shops & Establishments registration is the alternative proof in stricter states.
3. **The business-model note** (print it, hand it over — this paragraph is what prevents a frozen account, because
   "website taking many small online payments" is a fraud-team's pattern and you should explain it before they
   ask):
   > I run `[DOMAIN]`, a website that sells advertising placements to bloggers and software businesses. Each
   > customer pays a fixed price in advance for one row on a public board, which I publish myself. There is no
   > user wallet, no refundable balance, no rewards or prizes, no payouts to customers, no resale of anyone
   > else's goods, no investment product and no gaming. Receipts are UPI and card; average ticket ₹1,000–3,000;
   > refunds are per my published policy at `[DOMAIN]/legal`. My terms, privacy notice and refund policy are live
   > on the site.
4. **Never** receive business money in your personal savings account, not even once "temporarily". Commingling is
   what turns a small audit into a bad one.

## 3. Payment rails

| Stage | Rail | Why |
| --- | --- | --- |
| Day 1 | **Manual UPI + invoice** (you publish after you see the money) | Zero onboarding, zero hold, zero KYC wait, works for Indian bidders now |
| Day 1 | Ask every bidder for the txn reference on the order form | The reference *is* your reconciliation; without it you'll spend evenings guessing |
| Week 1–2 | **Card via a payment link** (Stripe Payment Link / Razorpay Payment Page) | Needed for foreign bidders and for people who won't UPI a stranger |
| Same time | Submit PG KYC: PAN, current-account proof, live website with the three public policies, domain in your name (WHOIS), business description | PGs reject "entertainment/betting-adjacent" descriptions. Describe it as **"online advertising space"**, never "leaderboard game", "bidding game" or "rewards platform" |
| Later | If a PG classifies you as gaming/high-risk, don't argue on email — take the board back to UPI-only and reapply under a clearer description | Cheaper than a rolling reserve |

**Never accept** crypto, gift cards, cash by courier, "pay my personal wallet", or a third party paying on a
bidder's behalf without saying who they are. Every one of those is how a clean little ad business acquires an AML
problem it never wanted. (See `09`.)

## 4. Domain, hosting, email (the technical stack is also a legal asset)

- **Registrar:** Cloudflare/Namecheap/Porkbun; 2FA on, registrar lock on, auto-renew on, WHOIS privacy on.
- **WHOIS in your name** — PGs and banks check it, and bidders who suspect a scam look it up.
- **Hosting:** static on Cloudflare Pages (no server, no database ⇒ almost nothing to secure, see `05` and `02` §5).
  Add security headers, force HTTPS, and keep a `410` route for withdrawn rows (a *deleted* row that 404s forever
  looks like a bug; a 410 says "removed").
- **Email on the domain** (`hello@`, `abuse@` can be aliases of the same inbox): SPF + DKIM + DMARC in 10 minutes.
  A reply address on your own domain is what makes a ₹2,000 invoice feel like a business.
- **Monitoring:** free uptime pinger on the board URL + an alert. "The board was down for 3 days and my row
  wasn't visible" is a refund case you can prevent.
- **Backups:** private git repo for code, monthly export of the ledger, and a dated full-page screenshot of the
  board — that screenshot series is *evidence*, and it costs nothing.

## 5. Trademark (file it yourself in week 1; it is not a launch blocker)

| Step | Detail |
| --- | --- |
| Search first | IP India public search, classes **35** (advertising/business management), **41** (providing online publications / entertainment-adjacent), **42** (SaaS/platform) — check each; also Google the exact name + "app" and check MCA name availability |
| File | Form **TM-O** online at ipindia.gov.in. **₹4,500 per class for an individual or a DPIIT-recognised startup**; ₹9,000 otherwise. You get a diary number in days |
| What you hold now | Priority date from filing, and the right to use **™**. Save the application receipt — this is what you show an investor, a marketplace, or a copycat |
| Timeline | examination + advertisement + opposition: registration normally 12–24 months. Use ™ the whole way; **® only after the certificate** |
| If the name is taken | Rename now, not later. The product is 90% the name; a name you can't own is a name you'll have to abandon mid-traction |

## 6. Optional, cheap, worth it

| Item | Cost | Why |
| --- | --- | --- |
| Udyam / MSME | free | Bank proof + interest on delayed payments from corporate buyers |
| Shops & Establishments (state portal) | free–₹1k | Some states expect it even for a home office |
| Professional tax | state-dependent | Only with employees (and in a few states for proprietors) |
| Contract with any freelancer you pay | ₹0 | One page: scope, one-time fee, **IP in the deliverable assigned to you**, confidentiality, no TDS below the 194C/194J limits (and the truth is you may still owe it — see `06` §1) |
| Cyber insurance | ₹6–15k/yr | Skip at Level 0. Buy it when a buyer starts asking for an SLA |

## 7. If a bidder is outside India

Invoice in the currency you were paid in **plus** the INR equivalent at the invoice-date rate; take payment through
normal banking channels; ask the bank for an **FIRC/advice** for each foreign receipt and file it with the invoice;
use the purpose code the bank gives for export of services (they'll prompt you). Keep an eye on the FEMA realisation
window for exports (historically ~15 months from invoice date — confirm the current master direction when the first
one arrives). No cash, no third-party payer, no crypto. If foreign money becomes normal (say, >20% of revenue),
that's the point to have the CA look at registration + LUT, not before.

---

**Sign-off:** bank account live `____`, PG KYC submitted `____`, TM filed `____` (application no. ________),
WHOIS = you, SPF/DKIM/DMARC passing on `____`.

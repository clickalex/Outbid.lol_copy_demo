# 08 · Ops SOP + the pre-launch gate

Two things: a gate you must pass **before** you take money, and the routines that keep the business boring after.

---

## Part A — Pre-launch gate (go/no-go; every box is a yes or you don't launch)

**Legal surface (all four must be live on the site)**
- [ ] Terms of Service at `/legal#terms`, linked in the footer **and** ticked on the order form (a bare "I agree"
      with nothing to agree to is worthless to a bank and to you).
- [ ] Privacy notice at `/legal#privacy`, itemised, with the retention table.
- [ ] Refund policy at `/legal#refunds`, with the same window the order form promises.
- [ ] Disclosure block next to the board (`05` Part D) + the `Sponsored` label on row #1 +
      `rel="sponsored nofollow"` on the link. Check it in the deployed page, not in the editor.

**Money surface**
- [ ] Ledger sheet exists with numbering reserved (`BR-2026-0001`) and the GST-trigger tab.
- [ ] UPI VPA tested with a ₹1 self-payment and a matched reference format agreed.
- [ ] Invoice template ready; you can produce a PDF in 3 minutes.
- [ ] Current account open or application submitted; no business money into personal savings.

**Screening surface**
- [ ] `04` Part A (refusals) and Part B (10 checks) printed or open in a tab, and the "screenshot of the page as
      listed" folder created.
- [ ] `09` read — the do-not-add list is pinned where you'll see it when someone suggests a feature.

**Failure surface (the bit everyone skips)**
- [ ] A real phone number or email that you will answer within 72h, published.
- [ ] "What happens if the board must close" — you can write the 30-day notice from Terms 10.1 in 10 minutes
      because the advertiser list lives in the ledger, not in your head.
- [ ] Rollback: previous `data.js` kept, so a bad deploy is a 2-minute restore rather than an apology.

**Do not launch if:** a policy page is missing, a row can go live without the Sponsored label, or you intend to
"add the refund policy next week". All three have a way of becoming the story in a complaint.

## Part B — Daily (15 minutes, same time every day)

1. Payment check: bank/UPI statement vs pending order-form submissions. Matched → publish or refund; unmatched →
   one email asking for the reference, then close it in 7 days.
2. Deploy, then look at the live board on your **phone**: row #1, the label, the link, the form. (The nav you just
   fixed is part of the product — if the menu is broken on a phone, so is the checkout.)
3. Screenshot the board into the dated folder. Link-health spot check on 5 rows.
4. Answer everything. Refund requests first, always, same day.

## Part C — Weekly (30 min, fixed day)

- Refit pricing against reality: any bid below the floor that you bent for a friend is now the price everyone
  expects. If you want to discount, change the floor for the next 10 bidders, in the open.
- Check disclosure on all rows + `rel` attributes still present after any template edit.
- Update the reference list: `python3 launch/build_data.py` (the bot keeps the CSV fresh) → deploy.
- Look at the ledger: cumulative turnover vs the ₹18 lakh line; refund rate vs the <10% bar; repeat bidders.
- Pick 5 board operators not yet listed and send personalised notes with the pre-filled bid link. **Five a week,
  not 50 in a day** — the 50-in-a-day version is what gets a domain flagged as spam.

## Part D — Monthly / quarterly / year-end

| Cadence | Do |
| --- | --- |
| Monthly | Ledger reconciled to the bank statement line by line; backups verified (open one file, don't trust the folder); invoice numbers still gapless |
| Quarterly | Advance-tax instalment if liability ≥ ₹10k; restore test of one backup; re-read `09` (temptation grows with revenue) |
| 30 days after launch | The review in Part F |
| Year-end | Books closed; ITR filed (ITR-4 presumptive or ITR-3 with the CA, per `06`); refund register archived with the ledger |

## Part E — Complaint, dispute and notice handling

**Complaint register** (third tab of the ledger): date · who · what they want · the row's invoice no · your
decision · the day you sent it · whether you honoured it. Nothing goes in your head.

Escalation ladder, in this order, always: acknowledge (72h) → facts from the ledger → fix or refuse in writing →
record the outcome. If a bidder threatens a consumer-forum complaint: reply once, in writing, with the invoice,
the dated screenshot and the policy line you're applying; offer a pro-rata refund if any part was undelivered;
stop. Refund-rate discipline is cheaper than any forum.

**If you receive a legal notice or a bank/PG query** — the first-72-hours playbook: (1) don't reply substantively
the same day; (2) pull the row's full file — form data, screening results, payment reference, dated screenshots,
policy version live at the time; (3) preserve everything (no deletions, ever, not even a bad tweet); (4) if it's a
legal claim, take the objected row down *first* and say why in writing; (5) engage the CA for tax notices and a
lawyer for everything else — ₹10–25k for a reply draft is proportionate at any size you'll reach this year.

## Part F — The 30-day review (this is the whole point of the pack)

| Metric | Continue | Change the niche | Kill |
| --- | --- | --- | --- |
| Paid bidders, week 1 | ≥ 10 | 3–9 | ≤ 2 |
| Gross, week 1 | ≥ ₹8,000 (~$100) | ₹2–8k | < ₹2,000 |
| Refund rate | < 10% | 10–25% | > 25% |
| Repeat / outbid activity by day 30 | someone outbid someone unprompted | nobody outbids anyone | board never left 1 row |
| Your own energy at day 30 | looking forward to the DMs | neutral | dreading it |

- **Change the niche** = same code, same policies; `CONFIG.brand`, categories, tagline, and the pitch only
  (`01`–`05` need a 20-minute read-through for wording that no longer fits).
- **Kill, cleanly:** honour published rows for any paid period, refund anything undelivered, post a 30-day closure
  notice on the board and in the changelog, take payment links down, stop selling, keep books for 8 years, delete
  the emails you no longer need per `02`, and release the domain rather than renew it. A clean shutdown with a
  refund register is a reputation you launch the *next* idea with.

---

**Sign-off:** gate passed on `____` at `____` (time) by `______________`. Next gate review: day 30.

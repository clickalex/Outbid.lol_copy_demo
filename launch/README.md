# BidRanks.lol — a launchable board in a box

This is the **product**, not another report page. It is deliberately outside the research site's navigation
(`index.html` / `ideas.html` / the tools) because it deploys on its own domain. The only link to it from the
report site is one card on `tools.html`, so nothing here is an orphan page.

**Nothing on this page needs a server, a database, a login or a payment integration to work.** Paid slots are a
JSON file. That is what makes "today" possible. The page is also fully self-contained (its responsive nav lives
in the file itself, not in `../assets/`), so dragging the folder onto a host is the entire deployment.

---

## Why this niche (it is not a guess)

From `data/outbid-market-inventory.csv`, refreshed today by the daily bot (449 verified boards):

| Category | Boards | Median self-reported total | Share above $100 |
| --- | --- | --- | --- |
| **Directories of bid sites** | 12 | **$111.50** | **50.0%** |
| Regional & other currencies | 18 | $25.95 | 31.2% |
| AI tools & agents | 30 | $24.00 | 22.2% |
| Websites & products | 249 | $23.60 | 21.3% |
| Crypto & tokens | 27 | $6.00 | 0.0% |
| Whole market | 449 | $18.90 | 18.2% |

"Directories of bid sites" is the highest-median category in the entire market, has only a dozen players, and it is
the only niche where **every customer is already a pay-to-rank operator**: they understand the product in one
sentence, they have a card/UPI rail and a budget line for ranking, and their contact details are public. You do not
have to build an audience before you can sell. That is the whole reason to pick it if speed is the goal.

Smallest possible scope, on purpose: one page, four rules, one price floor, manual activation.

---

## Files

| File | What it is |
| --- | --- |
| `index.html` | The entire site: board, entry form, rules, reference list, owner console. Config is at the top of the `<script>`. |
| `data.js` | Generated. Holds the paid slots + the free reference list. **Do not hand-edit.** |
| `entries.json` | **The product.** Your paid slots. This is the only file you edit day to day. |
| `build_data.py` | Regenerates `data.js` from `entries.json` + the market inventory. Run it before every deploy. |
| `legal.html` | **The public policy page** — Terms, privacy notice, refund policy, disclosure spec. Linked from the footer and the order form. Fill its 6 placeholders before you deploy. |
| `entries.sample.json` | A worked example: three paid slots, so you can see the ranking and outbid maths working. |


```
entries.json  ──┐
                ├─► python3 launch/build_data.py ─► data.js ─► index.html
inventory.csv ──┘
```

---

## Ship checklist — one evening

1. **Claim the name.** Search the [IP India registry](https://iprsearch.ipindia.gov.in/tmrpublicsearch/frmmain.aspx)
   (classes 35/41/42) and just Google it. Buy `bidranks.lol` plus two fallbacks — a `.lol` domain is ~₹1,000–1,500/yr
   and registers in minutes with 2FA + registrar lock on. If the name is contested, change `CONFIG.brand` in
   `index.html` (line 3 of the config block) and the footer/`<title>`. Nothing else is name-dependent.
2. **Publish the policies.** Open `legal.html` and replace the 6 values listed in the comment at its top (brand, domain, contact email, jurisdiction city, effective date ×2). It is the public Terms + Privacy + Refunds + Disclosure page, already linked from this board's footer and from the order form's acceptance tick — a checkbox is worth nothing to a payment processor if there is nothing to click through to. Source of truth for edits: `../docs/level0-launch-pack/`.
3. **Fill in `CONFIG`** in `index.html`:
   `pay.upi` (your VPA), `payee`, `contact`, and optionally `pay.stripeLink` (a Stripe **Payment Link** — no code,
   10 minutes, live once Stripe's KYC clears; the page works fine with UPI-only until then).
4. **Publish:** drag this `launch/` folder onto [dash.cloudflare.com → Pages](https://pages.new) (or
   `npx wrangler pages deploy launch`). You get `https://<project>.pages.dev` in ~30 seconds, no build step.
5. **Point the domain** at it (Cloudflare → Custom domains). Check `data.js` loads, the empty board renders, and
   the entry form emails you. Done — you are live.
6. **Then** open a current account in your business name and submit payment-processor KYC, so card checkout arrives
   in the next few days while you are already taking UPI payments by hand.

Before each deploy: `python3 launch/build_data.py`. The daily bot already keeps `../data/outbid-market-inventory.csv`
fresh, so the reference list stays current for free.

---

## Taking money (the actual mechanic, no code required)

Bidder fills the form → the page computes the minimum valid bid, shows your UPI ID / payment link and prints a ready-made
`entries.json` block → they email it with the payment reference.

1. Match the amount against the current top total (top + 10%).
2. Check the site is live, owns its link, and passes screening (below).
3. Paste the block into `entries.json`, run `build_data.py`, redeploy (≈90 seconds).
4. Reply with the live link. Log it in a spreadsheet: date, site, amount, rail, reference, category.

The **owner console** at the bottom of the page (`Show / hide console`) shows the published slots and the pending
draft held in the browser, with a "Copy entries.json" button — that is the whole CMS.

### Pricing so the maths works

- Floor **$25**, increment **max(10%, $5)**. Never let a bid sit under $5: at $1 a card rail (2.9% + $0.30) keeps
  ~$0.68 and your labour is the loss (see `fees.html`).
- Manual UPI (1.0% + ~₹0) is the right rail on day 1; card via Payment Link from week 1 for foreign bidders.
- Add a **"Top of week"** slot at $10 **only after** all-time #1 has sold at least twice — two products confuse
  bidders, and you want one price to defend.

---

## Day-1 legal posture (India, level 0 — mirrors `docs/blogrank-india-legal-compliance.md` §14.1)

Not legal advice; this is the fast lane your own memo already signed off on for a **no-rewards paid-listings** site:

- **Trade as a sole proprietor** — PAN + a bank account is a valid business. Incorporate later if revenue justifies it.
- **No GST registration needed** while annual turnover ≤ ₹20 lakh for services, including inter-state and export of
  service (Notification 10/2017-IT). Issue plain invoices; register within 30 days of crossing the line. Track
  turnover monthly from invoice #1.
- **Every paid row is labelled "Sponsored"** and carries `rel="nofollow sponsored"` (already in the markup) —
  this is the ASCI / Consumer Protection (Guidelines for Online Paid Advertising) duty and it is not optional.
- **Screen advertisers**: reject betting / real-money gaming, crypto-&-forex "returns", investment advice, adult,
  weapons, medical claims, impersonating clones. Advertising banned money games is an offence in its own right.
- **No viewer money, ever, at this level**: no deposits, no balances, no wallet, no tokens, no redeemable points,
  no "watch to earn" — those three are on your own do-not-build list and each one converts an ad platform into a
  regulated money game.
- **Refunds per the published 7-day policy**, honour them fast and without argument; refuse chargebacks rather than
  fight them.
- **Publish the contact/grievance address** (`CONFIG.contact`) and answer within 72h. Privacy notice is on the page;
  keep it true (you store email + payment reference + the published row, nothing else).

Defer, do not skip: Pvt Ltd, TM registration (file the application in week 1–2), counsel opinion *before* adding any
reward/coupon mechanic.

---

## Re-pointing this kit at BlogRank (or any other board)

Nothing in here is tied to the "board of boards" niche. To launch **BlogRank — pay to rank, watch to earn**
with the same code, the edits are:

1. `CONFIG.brand` → `"BlogRank.in"`, `CONFIG.tagline`/`CONFIG.subject` → blog-promotion wording, `CONFIG.contact`.
   The `<title>`, header, footer and the empty-board pitch all read from those three fields.
2. The category `<select>` in the entry form: swap to blog verticals (tech, personal finance, design, food,
   dev, indie gaming, parenting, travel).
3. The free reference table (`data.js`) can stay — it is a real market table and it is what makes the page
   look alive on day 1. Re-run `build_data.py` any time.
4. **Do not turn on "watch to earn" at launch.** Ship creator-side only (Level 0), exactly as this kit does.

### The reward side is a separate launch, not a feature

Per `docs/blogrank-india-legal-compliance.md`, the earning half is what multiplies the stack. Climb it in order:

| Stage | What ships | What you take on | Ballpark lead time |
| --- | --- | --- | --- |
| **Level 0** | paid ranking slots for blogs, no viewer rewards | entity + invoices + *Sponsored* labels + ad screening | **same evening** |
| **Level 1** | third-party coupons/credits, capped **< ₹10,000 per user per FY** | T&C for the reward, fraud/clawback rules, 18+ gate, PAN capture as users approach the cap | ~1–2 weeks |
| **Level 2** | cash payouts | payout provider + penny-drop, TDS engine (s.194B, 30% over ₹10k, Forms 26Q/16A), monthly deposit calendar, AML-lite screening | ~4–6 weeks + counsel opinion (₹25–75k) |

Skipping straight to Level 2 is the single most common way a project like this dies: it puts a payroll-shaped
money loop behind a page you have not yet sold. Sell Level 0 first — if 10 bloggers won't pay ₹1,500–2,000 to be
ranked, no viewer-reward mechanic rescues it, and you'd rather find that out with zero TDS liability.

Three hard red lines for the earning side (they are in your doc's do-not-build list, and they also kill your
banking rails): **viewers never pay or stake anything**, **no wallet balance redeemable in money**, **no
self-issued BlogRank coin**. Keep those and BlogRank stays "an ad platform that pays prizes", not a money game.

---

## Getting paid bidders (this is the whole marketing plan)

**20 personal DMs before any public launch post.** Every prospect is already in `data/outbid-market-inventory.csv`
with a URL and a tagline. Copy the pre-filled link mechanic — a bidder who clicks with the numbers already computed
converts far better than one who has to work it out:

```
https://bidranks.lol/#enter?name=<site>&url=https://<host>&amount=<top+10%>&category=...
```

Template — short, honest about being a pay-to-rank board, because that's the joke and the pitch:

> You run a pay-to-rank board, so you already know how this works. I'm building **BidRanks.lol** — a board of boards:
> the one page where the 449 pay-to-rank sites rank against each other. #1 right now is **empty**, and it is $25.
> Not because I can't sell it, because the board is 2 days old. Whoever holds it is the only name on the page every
> person in this niche will check. → https://bidranks.lol/#enter?name=…&amount=25
> No, I won't let you pay to look better on other platforms. Yes, everything here is labelled sponsored.

Post publicly **only after 3 paid rows exist** — an empty board is the one screenshot that kills this format. Then:
X, Hacker News "Show HN", r/EntrepreneurRideAlong, Indie Hackers, and the newsletter/Discord/Telegram groups where
board operators already talk. The meta-humour of a directory *of* directories is the shareable part; lean on it.

---

## Week-one rule

Your metric is **paid bidders, not pageviews**. Per `build-plan.html`: **continue only at 10 bidders or $100 gross in
week one.** Otherwise change the niche (same code, `CONFIG` + categories in 20 minutes) or stop. If week two is
quieter than week one, stop and move on — don't automate a dead board.

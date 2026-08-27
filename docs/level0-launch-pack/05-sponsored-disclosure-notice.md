# 05 · Paid-placement disclosure notice

**Status:** public, and the label spec is binding on you. **Placeholders:** `[BRAND]` `[DOMAIN]`.
This is the shortest file in the pack and the only one with no version of "we'll add it later" — the disclosure
duty (Consumer Protection Act 2019's misleading-advertisement and unfair-trade-practice provisions, the seller
duties under the Consumer Protection (E-Commerce) Rules 2020, and ASCI's requirement that advertising be clearly
distinguishable as advertising) is the reason a pay-to-rank site is legal at all. Skip it and you have converted a
lawful ad business into a deceptive-practice case with extra steps.

---

## Part A — What the visitor must be able to see

1. **Every** row sold for money carries the label, adjacent to the site name, no wider than one line of
   separation: **`Sponsored — this position was paid for`**. On the row you can see without scrolling. Not in a
   tooltip, not only in the footer, not in 8px type.
2. The label's type size is ≥ 80% of the row's own body text and it is not muted to the point of invisibility.
3. Rows that are **not** paid (your reference table, your own editorial list, seed data) are labelled the other way
   too: **`Not a paid placement`**. Mixing paid and unpaid rows without saying which is which is the single most
   common way boards like this get accused of astroturfing.
4. Ranking basis is stated next to the board: **"Sorted by amount paid, highest first. Not by quality,
   popularity or merit."**
5. Totals shown are the amounts actually paid to us, drawn from the payment record — never rounded up for looks,
   never "estimated", never copied from someone's self-report into a paid-slot column. If you reprint
   self-reported figures from another directory's data, that column is labelled **self-reported** and sourced.
6. No fabricated social proof: no made-up bidder counts, no countdown timers unless a timer reflects a real rule
   you also publish, no "3 slots left" when there are 10 and nobody's bought one.

## Part B — Machine-readable (30 seconds per deploy, and it protects you with the hosts)

```html
<!-- each paid row -->
<tr class="listing is-sponsored">
  <td>…</td>
  <td><a href="https://advertiser.example" rel="sponsored nofollow ugc noopener" target="_blank">Name</a></td>
  …
</tr>
```

- `rel="sponsored nofollow"` on every outbound link in a paid row — Google's own requirement for paid links; it
  also matches what you promised in Terms 1.2 (no SEO equity sold).
- Mark the section with a heading and a visible statement (`Part A #4`) rather than hiding it in `<footer>`.
- `sitemap.xml`: exclude the outbound link destinations, obviously; include `/legal`.
- `robots.txt`: don't disallow `/legal` — the page a lawyer or a bank asks for must be fetchable.

## Part C — What the sales copy is allowed to say

| ✅ Say | ❌ Never say |
| --- | --- |
| "A live, public board that 449 operators are ranked on" | "Rank #1 on Google" |
| "Your row gets `rel=sponsored`; we sell visibility, not link equity" | "Dofollow backlink, high DA, passes authority" |
| "Every position is bought — we don't pretend otherwise" | "Editor's pick", "top rated", "featured by our team" |
| "Refunds per the published policy" | "Risk-free", "guaranteed traffic", "30-day money back, no questions" (unless you will actually honour that phrasing) |
| "The board refreshes daily; totals come from payments made to us" | "Live bidding from 400 sites" when 3 have ever paid |

**Rule of thumb for every tweet, DM and landing line:** could a bidder's disappointed customer point at this
sentence and say *"that promised me something you didn't deliver"*? If yes, rewrite it. That single habit is worth
more than any clause in `01`.

## Part D — The notice text (public page, ~4 lines, put it next to the board)

> **How this board works — no disguise.** Every row on it was bought. The order is decided only by how much was
> paid, highest first; nothing here is an endorsement, a review or a ranking of quality. Unpaid rows in the
> reference section are marked as such and their figures are self-reported by those sites. Paid links carry
> `rel="sponsored nofollow"`, which means we are selling you visibility on this page and nothing else — not search
> rankings, not traffic, not "authority". If a wording on this site reads like a promise of results, that is a bug:
> mail `[CONTACT]` and we'll fix the sentence the same day.

---

**Sign-off:** label appears on row #1 as it goes live (not "in the next iteration"). Check it once per deploy —
`08` §weekly has the tick.

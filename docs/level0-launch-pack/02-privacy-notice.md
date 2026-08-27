# 02 · Privacy notice (DPDP-shaped)

**Status:** public. **Placeholders:** `[BRAND]` `[DOMAIN]` `[CONTACT]` `[EFFECTIVE-DATE]` `[HOSTING-REGION]`.
Written to satisfy the consent-notice and rights requirements of the DPDP Act 2023 as operationalised by the DPDP
Rules 2025 — whose notice, consent, security and breach provisions come into force **14 May 2027**, with
complaints to the Data Protection Board already live since Nov 2025. Being compliant at launch costs you one
page; retrofitting costs you a project.

---

## [BRAND] Privacy Notice

We are the Data Fiduciary for the small amount of personal data on this site. No trackers, no advertising
pixels, no cookies for behavioural monitoring, no newsletter unless you ask. Here is the entire list.

### 1. What we collect, why, and for how long

| # | Data | When collected | Purpose (the only purposes) | Basis | Retention |
| --- | --- | --- | --- | --- | --- |
| 1 | Site name, URL, one-line description, category | order form | To build and publish your listing row | Consent (affirmative tick on the form) | While the row exists; deleted from our records 30 days after removal |
| 2 | Reply-to email address | order form | To confirm payment, publish, answer you, and handle refunds | Consent | 8 years (accounting evidence) — see 4.2 |
| 3 | Payment reference / UPI or transaction id, amount, date | your submission + bank advice | To match money to a slot and to keep books | Contract + statutory record-keeping | 8 years (Income-tax Act record keeping) |
| 4 | Published "total paid" figure for your row | derived from 3 | The ranking is only credible if the totals are public. You are told this before you pay | Consent (you choose the bid) | As long as the row exists |
| 5 | Server/CDN logs: IP address, user-agent, timestamp, requested path, HTTP status | every visitor, automatically | Security, abuse limiting, uptime. Not used to build profiles, not joined to #1–#4 | Legitimate interest (security) | As configured by the host — typically hours to 30 days; we do not extend it |
| 6 | Complaint or takedown correspondence | when you write to us | To resolve it and, if needed, to defend a legal claim | Legal obligation / legitimate interest | 8 years if it concerns money or a legal claim, otherwise 3 years |

**What we do not do:** we do not use cookies for tracking, do not run third-party advertising scripts, do not
buy or sell lists, do not build profiles of visitors, do not process special categories of data, do not knowingly
collect anyone's data under the age of 18 (the site is a business-to-business advertising service), and we have
no login, so there is no password to lose.

**Analytics:** none at launch. If we ever add a privacy-friendly counter, we will update this notice first and it
will stay cookie-free and cross-site-unlinkable.

### 2. Who we share it with (the complete list of processors)

| Recipient | What they see | Why |
| --- | --- | --- |
| Cloudflare Pages (hosting) | the published pages, and standard request logs | serving the site, `[HOSTING-REGION]` |
| Your payment instrument (UPI handle / card processor) | amount, our payee details, your payment reference — they have their own relationship with you | collecting payment |
| Our bank | the payment | settlement |
| Our CA / accounting tools | #2–#4 | books and returns |
| Law enforcement or a court, on a valid order | whatever the order requires, and we will tell you unless legally barred | legal obligation |

No data broker, no ad network, no "analytics partner", no "marketing platform". We have a written instruction with
each processor where one is available to us and we disclose any new one here before we use it.

### 3. Where data lives

Site and logs: `[HOSTING-REGION]` via our host. Our own records: a password-managed laptop plus an encrypted
backup in `[HOSTING-REGION]`. Cross-border transfer happens only where a foreign Advertiser's own bank or card
network is involved — that transfer is theirs, on their relationship, not ours.

### 4. Your rights, and how to use them

Under the DPDP Act you (a "Data Principal") may, by emailing **`[CONTACT]`** from any address, and free of
charge:

1. **Access** — ask what we hold about you and get a copy;
2. **Correct and complete** — fix an error;
3. **Erase** — ask us to delete data whose stated purpose is over;
4. **Grieve** — complain to us first, then to the Data Protection Board;
5. **Nominate** — name someone to exercise these rights if you die or are incapacitated.

**How we handle it:** we verify you by asking for a detail only the record holder would know (payment reference,
or the listing text), then act. We respond **within 30 days** for access, correction and erasure requests —
comfortably inside the outer limit the Rules set — and we tell you if we cannot, and why. Erasure requests are
honoured except for the narrow statutory records in row 3 of the table; we will say exactly which records survive
and for how long. If you ask us to remove your published row outside a refund case, we do it within 3 business
days; the price paid is not refunded for a voluntary takedown of a row you bought (clause 6 of the Terms).

**Grievance redressal:** we aim to resolve within 72 hours on business days and in no case later than the
statutory maximum. If we fail you, the Data Protection Board accepts complaints; we will give you the current
portal link on request rather than hide behind "contact us".

### 5. Security (what "reasonable safeguards" means at this size)

Admin access to hosting and the git repository is behind an authenticator app, not SMS alone; disk is encrypted;
backups are encrypted and we test one restore per quarter; the site has no database, no user-uploaded files and
no admin login, which removes most of the attack surface at once; the only secrets are API tokens in a password
manager, rotated when anyone leaves; we edit listings from a device with full-disk encryption and screen lock.

### 6. If something goes wrong

We will investigate within 24 hours of becoming aware, contain it, and where a personal-data breach is likely to
affect you, intimate the Data Protection Board and the affected people without undue delay, with the written
details the Rules require — what leaked, which rows of the table above, what we did, what you should do. We will
not wait for the deadline to start.

### 7. Children

This is a paid business-advertising service and is not directed at anyone under 18. If we learn a child's data
entered our records, we delete it.

### 8. Changes

Any change to this notice is posted here with a new "last updated" date, and material changes are emailed to
current Advertisers. We will not collect a new category of data without putting it in the table first.

---

**Sign-off:** notice published on `[DOMAIN]/legal#privacy` on `____`. One CA/lawyer pass before 14 May 2027 if the
site has grown enough to matter.

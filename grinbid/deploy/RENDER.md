# 🎪 Grinbid — deployed on Render (free)

Grinbid is **live at <https://grinbid-8h5e.onrender.com>**, running on Render's
free plan: no build step, no dependencies, no card required. This guide covers
how the deployment works and how to deploy your own copy.

Render is the easiest way to put Grinbid online — everything below is just
clicking, and it works from a phone browser.

---

## Current deployment

| Setting | Value |
|---|---|
| URL | <https://grinbid-8h5e.onrender.com> |
| Plan | Free |
| Region | Frankfurt |
| Runtime | Node 22 |
| Root directory | `grinbid` (nested inside the `Outbid.lol_copy_demo` repo) |
| Build command | `npm install` *(no-op — zero dependencies)* |
| Start command | `node server.js` |
| Health check | `/api/health` |
| Auto-deploy | On — pushes to `grinbid/**` redeploy the service |

A fresh deployment boots with **an empty board** — no pre-made pages, no
sample users, no bot-generated activity. Every fan page is created by a
real fan and approved before it goes live; the leaderboard fills up from
real players.

---

## Deploy your own copy — one click

> ⚠️ `render.yaml` must be on the repo's **default branch** (`main`) for the
> button to pick it up.

1. Open **<https://render.com/deploy?repo=https://github.com/clickalex/Outbid.lol_copy_demo>**
   (or <https://render.com/deploy?repo=https://github.com/Kyabtao/grinbid> for
   the standalone Grinbid repo).
2. Sign in with GitHub → Render shows the **grinbid** blueprint:
   free web service, Node 22, auto-generated `ADMIN_PASSWORD` and
   `SESSION_SECRET`, health check on `/api/health`.
3. Click **Apply**. After ~1 minute you get a live URL like
   `https://grinbid.onrender.com`. Done. 🎉

To reveal the generated admin password later:
Render dashboard → grinbid → **Environment**.

---

## Manual setup (if the button is unavailable)

1. `render.com` → **Get Started for Free** (GitHub login).
2. Dashboard → **New → Web Service** → connect the repo.
3. Fill in:

   | Setting | Value |
   |---|---|
   | Name | `grinbid` |
   | Region | any (Frankfurt/Singapore = closer to India) |
   | Branch | your deploy branch |
   | Root directory | `grinbid` (only when deploying from the Outbid repo) |
   | Runtime | **Node** |
   | Build Command | `npm install` *(no-op — zero dependencies)* |
   | Start Command | `node server.js` |
   | Plan Type | **Free** |

4. **Advanced → Add Environment Variable**:

   | Key | Value |
   |---|---|
   | `NODE_VERSION` | `22` |
   | `ADMIN_PASSWORD` | pick a strong password for `/api/admin` |
   | `SESSION_SECRET` | any long random string *(keeps logins across redeploys)* |

5. **Create Web Service**. Watch the logs until you see
   `🎪 Grinbid — Bid. Back. Rank up.` — your URL is at the top of the page.

---

## Why Grinbid just works on Render

- Listens on `$PORT` (Render injects it) and binds `0.0.0.0`.
- Zero npm dependencies — nothing to break in the build.
- Graceful shutdown: `SIGTERM` (sent on every redeploy) flushes `data/db.json`.
- `/api/health` health check, relative URLs everywhere, SSE auto-reconnects.

## Good to know (free-plan notes)

- **Ephemeral disk**: `data/db.json` is reset on every **redeploy / restart**;
  the app re-seeds an empty database on boot (no pages, no users — fans create every page).
  If you want data to survive redeploys, upgrade the plan and attach a disk,
  then set `DATA_DIR=/opt/render/user/disk/data`.
- **Spin-down**: free instances sleep after ~15 min idle; the first request
  after a nap takes a few seconds to wake (SSE clients reconnect automatically).
- **Admin access (two ways):**
  1. **Founder account (recommended):** just sign up with username
     **`alexami`** — that account automatically has full admin powers, no
     password needed. The admin panel appears in the nav once you log in as
     that user. (Configured by the `ADMIN_USERNAMES` env var; comma-separate
     more usernames to give others admin access.)
  2. **Admin password:** a separate password for the `/admin` console. To see
     or set it: Render dashboard → your service → **Environment** →
     `ADMIN_PASSWORD` (the blueprint auto-generates one; you can replace it).
  **Security:** the admin page isn't linked anywhere for regular fans — the
  URL is invisible, and non-admins who visit it just see a "nothing here"
  page (no password prompt to hint at it).
- **Moderation:** every fan page a user creates starts as **pending** — it's
  invisible to the public until you approve it from the admin panel's
  "Fan pages awaiting approval" queue. The creator's email is shown there
  (and a `mailto:` link) so you can mail them when their page goes up or
  needs changes.
- **Logs**: Dashboard → grinbid → **Logs** shows live stdout (boot banner,
  rate-limit hits, season settlements).

## Updating the live app

Push to the connected branch → Render **auto-deploys** (the blueprint sets
`autoDeploy: true`, limited to `grinbid/**` changes for the Outbid repo). For
manual services, flip on *Auto-Deploy* in Settings.

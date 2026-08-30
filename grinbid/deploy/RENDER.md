# 🎪 Grinbid — deploy to Render (free) for a demo

Render is the easiest way to put Grinbid online: **no build step, no
dependencies, no card required** for the free plan. This works fine from a
phone browser too — everything below is just clicking.

---

## Option A — One-click deploy (recommended)

> ⚠️ `render.yaml` must be on the repo's **default branch** (`main`) for the
> button to pick it up. Once your branch is merged:

1. Open **<https://render.com/deploy?repo=https://github.com/Kyabtao/grinbid>**
2. Sign in with GitHub → Render shows the **grinbid** blueprint:
   free web service, Node 22, auto-generated `ADMIN_PASSWORD` and
   `SESSION_SECRET`, health check on `/api/health`.
3. Click **Apply**. After ~1 minute you get a live URL like
   `https://grinbid.onrender.com`. Done. 🎉

To reveal the generated admin password later:
Render dashboard → grinbid → **Environment**.

---

## Option B — Manual setup (if you prefer, or the button is unavailable)

1. `render.com` → **Get Started for Free** (GitHub login).
2. Dashboard → **New → Web Service** → connect the `Kyabtao/grinbid` repo.
3. Fill in:

   | Setting | Value |
   |---|---|
   | Name | `grinbid` |
   | Region | any (Frankfurt/Singapore = closer to India) |
   | Branch | `main` (or your demo branch) |
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

## Option C — Deploy from the Outbid repo (nested `grinbid/` folder)

If you're pushing this from `Outbid.lol_copy_demo` (the report repo that now
contains `grinbid/`), use the **root `render.yaml`** already committed there:

1. Push the branch to GitHub.
2. Open <https://render.com/deploy?repo=https://github.com/clickalex/Outbid.lol_copy_demo>.
3. Render reads the root `render.yaml`: web service **grinbid**, **free plan**,
   `rootDir: grinbid`, `npm install` (no-op), `node server.js`, `/api/health`.
4. Apply and you get `https://grinbid.onrender.com`.

The only difference from Options A/B is `rootDir: grinbid` so Render builds the
app from the subfolder instead of the report repo root. Everything else is
identical (Node 22, free plan, generated admin password / session secret).

---

## Why Grinbid just works on Render

- Listens on `$PORT` (Render injects it) and binds `0.0.0.0`.
- Zero npm dependencies — nothing to break in the build.
- Graceful shutdown: `SIGTERM` (sent on every redeploy) flushes `data/db.json`.
- `/api/health` health check, relative URLs everywhere, SSE auto-reconnects.

## Good to know (free-plan demo caveats)

- **Ephemeral disk**: `data/db.json` is reset on every **redeploy / restart**.
  Perfectly fine for a demo; the app re-seeds itself on boot. If you want
  persistence, upgrade the plan and attach a disk, then set
  `DATA_DIR=/opt/render/user/disk/data`.
- **Spin-down**: free instances sleep after ~15 min idle; the first request
  after a nap takes a few seconds (and SSE clients reconnect automatically).
- **Admin console**: lives at `/api/admin` — use the `ADMIN_PASSWORD` from
  the Environment tab. Never leave it as `grinbid-admin-dev`.
- **Logs**: Dashboard → grinbid → **Logs** shows live stdout (boot banner,
  rate-limit hits, season settlements).

## Updating the demo

Push to the connected branch → Render **auto-deploys** (the blueprint sets
`autoDeploy: true`). For manual services, flip on *Auto-Deploy* in Settings.

# Grinbid — mobile-friendly Oracle Cloud Always Free walkthrough
#
> This guide assumes you're doing everything from your phone.
> What you need: Chrome (Android/iOS), the free **Termius** app (SSH client),
> and optionally the **OCI Mobile** app (monitoring only — not the full console).

---

## 0. Reality check

- The **OCI Mobile app can only monitor + start/stop/restart/delete** resources.
  It is *not* the full console, so the real setup happens in **Chrome** with
  "Request desktop site" enabled (three-dot menu). It's cramped but works.
- Oracle's full console officially targets desktop browsers; on mobile expect
  tiny menus and sideways scrolling, not a broken experience.
- Signup **requires a credit/debit card for identity verification only** —
  nothing is charged for Always Free resources. In India, a **Visa/Mastercard
  debit card with international payments enabled** usually works; card billing
  address must match your signup address. Expect a ~₹100 temporary hold that
  the bank releases in 3–5 days. Virtual/prepaid/PIN-only cards are usually
  rejected.

---

## 1. Create the account (phone browser)

1. Open `cloud.oracle.com` in Chrome → **Start for free**.
2. Enter email, country (India), your name; verify email; receive the
   **tenancy name** (note it down — it's your username).
3. Phone verification (SMS OTP).
4. Address + **credit/debit card** (verification only) + accept terms.
5. Pick a home region. Choose one **near India** (e.g. `ap-mumbai-1`) — but if
   ARM capacity is sold out there, try `ap-singapore-1` or `eu-frankfurt-1`
   (you can run the app from any region; latency to Delhi will still be fine).

## 2. Generate your SSH key ON the phone (do this before creating the VM)

Installing Termius:
1. Play Store / App Store → **Termius** (free). Create a local account.
2. Termius → **Keychain** (or Settings → Keychain) → `+` → **Generate key**.
3. Type: `ed25519`, name `grinbid`, passphrase optional → Generate.
4. Tap the key → **Copy public key** → save it to your phone notes/clipboard.

> Generating the key on the phone means you never have to download a private
> key from the Oracle console (which is the awkward part of a mobile-only flow).

## 3. Create the Always Free VM (phone browser, desktop mode)

1. Console → hamburger menu → **Compute → Instances** → **Create instance**.
2. Name: `grinbid-vm` · Image: **Ubuntu 24.04** (aarch64).
3. **Shape**:
   - "Specialty and legacy" → **Ampere** → `VM.Standard.A1.Flex` with the
     **Always Free** badge (in 2026 the free A1 allotment is typically
     2 OCPU / 12 GB — plenty for Grinbid, which needs ~100 MB).
   - If you see "**Out of capacity / Limit exceeded**", switch the **shape
     family to AMD** (`VM.Standard.E2.1.Micro`, always free, 1 GB RAM — enough
     for Grinbid), or change the region and retry.
4. **SSH keys**: choose *Generate a key pair for me* **only if** you want to
   download it (not great on mobile). Better: *Upload public key files* →
   paste the public key from Termius.
5. Boot volume: keep default (always-free block volume counts against your
   200 GB) → **Create**.
6. Wait for "Running", copy the **Public IP** (Instance details page).

## 4. Open the app port (phone browser, desktop mode)

1. Menu → **Networking → Virtual Cloud Networks** → your VCN → **Security
   Lists** → `Default Security List`.
2. **Add Ingress Rules**:
   - Source Type `CIDR`, Source CIDR `0.0.0.0/0`
   - IP Protocol `TCP`, Destination Port Range `3000`
3. Optional second rule for SSH (by default port 22 is already open — if you
   want, restrict Source to your home IP).

## 5. Install + run Grinbid (Termius app)

1. Termius → `+` → **New Host**:
   - Alias `grinbid` · Address = instance public IP · Port `22`
   - Username `ubuntu` (Ubuntu images on Oracle use `ubuntu`; Oracle Linux
     uses `opc`)
   - Authentication → **Key**: select the key from step 2.
2. Tap the host to open the terminal. Paste:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/Kyabtao/grinbid/arena/01a049f5-grinbid/deploy/oracle/setup.sh)"
```

That script installs Node 22, clones Grinbid, installs a systemd service
(auto-restart + start on boot), and adds a per-minute keep-alive cron so
Oracle doesn't reclaim an idle Always-Free instance.

3. Open `http://<public-ip>:3000` in your phone browser → Grinbid!

## 6. Optional: free HTTPS without opening port 3000

The Cloudflare Tunnel Android app (free) can expose the app as a `trycloudflare.com`
URL — no port forwarding, no DNS, works from mobile:

1. Android: install **cloudflared** from GitHub releases (APK) or use the
   **Cloudflare Tunnel** app… for phone-only setups the easiest robust path is
   a tiny cron on the VM:
   `cloudflared tunnel --url http://localhost:3000` (see provider docs for
   token-based tunnels for a permanent domain).

## Trouble spots

| Symptom | Fix |
|---|---|
| "Out of capacity" on A1 ARM | Use AMD `E2.1.Micro`, or another region |
| Signup card rejected | Use a Visa/Mastercard debit with intl. payments on; address must match bank |
| SSH "Permission denied" | You used `opc` on Ubuntu → use `ubuntu`; or re-paste the Termius public key |
| Can't reach `:3000` | Security list ingress rule missing (step 4) |
| Instance gone after a week idle | Keep-alive cron should prevent it; snapshot the boot volume as a backup |

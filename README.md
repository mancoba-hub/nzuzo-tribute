# 🕯️ Nzuzo Pukuza — Tribute App

A mobile-friendly tribute page where the community can send written tributes and photos
for the family of **Nzuzo Pukuza**. Organised by **Qeqe Community Development**.
All tributes are collected and handed over to the family on the day of the funeral.

Available in **English** and **isiXhosa** (tap the 🌍 button top-right to switch).

## What it does

**For the community** (opens in any phone browser — share via WhatsApp link):

- Write a message of condolence
- Add a photo (JPG / PNG / WEBP / GIF, max 10 MB)
- See all tributes on the wall
- Bilingual interface: English / isiXhosa
- Can be installed to the home screen (PWA)

**For Qeqe Community Development** (admin area at `/#/admin`):

- Review every tribute
- Hide or delete anything inappropriate
- Download all tributes as **CSV**
- Download all photos as a **ZIP** (to hand over on a USB or phone)
- **Print a tribute booklet** to present to the family

## Quick start (on this computer)

```powershell
npm install
```

### 1. Edit the tribute details

Open `src/config.ts` and set:

- `name` — full name (already set to Nzuzo Pukuza)
- `dates` — e.g. `"12 March 1990 – 20 September 2026"`
- `funeralNote` — e.g. `"The funeral will be held on Saturday 10 October 2026."` (optional)
- `heroPhoto` — optional photo; place a file at `public/hero.jpg` and set this to `"/hero.jpg"`

### 2. Set the admin password

```powershell
Copy-Item .env.example .env
```

Then open `.env` and change `ADMIN_PASSWORD` to something strong.
The dashboard is at `http://<your-site>/#/admin`.

### 3. Run it

```powershell
# development (hot reload)
npm run dev
# open http://localhost:5173

# production (build + serve)
npm run build
npm start
# open http://localhost:3001
```

Data is stored in `data/tributes.json` and photos in `uploads/`.
Back up both folders regularly.

## Deploying to Render (free) ✅ recommended

The easiest free option: Render deploys this app from GitHub and gives you a
free HTTPS link like `https://nzuzo-tribute.onrender.com` to share with the community.

### One-time setup

1. Create a **private** GitHub repository and push this project to it:
   ```powershell
   git init
   git add .
   git commit -m "Nzuzo tribute app"
   git branch -M main
   git remote add origin https://github.com/<your-username>/nzuzo-tribute.git
   git push -u origin main
   ```
2. Go to [render.com](https://render.com) → **Sign in with GitHub**.
3. Dashboard → **New +** → **Blueprint** → connect your repository.
   (The included `render.yaml` configures everything automatically.)
4. After the first deploy (~5 minutes), open the URL shown and check the page.
5. Get your admin password: in the Render dashboard, open the
   **nzuzo-tribute** service → **Environment** → copy the generated
   `ADMIN_PASSWORD` value.

### Free-tier notes — please read

- ⚠️ **Data is not permanently stored on the free plan.** If you redeploy or the
  service restarts, tributes and photos **may be wiped**. After the app is live,
  **don't redeploy** until after the funeral. Download a backup (CSV + photos ZIP)
  from the admin dashboard every evening.
- ⏳ Free services **sleep after ~15 minutes without visitors**, so the first
  person to open the link may wait up to a minute. Fix this for free: create a
  monitor at [cron-job.org](https://cron-job.org) that pings
  `https://<your-app>.onrender.com/api/health` every 5 minutes. No card needed.
- For a permanently-on free alternative with persistent storage, see
  "Oracle Cloud (free forever)" below.

## Sharing with the community

The community opens the app with a normal link in any phone browser —
no app store needed. You must host it somewhere always-on so people can reach it.

Options (cheapest → most work):

1. **Small VPS** (e.g. DigitalOcean, Hetzner ~€4–6/month): install Node 20+, upload the
   project, run `npm install`, `npm run build`, and `npm start` behind a process manager
   (PM2) and a reverse proxy with HTTPS (Caddy makes this one command).
   Recommended — full control, data persists.
2. **Render / Railway / Fly.io**: create a Node service from this folder.
   ⚠️ Use a **persistent disk/volume** — otherwise tributes and photos are wiped on redeploy.
   On Render, set the build command to `npm install && npm run build` and start command to
   `npm start`, then attach a disk mounted at `/opt/render/project/src/data` and `/uploads`.
3. **Temporary share from your PC**: keep the app running on your computer and expose it
   with Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:3001`) — free, but your
   PC must stay on 24/7. Good for a quick test, not recommended for the real week.

> Note: Vercel/Netlify cannot host this app as-is because they don't support
> persistent file uploads.

### Oracle Cloud (free forever, persistent)

If you prefer a "real" server that never sleeps and never loses data:

1. Create an account at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
   (card needed for verification only — **nothing is ever charged**).
2. Create an **Always Free** VM (Ampere A1, Ubuntu 24.04).
3. On the VM:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   git clone https://github.com/<your-username>/nzuzo-tribute.git
   cd nzuzo-tribute
   npm ci && npm run build
   printf 'ADMIN_PASSWORD=your-strong-password\nPORT=3001\n' > .env
   sudo npm install -g pm2
   pm2 start "NODE_ENV=production node server/index.js" --name nzuzo-tribute
   pm2 save
   ```
4. Open port 3001 in the VM's firewall / security list, then share
   `http://<your-VM-IP>:3001`. (A custom domain + Caddy is needed if you want
   HTTPS rather than the plain IP address.)

## Admin guide

1. Open `http://<your-site>/#/admin` (or add `/#/admin` to the home page URL).
2. Sign in with the `ADMIN_PASSWORD` from `.env`.
3. Review tributes — hide or delete anything that should not go to the family.
4. Use **Download CSV** / **Download photos (ZIP)** to save everything for the handover.
5. Use **Print tribute booklet**, then choose "Save as PDF" in the print dialog.

## Customising

| What                      | Where                          |
| ------------------------- | ------------------------------ |
| Name, dates, funeral note | `src/config.ts`                |
| English / isiXhosa text   | `src/i18n.tsx`                 |
| Colours & fonts           | `src/styles.css`               |
| App icon                  | `scripts/generate-icons.js` → `npm run icons` |
| Admin password            | `.env` (`ADMIN_PASSWORD`)      |

The isiXhosa translation was written by the app's author — please have a fluent
isiXhosa speaker quickly review `src/i18n.tsx` before sharing widely.

## Security notes

- Always set a strong `ADMIN_PASSWORD` in `.env` before going live.
- Serve the app over HTTPS (Caddy/Nginx or your host does this for you).
- Photos are limited to 10 MB and image formats only; text fields are length-limited.
- If a tribute contains contact details, they are only visible in the admin dashboard —
  never shown publicly on the wall.

## Project layout

```
server/index.js    Express API (tributes, admin, exports) + static hosting
server/store.js    JSON file storage (data/tributes.json)
server/auth.js     Admin login tokens
src/               React frontend (Vite)
public/            PWA manifest, service worker, icons
scripts/           Icon generator
```

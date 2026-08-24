# Customs & VAT Risk Review — Dashboard

The visual dashboard (stamp badges, risk-ranked list, review drawer),
connected to the live backend at:
`https://customs-risk-and-backend-1.onrender.com`

## Files in this folder (all flat — no subfolders, easy to upload from phone)

- `index.html` — the page shell
- `main.jsx` — mounts the app
- `App.jsx` — the actual dashboard (this is the file you already had)
- `package.json` — tells Vercel what this project needs to build
- `vite.config.js` — build tool config

## How to deploy (from your phone, no laptop needed)

1. Create a new GitHub repo (e.g. `customs-risk-dashboard`), set to **Public**
2. Upload **all five files above** directly into the repo root — no
   subfolders needed, just select all five and upload them together like
   you did for the backend
3. Go to vercel.com, sign up (GitHub login is easiest), tap "Add New" →
   "Project", pick this repo
4. Vercel auto-detects it's a Vite project — leave all settings as
   default
5. Tap "Deploy"
6. Vercel gives you a live public URL, e.g.
   `https://customs-risk-dashboard.vercel.app` — that's your real,
   shareable dashboard link

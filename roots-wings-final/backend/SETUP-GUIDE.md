# Roots & Wings — Complete Setup Guide
## No PostgreSQL · No VS Code Extensions · 100% Free

---

## What you now have

| Part | Technology | Cost |
|------|-----------|------|
| Backend (API) | Node.js + SQLite (single file DB) | Free |
| Frontend | Your existing HTML/CSS/JS | Free |
| Hosting (backend) | Render.com | Free tier |
| Hosting (frontend) | Vercel | Free tier |

SQLite is a database that lives as **one file** (`data/rootswings.db`) on your computer
and on Render. No server, no installation, no extensions needed.

---

## STEP 1 — Set up locally (your PC)

### 1.1  Extract the zip
Unzip `roots-wings-backend-sqlite.zip`. You will get a folder called
`roots-wings-backend-sqlite/`. Place it next to your existing `roots-wings/` folder.

Your folder structure should look like:
```
my-project/
  roots-wings/              ← your original project (frontend + old backend)
  roots-wings-backend-sqlite/  ← the new backend (this zip)
```

### 1.2  Install dependencies
Open a terminal (Command Prompt or PowerShell) inside `roots-wings-backend-sqlite/`:

```bash
npm install
```

This installs everything. No Prisma, no PostgreSQL driver needed.

### 1.3  Create your .env file
Copy the example file:
```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Open `.env` in Notepad and set at minimum:
```
JWT_SECRET=any-long-random-text-you-make-up-right-now-abc123
FRONTEND_URL=http://localhost:3000
```

Everything else is optional for local development.

### 1.4  Seed the database (creates tables + demo data)
```bash
node src/seed.js
```

You will see output like:
```
🌱 Seeding database...
✅ Admin created   →  admin@rootswings.org  /  Admin@123
✅ Arjun Mehta  (arjun@example.com / Arjun@123)
✅ Sunita Rao   (sunita@example.com / Sunita@123)
...
🌿 Seed complete! You can now run: npm start
```

A file `data/rootswings.db` is now created. This is your entire database.

### 1.5  Start the server
```bash
npm start
```

You should see:
```
🌿 Roots & Wings API running on port 5000
```

### 1.6  Test it works
Open your browser and go to:
```
http://localhost:5000/health
```

You should see:
```json
{ "status": "ok", "db": "sqlite" }
```

### 1.7  Connect your frontend
In your frontend `.env` or `vercel.json`, set the API URL to:
```
http://localhost:5000
```

Or in your `frontend/public/js/api.js`, temporarily change:
```js
const API_URL = 'http://localhost:5000';
```

---

## STEP 2 — Deploy backend to Render (free hosting)

Render gives you a free backend server that runs 24/7.

### 2.1  Push backend to GitHub
1. Create a **new GitHub repository** called `roots-wings-backend`
2. Push the `roots-wings-backend-sqlite/` folder to it:

```bash
cd roots-wings-backend-sqlite
git init
git add .
git commit -m "Initial commit - SQLite backend"
git remote add origin https://github.com/YOUR_USERNAME/roots-wings-backend.git
git push -u origin main
```

### 2.2  Create a Render account
Go to **https://render.com** → Sign up for free (use GitHub login)

### 2.3  Create a Web Service on Render
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo `roots-wings-backend`
3. Fill in these settings:

| Setting | Value |
|---------|-------|
| Name | roots-wings-api |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `node src/seed.js && node src/server.js` |
| Plan | **Free** |

4. Scroll to **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `JWT_SECRET` | Any long random string (e.g. `rw-secret-2025-abc-xyz-123`) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | (leave blank for now, add after Vercel deploy) |

5. Click **"Create Web Service"**

Render will build and deploy. After ~3 minutes you get a URL like:
```
https://roots-wings-api.onrender.com
```

Test it:
```
https://roots-wings-api.onrender.com/health
```

> ⚠️ **Free tier note:** Render free services "sleep" after 15 minutes of no traffic.
> The first request after sleeping takes ~30 seconds to wake up. This is normal for the
> free tier. For a community project this is perfectly fine.

---

## STEP 3 — Deploy frontend to Vercel

### 3.1  Update the API URL in your frontend
In `roots-wings/frontend/public/js/api.js`, change:
```js
const API_URL = window.ENV_API_URL || 'https://roots-wings-api.onrender.com';
```

### 3.2  Update vercel.json
In `roots-wings/frontend/vercel.json`, add the API URL:
```json
{
  "env": {
    "API_URL": "https://roots-wings-api.onrender.com"
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 3.3  Push and deploy on Vercel
1. Go to **https://vercel.com** → Sign in with GitHub
2. Click **"New Project"** → import your frontend repo
3. Set Root Directory to `roots-wings/frontend`
4. Click **Deploy**

You get a URL like: `https://roots-wings.vercel.app`

### 3.4  Go back to Render and update FRONTEND_URL
In your Render service → Environment → add:
```
FRONTEND_URL = https://roots-wings.vercel.app
```

Click **"Save Changes"** — Render will redeploy automatically.

---

## STEP 4 — Final check

Visit your Vercel URL. You should be able to:

- ✅ Sign in as admin:  `admin@rootswings.org` / `Admin@123`
- ✅ Sign in as alumni: `arjun@example.com` / `Arjun@123`
- ✅ See alumni, jobs, stories, mentors
- ✅ Admin can approve/reject registrations
- ✅ Alumni can post jobs (admin approves)
- ✅ Anyone can request mentorship

---

## Optional — Set up email (Gmail)

Without email setup, the app still works fully — emails are just skipped silently.
To enable them:

1. Go to your Google Account → Security → **App Passwords**
   (you need 2-Step Verification enabled first)
2. Generate an App Password for "Mail"
3. Add to Render environment variables:

```
SMTP_USER = yourgmail@gmail.com
SMTP_PASS = the-16-character-app-password
EMAIL_FROM = Roots & Wings <yourgmail@gmail.com>
```

---

## Development commands

| Command | What it does |
|---------|-------------|
| `npm start` | Start the server |
| `npm run dev` | Start with auto-restart on file changes |
| `node src/seed.js` | Create tables + demo data |

---

## Troubleshooting

**"Cannot find module 'better-sqlite3'"**
→ Run `npm install` again

**"SQLITE_ERROR: no such table"**
→ Run `node src/seed.js` first

**Frontend can't reach the API (CORS error)**
→ Make sure `FRONTEND_URL` in your `.env` exactly matches your Vercel URL

**Render service is sleeping / slow first load**
→ This is normal on the free tier. Consider using UptimeRobot (free) to ping
  your Render URL every 10 minutes to keep it awake.

---

*Built for Roots & Wings — a community service project for orphanage children 🌿*

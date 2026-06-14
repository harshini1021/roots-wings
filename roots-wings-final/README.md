# 🌿 Roots & Wings — Alumni Connection Portal

A community service project for orphanage children.
Connects alumni, current residents, and mentors.

---

## Project structure

```
roots-wings/
├── frontend/     → Deploy to Vercel (free)
└── backend/      → Deploy to Render (free)
```

---

## Quick start (local)

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env        # then edit .env and set JWT_SECRET
node src/seed.js            # creates database + demo data
npm start                   # runs on http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                 # runs on http://localhost:3000
```

---

## Demo login accounts (after seeding)

| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@rootswings.org | Admin@123 |
| Alumni | arjun@example.com | Arjun@123 |
| Alumni | sunita@example.com | Sunita@123 |

---

## Deploy

| Part | Platform | Setting |
|------|----------|---------|
| Backend | Render.com | Root dir: `backend` · Start: `node src/seed.js && node src/server.js` |
| Frontend | Vercel | Root dir: `frontend` · Set `API_URL` env var to your Render URL |

See `backend/SETUP-GUIDE.md` for full step-by-step deployment instructions.

---

*Built with Node.js · SQLite · Express · Vanilla JS · No PostgreSQL needed*

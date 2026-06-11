# Deployment Guide
## Gamji College of Nursing Sciences Portal

This guide deploys the full system to production using three free-tier services:

| Service | What it hosts | Cost |
|---|---|---|
| **Neon** | PostgreSQL database | Free tier |
| **Railway** | Go API backend | Free tier (500 hrs/month) |
| **Vercel** | React frontend | Free tier |

**Total cost to start: ₦0 / $0**

---

## Prerequisites

Install these tools on your machine before starting:

```bash
# 1. Git
sudo apt install git   # Ubuntu/Debian

# 2. Node.js (for frontend deploy)
# Download from https://nodejs.org — use v20 LTS

# 3. Railway CLI
curl -fsSL https://railway.app/install.sh | sh

# 4. Vercel CLI
npm install -g vercel
```

---

## Step 1 — Push code to GitHub

Everything must be in a GitHub repository before it can be deployed.

```bash
# From the project root (nursing-portal-login/)
git init
git add .
git commit -m "Initial commit — Gamji Portal"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/gamji-portal.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Create the PostgreSQL database on Neon

**Neon** is a serverless PostgreSQL provider. Free tier is more than enough for a school.

1. Go to **https://neon.tech** and sign up (use GitHub login)
2. Click **"New Project"**
3. Name it: `gamji-portal`
4. Region: choose the closest to Nigeria — **AWS eu-west-2 (London)** is best
5. Click **Create Project**
6. On the dashboard, click **"Connection Details"**
7. Select **Connection string** format and copy the URL — it looks like:
   ```
   postgres://username:password@ep-xxx.eu-west-2.aws.neon.tech/gamji-portal?sslmode=require
   ```
8. **Save this URL** — you'll need it in the next two steps

> The Go backend runs migrations automatically on startup, so you don't need to create any tables manually.

---

## Step 3 — Deploy the Go backend to Railway

**Railway** runs Docker containers. The `backend/Dockerfile` is already written.

### 3a. Create the Railway project

1. Go to **https://railway.app** and sign up (use GitHub login)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `gamji-portal` repository
4. Railway will detect the `backend/Dockerfile` automatically
5. Set the **Root Directory** to `backend` (click the settings cog → Root Directory → type `backend`)
6. Click **Deploy**

### 3b. Set environment variables on Railway

In your Railway project, click the service → **Variables** tab → **"Add Variable"** for each:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The Neon connection string from Step 2 |
| `JWT_SECRET` | Run `openssl rand -hex 32` in your terminal and paste the result |
| `JWT_EXPIRY_HOURS` | `24` |
| `ALLOWED_ORIGINS` | `https://gamji-portal.vercel.app,http://localhost:3000` (update after Vercel deploy) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your school's Gmail address |
| `SMTP_PASS` | Gmail App Password (see note below) |
| `SMTP_FROM` | `Gamji Portal <noreply@gamji.edu.ng>` |
| `FRONTEND_URL` | `https://gamji-portal.vercel.app` (update after Vercel deploy) |
| `PORT` | `8080` |

**Getting a Gmail App Password:**
1. Go to your Google Account → Security
2. Enable **2-Step Verification** if not already on
3. Go to **App Passwords** (search for it in Google Account settings)
4. Select app: **Mail**, device: **Other** → type "Gamji Portal"
5. Copy the 16-character password that appears — use this as `SMTP_PASS`

### 3c. Get your Railway backend URL

After deploy succeeds:
1. Click your service → **Settings** → **Networking** → **Public Networking**
2. Click **Generate Domain**
3. Copy the URL — it looks like: `https://gamji-portal-production.up.railway.app`
4. Test it: open `https://YOUR_RAILWAY_URL/api/health` in your browser
   - You should see: `{"status":"ok"}`

---

## Step 4 — Run the seed script (populate initial data)

This creates the staff accounts and initial courses in your production database.
Run this **once** from your local machine.

```bash
# From the backend/ folder:
cd backend

# Set your production database URL temporarily
export DATABASE_URL="postgres://username:password@ep-xxx.eu-west-2.aws.neon.tech/gamji-portal?sslmode=require"

# Run the seed
go run ./cmd/seed/
```

You should see output like:
```
✓ Suleiman Bello (Admin)
✓ Prof. Aliyu Muhammad Sokoto (Provost)
✓ Mallam Kabiru Usman (Registrar)
✓ Mrs. Aisha Aliyu (Bursar)
✓ Dr. Ibrahim Abubakar (Lecturer)
✓ Hadiza Bello Shagari (Student)
✓ GNS 201 — Foundations of Nursing Practice
...
✅ Seed complete.
```

**Default login passwords (change these immediately after first login):**

| Role | Email | Default Password |
|---|---|---|
| Admin | admin@gamji.edu.ng | GamjiAdmin2024! |
| Provost | provost@gamji.edu.ng | GamjiProvost2024! |
| Registrar | registrar@gamji.edu.ng | GamjiReg2024! |
| Bursar | bursar@gamji.edu.ng | GamjiBursar2024! |
| Lecturer | lecturer@gamji.edu.ng | GamjiLec2024! |
| Student | student@gamji.edu.ng | GamjiStudent2024! |

> **Important:** Have each person use "Forgot Password" to set their own password after first login.

---

## Step 5 — Deploy the React frontend to Vercel

### 5a. Update the frontend environment variable

Edit `.env.production` and set your Railway URL:

```env
VITE_API_URL=https://YOUR_RAILWAY_URL.up.railway.app
VITE_SHOW_QUICK_LOGIN=false
```

Commit and push this change:
```bash
git add .env.production
git commit -m "Set production API URL"
git push
```

### 5b. Deploy to Vercel

```bash
# From the project root (nursing-portal-login/)
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name: gamji-portal
# - Root directory: ./  (press Enter for default)
# - Override build command? No
# - Override output directory? No
```

Vercel will deploy and give you a URL like: `https://gamji-portal.vercel.app`

### 5c. Set Vercel environment variables

```bash
vercel env add VITE_API_URL production
# Paste your Railway URL when prompted

vercel env add VITE_SHOW_QUICK_LOGIN production
# Type: false

# Redeploy to apply:
vercel --prod
```

---

## Step 6 — Update CORS and frontend URL on Railway

Now that you have your Vercel URL, go back to Railway and update:

| Variable | New value |
|---|---|
| `ALLOWED_ORIGINS` | `https://gamji-portal.vercel.app` |
| `FRONTEND_URL` | `https://gamji-portal.vercel.app` |

Railway will redeploy automatically when you save.

---

## Step 7 — Verify everything works

Run through this checklist:

- [ ] Open `https://gamji-portal.vercel.app` — login page loads
- [ ] Login as Admin (admin@gamji.edu.ng / GamjiAdmin2024!) — dashboard loads with real data
- [ ] Admin dashboard → Staff tab shows seeded staff members
- [ ] Admin dashboard → Students tab shows the sample student
- [ ] Login as Student — results and payments display correctly
- [ ] Login as Lecturer — courses appear in "My Courses"
- [ ] Login as Registrar — admission applications visible
- [ ] Login as Bursar — payment records visible
- [ ] Test forgot password flow — enter a real email address, check inbox for reset email
- [ ] Quick login buttons are NOT visible (production build)

---

## Step 8 — Connect a custom domain (optional)

If Gamji has a domain like `gamji.edu.ng`:

**Frontend (Vercel):**
1. Vercel dashboard → Project → Settings → Domains
2. Add `portal.gamji.edu.ng`
3. Add the CNAME record in your DNS provider pointing to Vercel

**Backend (Railway):**
1. Railway → Service → Settings → Networking → Custom Domain
2. Add `api.gamji.edu.ng`
3. Add the CNAME record pointing to Railway

Then update:
- `VITE_API_URL=https://api.gamji.edu.ng` in Vercel env vars
- `ALLOWED_ORIGINS=https://portal.gamji.edu.ng` in Railway env vars
- `FRONTEND_URL=https://portal.gamji.edu.ng` in Railway env vars

---

## Local Development Setup

To run everything locally with Docker:

```bash
# From project root:
cp backend/.env.example backend/.env
# Edit backend/.env — only DATABASE_URL, JWT_SECRET, and SMTP vars are required

docker-compose up
```

This starts:
- PostgreSQL on port 5432
- Go backend on port 8080
- React frontend on port 3000

Then seed the local database:
```bash
export DATABASE_URL="postgres://gamji:gamji_dev_password@localhost:5432/gamji_portal?sslmode=disable"
go run ./backend/cmd/seed/
```

Open http://localhost:3000 — the quick login buttons will be visible (VITE_SHOW_QUICK_LOGIN=true in dev).

---

## Customizing for Another School

When adapting this for a different school, here's exactly what to change:

### Frontend (React)
| File | What to change |
|---|---|
| `components/Logo.tsx` | School name, initials, colors |
| `components/AuthPage.tsx` | Hero text, background image URL |
| `tailwind.config` | `nursing-*` color tokens → new school colors |
| `vite.config.ts` | N/A |

### Backend (Go)
| File | What to change |
|---|---|
| `cmd/seed/main.go` | Staff names, emails, passwords, course list |
| `internal/results/service.go` → `ComputeGrade()` | Grading scale if different |
| `.env.example` | SMTP_FROM name |

### Infrastructure
| Setting | What to change |
|---|---|
| Neon project name | New school name |
| Railway project name | New school name |
| Vercel project name | New school name |
| Custom domain | New school domain |
| `STORAGE_PREFIX` in `apiClient.ts` | Unique prefix per school (e.g. `kano_portal_`) |

The database schema, all API endpoints, and all role logic stay exactly the same.

---

## Troubleshooting

**Backend won't start on Railway:**
- Check the Railway deployment logs (click Deploy → View Logs)
- Most common cause: a missing environment variable — check all vars in Step 3b are set

**Login returns "invalid credentials":**
- Make sure you ran the seed script (Step 4) against the production database
- Check that `DATABASE_URL` in Railway points to Neon (not localhost)

**CORS error in browser:**
- Check `ALLOWED_ORIGINS` in Railway matches your Vercel URL exactly (no trailing slash)

**Password reset emails not arriving:**
- Check Gmail App Password is correct (not your account password)
- Check spam folder
- Verify `SMTP_USER` matches the Gmail account the App Password was created for

**Frontend shows "Go backend offline":**
- Make sure you toggled the Go backend ON in the login panel settings
- Or verify `VITE_API_URL` is set correctly in Vercel

---

## Summary

```
Neon (free)          → PostgreSQL database
Railway (free)       → Go API  →  https://api.gamji.edu.ng
Vercel (free)        → React   →  https://portal.gamji.edu.ng
GitHub               → Source code + CI/CD (auto-deploys on git push)
```

Every time you `git push` to `main`:
- Vercel auto-rebuilds the frontend
- Railway auto-rebuilds the backend

No manual deploy steps needed after initial setup.

# 🚀 Utopi — Complete 24/7 Free Online Launch Guide

This guide details how to launch **Utopi** online with **100% FREE, 24/7 reliable hosting, enterprise-grade security, and zero sleeping/cold starts**.

---

## 🌟 Recommended Free 24/7 Stack (0$/month Forever)

| Component | Provider | Free Tier Benefits |
| :--- | :--- | :--- |
| **Frontend & Compute** | **Vercel** | Free 24/7, Global Edge CDN, Automated HTTPS, Zero Sleep |
| **Database** | **Turso (LibSQL)** | 9GB Storage, 1 Billion Row Reads/mo, 500 Databases, Edge SQLite |
| **Transactional Email**| **Resend** | 3,000 Free Emails / month (100 / day) with custom domain support |
| **Uptime Monitoring** | **BetterStack / UptimeRobot** | Free 24/7 HTTP ping checks on `/api/health` |

---

## 🛠️ Step-by-Step Launch in 3 Minutes

### Step 1: Create your 24/7 Free Turso Database
1. Go to [https://turso.tech](https://turso.tech) and sign in with GitHub (Free).
2. Install Turso CLI or create a database in the web dashboard:
   ```bash
   turso db create utopi-prod
   ```
3. Get your Database URL:
   ```bash
   turso db show utopi-prod --url
   # Output: libsql://utopi-prod-[your-org].turso.io
   ```
4. Create an Auth Token:
   ```bash
   turso db tokens create utopi-prod
   # Output: eyJhbGci... (your JWT token)
   ```
5. Seed the production database:
   ```bash
   DATABASE_URL="libsql://utopi-prod-[your-org].turso.io" DATABASE_AUTH_TOKEN="eyJhbGci..." npx tsx prisma/seed.prod.ts
   ```

---

### Step 2: Deploy to Vercel (1-Click)
1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: launch ready Utopi workspace"
   git remote add origin https://github.com/[your-username]/utopi.git
   git push -u origin main
   ```
2. Go to [https://vercel.com/new](https://vercel.com/new) and import your repository.
3. In **Environment Variables**, add the following:
   - `DATABASE_URL`: `libsql://utopi-prod-[your-org].turso.io`
   - `DATABASE_AUTH_TOKEN`: `your-turso-jwt-token`
   - `NEXTAUTH_SECRET`: Generate a random 32-char string (e.g. run `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: `https://[your-app-name].vercel.app` (or your custom domain)
   - `RESEND_API_KEY`: *(Optional)* Your API key from [resend.com](https://resend.com)
4. Click **Deploy**! 🚀
5. Your platform is live with SSL, global CDN, and automated zero-downtime updates!

---

### Step 3: Setup 24/7 Free Health & Uptime Monitoring
1. Go to [https://betterstack.com](https://betterstack.com) or [https://uptimerobot.com](https://uptimerobot.com).
2. Add a new **HTTP(s) Monitor**:
   - **URL**: `https://[your-app-name].vercel.app/api/health`
   - **Interval**: 5 minutes
   - **Expected Status**: `200 OK`
3. If anything ever degrades, you will receive instant Slack / Discord / Email alerts.

---

## 🐳 Alternative: Self-Hosted Docker Deployment (Any VPS)

If you prefer deploying to your own VPS (DigitalOcean, Hetzner, AWS, Oracle Cloud Free Tier):

1. Clone repo to server:
   ```bash
   git clone https://github.com/[your-username]/utopi.git
   cd utopi
   ```
2. Create `.env`:
   ```bash
   cp .env.example .env
   # Edit NEXTAUTH_SECRET and NEXTAUTH_URL
   ```
3. Run with Docker Compose:
   ```bash
   docker compose up -d --build
   ```
4. Access at `http://[your-vps-ip]:3000`.

---

## 🔒 Built-in Security Features Active in Production
- **Rate Limiting:** Built-in sliding-window rate limiters prevent API spam and brute-forcing.
- **Security Headers:** Strict Transport Security (HSTS), X-Frame-Options, X-Content-Type-Options, and Content Security Policy.
- **Tenant Isolation:** Committee roles and priority scores are strictly bounded; users only access authorized organization data.
- **Management Authority:** Owner, Manager, and Admin roles are decoupled from tenant teams with automatic instant booking approvals.

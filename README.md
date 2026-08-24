# 🚀 Utopi | Next-Gen Workspace & Space Reservation System

[![Live Demo](https://img.shields.io/badge/Demo-utopi--six.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://utopi-six.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15.0-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Turso](https://img.shields.io/badge/Turso-LibSQL-44AD8E?style=for-the-badge&logo=sqlite)](https://turso.tech/)
[![Tests Passing](https://img.shields.io/badge/Tests-94%2F94%20Passed-22c55e?style=for-the-badge)](https://github.com/Jimmyyehia/utopi)

> **Utopi** is a modern, high-performance workspace booking and community space management platform built for modern co-working hubs, student chapters, and multi-tenant organizations.

---

## ✨ Highlights & Key Features

### 🏢 Multi-Tenant Team & Community Directory
- **Organization Isolation & Directory**: Multi-tenant structure supporting student organizations and startups (*Hawk Insight*, *HackerRank AUFS*, *PHD Case Competition*, *Nexus Labs*).
- **Public & Private Teams**: Public organizations reveal team headers to all visitors while preserving member privacy.
- **Custom Committees & Role Titles**: Support for custom committees (e.g. *AI Research*, *PR*, *Competitive Coding*) and standardized officer titles.

### 📅 Room Reservation & Visual Timeline Engine
- **4 Configured Spaces**: Main Hall, Focus Room, Meeting Room, and Shared Area with custom capacity and amenity flags (TVs, AC, Balconies, Sockets).
- **Precision 30-Min Interval Engine**: Working hours from **9:00 AM to 10:00 PM** (26 intervals daily) with real-time overlap prevention (`isTimeSlotBooked`).
- **30-Day Booking Horizon**: Rolling 1-month booking horizon with past-session locks and in-place reschedule tools.
- **Consolidated Timelines**: Seamless visual timeline that merges contiguous available slots and bookings into unified blocks.

### 👑 Equal Priority Engine & Role-Based Authority
- **Team Officer Booking Authority**: Reservation authority is strictly reserved for team officers (*President*, *Vice President*, *Head*, *Vice Head*, *Project Manager*, *Vice Project Manager*) or workspace management.
- **Equal Priority Engine**: Eliminates arbitrary numerical priority scores in favor of a fair, chronological FIFO manager review queue.
- **Tri-Tier Approval Workflows**:
  - **Management Direct**: Auto-approved instantly with `PAID` status.
  - **Tenant Officers**: Submits request to Manager Queue with `CASH_PENDING` status.
  - **Guest Coworkers**: Restricted to Shared Area when free of team events.

### 🔒 Privacy, Security & Incognito Sessions
- **Incognito / Private Booking Masking**: Teams can mark reservations as Private. Non-team members see only neutral `"Reserved"` / `"Booked"` labels without exposing meeting titles or booker details.
- **Team-Specific "Accepted" Isolation**: Green `"Accepted"` badges are visible exclusively to members of the booking team and workspace managers.
- **Rate-Limiting Protection**: Serverless API rate limiting protecting reservation endpoints against spam.

---

## 👥 Preset Testing Personas

Utopi includes **1-Click Fast Login** on `/auth/signin` with 13 pre-configured testing accounts:

| Role Category | Name | Email | Default Title & Team | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Management** | Omar Farooq | `owner@utopi.space` | Workspace Owner | `password123` |
| **Management** | Alex Manager | `manager@utopi.space` | Operations Manager | `password123` |
| **Management** | Amr El-Sayed | `admin@utopi.space` | System Admin | `password123` |
| **Hawk Insight** | Alice Chen | `alice@hawkinsight.com` | PR Head (PR) | `password123` |
| **Hawk Insight** | Bob Martinez | `bob@hawkinsight.com` | Senior Designer (Design) | `password123` |
| **Nexus Labs** | Carol Kim | `carol@nexuslabs.com` | AI Research Lead | `password123` |
| **Nexus Labs** | David Park | `david@freelancer.com` | Project Manager (Product) | `password123` |
| **HackerRank AUFS** | Tarek Mansour | `tarek@hackerrank-aufs.org` | Chapter President | `password123` |
| **HackerRank AUFS** | Laila Nader | `laila@hackerrank-aufs.org` | Lead Problem Setter | `password123` |
| **PHD** | Karim Zaki | `karim@phd-case.org` | Executive Director | `password123` |
| **PHD** | Youssef Hassan | `youssef@phd-case.org` | Strategy & Case Lead | `password123` |
| **Guest** | Gabriel Miller | `guest@utopi.space` | Founder (Media Ops) | `password123` |
| **Guest** | Sarah Jenkins | `sarah@visitor.space` | Vice President | `password123` |

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Radix UI Primitives, Lucide Icons, Framer Motion
- **Backend & API**: Next.js Serverless API Routes, Server Actions
- **Database & ORM**: Prisma 7 ORM, `@prisma/adapter-libsql`, Turso Cloud DB (Production LibSQL) & SQLite (`dev.db` for local dev)
- **Authentication**: NextAuth.js (Credentials Provider, JWT Strategy, fail-safe memory fallback)
- **Testing Suite**: Automated 15-suite system test runner (`npx tsx test-suite.ts`)

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Jimmyyehia/utopi.git
cd utopi
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="utopi-secret-key-production-2026"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Run Database Migrations & Seeds

```bash
npx prisma db push
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running System Tests

Utopi includes an automated end-to-end system test suite covering all 15 core architectural rules:

```bash
npx tsx test-suite.ts
```

Output:
```text
==================================================
🧪 RUNNING UTOPI SYSTEM & COMPONENT TEST SUITE
==================================================
...
==================================================
🏁 TEST RESULTS: 94 PASSED, 0 FAILED
==================================================
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.

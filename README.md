# FNF Chanda Fund Dashboard — Next.js + PostgreSQL

A full rebuild of your static HTML dashboard as a real web app:

- **Next.js 14** (App Router) frontend + API routes
- **PostgreSQL** via Prisma ORM
- **NextAuth (Credentials)** for login — sessions are real, server-verified, and cookie-based
- **No self-registration.** Only an admin can create member accounts, from the Admin dashboard or the seed script.
- Deposit submissions and withdrawal requests go through an approve/reject flow, same as your original file, but now persisted in the database and shared by everyone instead of living in one browser tab.

## ⚠️ Important security note

Your original HTML file had the real admin password and all member phone numbers hardcoded in plain view in the page source. If that file was ever hosted or shared, treat that admin password as **already public** and change it immediately after you deploy (Admin → your own account, or directly in the database). The seed script migrates your existing data but you should rotate the admin password right after first login.

## Project structure

```
prisma/schema.prisma     Database schema (User, MonthRecord, DepositRequest, WithdrawalRequest)
prisma/seed.js           One-time migration script — recreates your 10 members + their real history
prisma/seed-data.json    Your original paid/due month data, extracted from the uploaded file
lib/                     Prisma client, NextAuth config, auth guards, shared calculations
app/login                Login page (only entry point — no sign-up link)
app/admin                Admin dashboard: KPIs, chart, member list, add member, approve/reject
app/member                Member dashboard: statement, submit deposit, request withdrawal, print
app/api/...              All backend routes (auth, admin/members, deposits, withdrawals, summary, statement)
middleware.js            Protects /admin and /member by role
```

## 1. Set up a Postgres database

Any of these work well with Vercel:

- **Vercel Postgres** (Storage tab in your Vercel project → Create Database → Postgres)
- **Neon** (neon.tech) — has a generous free tier, gives you both a pooled and direct URL
- **Supabase** — also fine

Whichever you pick, grab the connection string(s). If your provider gives you a separate "pooled" and "direct"/"unpooled" URL (Neon, Vercel Postgres do), use the pooled one for `DATABASE_URL` and the direct one for `DIRECT_URL`. If there's only one, use it for both.

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=...
DIRECT_URL=...
NEXTAUTH_SECRET=...        # generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000   # your real domain once deployed
SEED_ADMIN_LOGIN_ID=...    # e.g. your email
SEED_ADMIN_PASSWORD=...    # pick a brand new, strong password
SEED_ADMIN_NAME=Admin
```

## 3. Install, migrate, and seed

```bash
npm install
npx prisma db push        # creates tables in your Postgres database
npm run db:seed           # creates the admin account + migrates your 10 real members and their history
```

After seeding, each existing member's password is temporarily set to their own phone number (same as before). Have them change it once you add a "change password" self-service option, or reset it yourself from the admin panel's member edit endpoint.

## 4. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/login`.

## 5. Deploy to Vercel

1. Push this project to a GitHub repo.
2. In Vercel: **New Project** → import the repo.
3. Add the same environment variables from your `.env` in the Vercel project's **Settings → Environment Variables** (use your real production values — a fresh `NEXTAUTH_SECRET`, your production `DATABASE_URL`/`DIRECT_URL`, and `NEXTAUTH_URL` set to your `https://your-app.vercel.app` domain).
4. Deploy. Vercel runs `npm run build`, which includes `prisma generate`.
5. Run the schema push and seed once against your production database (from your machine, pointing `DATABASE_URL`/`DIRECT_URL` at production):
   ```bash
   npx prisma db push
   npm run db:seed
   ```
6. Visit your deployed URL and log in as admin.

## How member creation works (no registration)

- Admin dashboard → **+ Add Member** → enter name, a login ID (phone number or email), and an initial password.
- That's it — the member can now log in. There is no public sign-up page or endpoint anywhere in the app.
- The admin can also deactivate a member (`active: false`) or reset their password via the member-edit API route (`PATCH /api/admin/members/:id`).

## What's simplified vs. the original file

To keep this a manageable first version, a few things are intentionally minimal and easy to extend:

- Charts: one bar chart (paid vs due per member). Your original had three; more can be added the same way with `recharts`.
- No "change my own password" page for members yet — the admin resets/sets passwords for now.
- New members created via the admin UI default their months to `DUE` from a chosen start year/month onward (`NA` before that) rather than any custom historical pattern — the admin can correct any individual month status directly via the `PATCH /api/admin/months/:id` route if needed.

Both are quick to add if you want them — happy to build either next.

# FORGE

FORGE is a fitness tracking PWA built with React + Vite + Supabase.

It includes:
- Authentication (Supabase Auth)
- Dashboard with day type, macros, supplements, and weekly summary
- Nutrition logging with food library search
- Workout session tracking with sets/reps/rest timer
- Progress charts and measurements
- Admin panels for food, programmes, supplements, reminders, and targets
- Push reminders via Supabase Edge Function

## Tech Stack

- React 18
- Vite 5
- Tailwind CSS
- Supabase (Database, Auth, Edge Functions)
- Recharts
- vite-plugin-pwa + Workbox

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Run with real Supabase

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Set values:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_VAPID_PUBLIC_KEY=...
```

Run:

```bash
npm run dev
```

For full backend + deployment setup, follow [SETUP.md](SETUP.md).

## Local Mock Mode (No .env needed)

If Supabase env vars are missing, the app automatically runs in local mock mode.

In mock mode:
- Auth works with any email/password
- Data is stored in browser localStorage
- Seed data is available for foods/programmes/supplements
- Push subscription requires real `VITE_VAPID_PUBLIC_KEY`

Start directly:

```bash
npm run dev
```

## Scripts

```bash
npm run dev      # start local dev server
npm run build    # production build
npm run preview  # preview production build
npm run lint     # run ESLint
```

## Contributing

1. Create a feature branch from `dev`.
2. Keep commits focused and small.
3. Run `npm run lint` and `npm run build` before opening a PR.
4. Open PRs against the upstream `dev` branch unless maintainers request otherwise.

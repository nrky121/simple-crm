# Simple CRM

A lightweight, fast CRM built with Next.js 14, Supabase, and Prisma.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Supabase Auth + @supabase/ssr |
| Database | Supabase (PostgreSQL) + Prisma ORM |
| State | TanStack Query + Zustand |
| Forms | react-hook-form + Zod |
| Deploy | Vercel |

## Getting Started

### 1. Prerequisites

```bash
brew install node pnpm supabase/tap/supabase
```

### 2. Clone & Install

```bash
git clone https://github.com/nrky121/simple-crm.git
cd simple-crm
pnpm install
```

### 3. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Note your **Project URL**, **Anon Key**, **Service Role Key**, and **Database Password**
3. In **Storage**, create a public bucket named `avatars`

### 4. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local and fill in your Supabase credentials
```

### 5. Apply Database Migrations

```bash
# Link CLI to your project
supabase login
supabase link --project-ref <your-project-ref>

# Push Supabase migrations (RLS, triggers, search)
pnpm db:push

# Run Prisma migration (creates tables)
pnpm db:migrate
```

### 6. Run Locally

```bash
pnpm dev
# → http://localhost:3000
```

The app redirects to `/login`. Create an account or run the seed:

```bash
pnpm db:seed
# Admin: admin@example.com / password123!
```

## Development

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # ESLint
pnpm db:migrate   # Run Prisma migrations
pnpm db:generate  # Regenerate Prisma client
pnpm db:seed      # Seed with sample data
pnpm db:push      # Push Supabase migrations
```

## Deployment (Vercel)

```bash
pnpm dlx vercel
```

Set the following environment variables in the Vercel dashboard (matching `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

The `postbuild` script (`prisma migrate deploy`) runs automatically on every Vercel deploy.

## Project Structure

```
├── app/
│   ├── (auth)/           # Login, register pages
│   ├── (dashboard)/      # Authenticated app
│   │   ├── dashboard/    # Dashboard overview
│   │   ├── contacts/     # Contacts list + detail
│   │   ├── companies/    # Companies list + detail
│   │   └── settings/     # Profile + tags settings
│   └── api/              # Route handlers
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── layout/           # Sidebar, TopNav
│   ├── contacts/         # Contact-specific components
│   ├── companies/        # Company-specific components
│   ├── common/           # Shared: EmptyState, SlideOver, etc.
│   └── dashboard/        # Dashboard widgets
├── hooks/                # TanStack Query hooks
├── lib/
│   ├── supabase/         # server.ts, client.ts, admin.ts
│   ├── api/              # response, pagination, errors helpers
│   ├── validations/      # Zod schemas
│   ├── prisma.ts         # Prisma client singleton + audit middleware
│   ├── permissions.ts    # Auth helpers
│   └── format.ts         # Formatters
├── prisma/
│   ├── schema.prisma     # Data model
│   └── seed.ts           # Sample data seed
└── supabase/
    └── migrations/       # SQL migrations for RLS, triggers, search
```

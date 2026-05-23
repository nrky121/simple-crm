# Simple CRM — System Architecture

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [High-Level System Diagram](#2-high-level-system-diagram)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Architecture](#5-database-architecture)
6. [Authentication & Session Flow](#6-authentication--session-flow)
7. [Request Lifecycle](#7-request-lifecycle)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Caching Strategy](#9-caching-strategy)
10. [Search Architecture](#10-search-architecture)
11. [Infrastructure & Deployment](#11-infrastructure--deployment)
12. [Security Architecture](#12-security-architecture)
13. [Error Handling Architecture](#13-error-handling-architecture)
14. [Key Architectural Decisions](#14-key-architectural-decisions)

---

## 1. Architecture Overview

Simple CRM is a **monolithic full-stack web application** built on Next.js 14 (App Router). Both the frontend UI and backend API live in a single codebase and are deployed as a single unit to Vercel. The database is a managed PostgreSQL instance (Supabase).

### Architectural Style

| Concern | Choice | Rationale |
|---|---|---|
| App pattern | Monolith (full-stack Next.js) | Reduces operational complexity; right-sized for a 5–200 seat CRM |
| Rendering | Hybrid — RSC + CSR | Server Components for initial load; TanStack Query for client mutations |
| API style | REST (Next.js Route Handlers) | Simple, cacheable, no extra server process |
| Data access | ORM (Prisma) | Type-safe queries; migration management |
| Auth | Session-based (NextAuth.js) | Cookie-backed JWT sessions; no token refresh complexity |

### What this is NOT

- Not a microservices architecture — one deployment unit
- Not a SPA with a separate API server — API routes are co-located
- Not event-driven — synchronous request/response for all Phase 1 & 2 operations

---

## 2. High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENT BROWSER                           │
│                                                                     │
│  ┌───────────────┐   ┌──────────────────┐   ┌───────────────────┐  │
│  │  React Server │   │  React Client    │   │  TanStack Query   │  │
│  │  Components   │   │  Components      │   │  Cache            │  │
│  │  (HTML/CSS)   │   │  (interactivity) │   │  (mutations/page) │  │
│  └───────┬───────┘   └────────┬─────────┘   └────────┬──────────┘  │
└──────────┼────────────────────┼────────────────────── ┼ ───────────┘
           │  Page Request      │  API Fetch             │  API Fetch
           │  (HTML stream)     │  (JSON)                │  (JSON)
           ▼                    ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE / CDN                             │
│               (static assets, edge middleware, caching)              │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APPLICATION SERVER                       │
│                        (Vercel Serverless)                           │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    middleware.ts                                │  │
│  │         Auth guard — redirects unauthenticated users           │  │
│  └───────────────────────┬────────────────────────────────────────┘  │
│                          │                                           │
│          ┌───────────────┴────────────────┐                         │
│          ▼                                ▼                         │
│  ┌───────────────────┐         ┌──────────────────────┐            │
│  │   Page Routes     │         │    API Route          │            │
│  │  app/(dashboard)/ │         │    Handlers           │            │
│  │                   │         │    app/api/**         │            │
│  │  Server Components│         │                       │            │
│  │  → fetch data     │         │  Auth → Validate →   │            │
│  │  → render HTML    │         │  Permission → Query  │            │
│  └───────────────────┘         └──────────┬───────────┘            │
│                                           │                         │
│  ┌────────────────────────────────────────▼───────────────────────┐ │
│  │                         lib/                                   │ │
│  │   prisma.ts │ auth.ts │ permissions.ts │ validations/ │ api/   │ │
│  └────────────────────────────────────────┬───────────────────────┘ │
└───────────────────────────────────────────┼─────────────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
        ┌───────────────────┐  ┌─────────────────────┐  ┌─────────────────┐
        │   SUPABASE        │  │   SUPABASE AUTH      │  │    SENTRY       │
        │   PostgreSQL      │  │   (NextAuth adapter) │  │  (error logs)   │
        │                   │  │                      │  └─────────────────┘
        │  pgBouncer pool   │  │  Sessions table      │
        │  GIN indexes      │  │  Accounts table      │
        │  tsvector search  │  └─────────────────────┘
        └───────────────────┘
```

---

## 3. Frontend Architecture

### Rendering Strategy

The frontend uses a **hybrid rendering model** — choosing the right strategy per component:

```
┌──────────────────────────────────────────────────────────────┐
│                    RENDERING DECISION TREE                   │
│                                                              │
│  Is data needed before paint?                                │
│       YES → React Server Component (RSC)                     │
│       NO  → Client Component                                 │
│                                                              │
│  Does the component have interactivity (events, state)?      │
│       YES → Client Component ('use client')                  │
│       NO  → Keep as Server Component                         │
│                                                              │
│  Is data mutated by the user frequently?                     │
│       YES → TanStack Query (optimistic updates)              │
│       NO  → Server Component + revalidation                  │
└──────────────────────────────────────────────────────────────┘
```

### Component Layers

```
app/(dashboard)/contacts/page.tsx        ← RSC: fetches initial data, renders shell
  └── components/contacts/ContactsTable  ← Client: TanStack Query for pagination/filters
        └── components/common/DataTable  ← Client: sorting, selection, bulk actions
              └── components/ui/         ← shadcn/ui primitives (Button, Input, etc.)
```

### State Management

| State Type | Tool | Location | Examples |
|---|---|---|---|
| Server state | TanStack Query | Client Components | Contact lists, deal pipeline, tasks |
| URL/filter state | nuqs | URL query params | Search query, active filters, sort order |
| UI state | Zustand | Client store | Open modals, slide-overs, selected rows |
| Form state | React Hook Form | Form components | Create/edit forms with validation |
| Auth session | NextAuth | Session context | Current user, role, permissions |

### Client-Side Data Flow

```
URL params (nuqs)
      │
      ▼
useFilters() hook
      │
      ▼
TanStack Query → GET /api/contacts?search=...&tagIds=...
      │
      ▼
ContactsTable renders rows
      │
  User action (edit, delete, bulk)
      │
      ▼
Mutation → PATCH/DELETE /api/contacts/[id]
      │
      ▼
Invalidate query cache → refetch list
```

---

## 4. Backend Architecture

### API Route Handler Pattern

Every route handler follows the same pipeline:

```
Request
  │
  ▼
┌─────────────────────────────────────────────────┐
│  1. AUTH CHECK                                  │
│     getServerSession(authOptions)               │
│     → 401 if no session                        │
├─────────────────────────────────────────────────┤
│  2. INPUT VALIDATION                            │
│     Zod schema.safeParse(request body/params)   │
│     → 400 + ZodIssue[] if invalid              │
├─────────────────────────────────────────────────┤
│  3. PERMISSION CHECK                            │
│     assertCanEdit(session, record)              │
│     → 403 if insufficient role/ownership        │
├─────────────────────────────────────────────────┤
│  4. BUSINESS LOGIC                              │
│     Prisma query (select, include, where)       │
│     Side effects (audit log, stage history)     │
├─────────────────────────────────────────────────┤
│  5. RESPONSE                                    │
│     { data: T, meta?: PaginationMeta }          │
│     → 200 / 201 / 204                          │
└─────────────────────────────────────────────────┘
```

### Shared Library Structure (`lib/`)

```
lib/
├── prisma.ts          Singleton Prisma client + audit middleware
│                      Uses AsyncLocalStorage to thread userId into audit logs
│
├── auth.ts            NextAuth configuration
│                      Providers, session callbacks, JWT shape
│                      Augments session with { user.role, user.id }
│
├── permissions.ts     assertCanEdit(), assertIsAdmin()
│                      Called inside route handlers before any DB write
│
├── validations/       Zod schemas — shared between client forms and API handlers
│   ├── contact.ts     createContactSchema, updateContactSchema
│   ├── deal.ts        createDealSchema, updateDealSchema (incl. stage enum)
│   └── ...
│
├── api/
│   ├── response.ts    successResponse(data, meta?), errorResponse(msg, status)
│   ├── pagination.ts  encodeCursor(), decodeCursor(), buildCursorWhere()
│   └── errors.ts      NotFoundError, ForbiddenError, ValidationError (all extend Error)
│
└── search.ts          buildTsQuery(), buildTrgmQuery() — used by /api/search
```

### Audit Middleware

The Prisma client is wrapped with middleware that automatically writes `AuditLog` rows on every mutating operation. User context is threaded via `AsyncLocalStorage`:

```
Incoming Request
      │
      ▼
Route Handler sets AsyncLocalStorage.run({ userId })
      │
      ▼
Prisma mutation (create / update / delete)
      │
      ▼  [Prisma $use middleware intercepts]
      ▼
AuditLog.create({ userId from AsyncLocalStorage, entity, action, changes diff })
```

---

## 5. Database Architecture

### Schema Overview

```
                          ┌───────────┐
                          │   User    │
                          │  (admin/  │
                          │   user)   │
                          └─────┬─────┘
                    ┌───────────┼────────────┐
                    │           │            │
              owns  │     owns  │  assigned  │
                    ▼           ▼            ▼
              ┌─────────┐  ┌────────┐  ┌────────┐
              │ Contact │  │  Deal  │  │  Task  │
              └────┬────┘  └───┬────┘  └────────┘
                   │           │
         ┌─────────┤           ├──────────┐
         │         │           │          │
         ▼         ▼           ▼          ▼
    ┌─────────┐ ┌──────┐  ┌─────────┐ ┌──────────────┐
    │   Tag   │ │Company│  │Activity │ │DealStageHist.│
    └─────────┘ └──────┘  └─────────┘ └──────────────┘

  Contact ←──── ContactTag ────→ Tag       (many-to-many)
  Company ←──── CompanyTag ────→ Tag       (many-to-many)
  Deal    ←──── DealContact ───→ Contact   (many-to-many + role)
```

### Connection Architecture

Vercel serverless functions create a new process per request, which would normally exhaust Postgres connection limits. This is solved with **pgBouncer** (Supabase built-in):

```
Vercel Function 1 ──┐
Vercel Function 2 ──┤──→ pgBouncer (connection pool) ──→ PostgreSQL
Vercel Function 3 ──┤         (max 10 conns)               (port 5432)
Vercel Function N ──┘

Prisma migrations bypass pgBouncer:
  DIRECT_URL ────────────────────────────────────→ PostgreSQL
  (used only by: prisma migrate deploy)
```

**Why two connection strings:**
- `DATABASE_URL` → pgBouncer (transaction mode) — used by the running app
- `DIRECT_URL` → direct Postgres — used only by `prisma migrate` (migrations require persistent connections that pgBouncer transaction mode doesn't support)

### Index Strategy

| Table | Index | Type | Purpose |
|---|---|---|---|
| contacts | `email` | B-tree | Lookup by email |
| contacts | `(lastName, firstName)` | B-tree | Name sort |
| contacts | `companyId`, `ownerId`, `isArchived` | B-tree | Filter columns |
| contacts | `search_vector` | GIN | Full-text search |
| companies | `name`, `domain`, `industry` | B-tree | Filter/sort |
| companies | `search_vector` | GIN | Full-text search |
| deals | `stage`, `ownerId`, `companyId`, `closeDate`, `isArchived` | B-tree | Pipeline filters |
| deals | `title` | GIN (trgm) | Trigram title search |
| activities | `contactId`, `dealId`, `occurredAt`, `type` | B-tree | Timeline queries |
| tasks | `assignedToId`, `status`, `dueDate` | B-tree | Task list filters |
| audit_logs | `(entity, entityId)`, `createdAt` | B-tree | Audit history lookup |

---

## 6. Authentication & Session Flow

### Session Architecture

NextAuth uses **JWT strategy** with an encrypted cookie. No server-side session store — the session is decoded from the cookie on every request.

```
┌──────────────┐     POST /api/auth/signin      ┌──────────────────┐
│    Browser   │ ─────────────────────────────→ │  NextAuth Handler │
│              │                                 │                  │
│              │ ←───────────────────────────── │  1. Verify creds  │
│  Set-Cookie: │     Set-Cookie: next-auth.      │  2. bcrypt check  │
│  next-auth.  │     session-token=<JWT>         │  3. Sign JWT      │
│  session-token                                 │  4. Set cookie    │
└──────────────┘                                 └──────────────────┘

Subsequent requests:
┌──────────────┐     GET /contacts               ┌──────────────────┐
│    Browser   │ ─── Cookie: session-token ────→ │  middleware.ts    │
│              │                                 │  getServerSession │
│              │ ←── 200 HTML ─────────────────  │  → verified ✓    │
└──────────────┘                                 └──────────────────┘
```

### JWT Payload

```typescript
// The JWT contains (after session callback augmentation):
{
  sub: "user_cuid",          // userId
  email: "user@example.com",
  name: "Ryan Smith",
  role: "ADMIN" | "USER",    // added in jwt() callback
  iat: 1234567890,
  exp: 1234567890
}
```

### Auth Flow Diagram

```
/login page
    │
    ▼ (submit credentials)
POST /api/auth/signin (NextAuth)
    │
    ├── email/password → db lookup → bcrypt.compare()
    │         OR
    └── OAuth (Google) → provider redirect → callback
    │
    ▼ (success)
JWT signed with NEXTAUTH_SECRET → HttpOnly cookie
    │
    ▼
Redirect to /dashboard
    │
    ▼
middleware.ts runs on every /(dashboard) request
    │
    ├── session valid → proceed
    └── no session   → redirect /login
```

---

## 7. Request Lifecycle

### Server Component Page Request

```
Browser: GET /contacts?search=john&tagIds=tag_abc

  1. Vercel Edge CDN
     └── cache miss → forward to serverless function

  2. middleware.ts
     └── getServerSession() → valid → proceed

  3. app/(dashboard)/contacts/page.tsx  [RSC]
     └── fetch('/api/contacts?search=john&tagIds=tag_abc')
           └── app/api/contacts/route.ts
                 ├── getServerSession() → auth ✓
                 ├── contactListSchema.safeParse(searchParams) → valid ✓
                 ├── prisma.contact.findMany({ where, orderBy, take, cursor })
                 └── return { data: contacts[], meta: { nextCursor, total } }

  4. React renders HTML stream → sent to browser

  5. Browser hydrates interactive components (DataTable, filters)
     └── TanStack Query initialized with server-fetched data (no extra request)
```

### API Mutation Request (Client)

```
User clicks "Save" on ContactForm

  1. React Hook Form validates against Zod schema (client-side)
     └── invalid → show field errors, abort

  2. TanStack Query mutation: PATCH /api/contacts/[id]
     └── optimistic update: update local cache immediately

  3. app/api/contacts/[id]/route.ts
     ├── getServerSession() → auth ✓
     ├── updateContactSchema.safeParse(body) → valid ✓
     ├── prisma.contact.findUnique({ where: { id } }) → exists ✓
     ├── assertCanEdit(session, contact) → owner or admin ✓
     ├── prisma.contact.update({ ... })
     │     └── [audit middleware] → prisma.auditLog.create(...)
     └── return { data: updatedContact }

  4. TanStack Query: server confirms → reconcile optimistic update
     └── invalidate related queries (contact detail, contacts list)
```

---

## 8. Data Flow Diagrams

### Deal Stage Change Flow

```
User drags deal card to new column (Kanban)

  KanbanBoard.tsx
    │
    ▼ (onDragEnd)
  Optimistic update: move card in local state immediately
    │
    ▼
  PATCH /api/deals/[id]  { stage: "PROPOSAL" }
    │
    ├── Validate stage transition
    ├── prisma.deal.update({ stage: "PROPOSAL" })
    ├── prisma.dealStageHistory.create({ fromStage, toStage, changedAt, changedBy })
    ├── If toStage === "CLOSED_WON": set wonAt, probability = 100
    ├── If toStage === "CLOSED_LOST": set lostAt, probability = 0, prompt lostReason
    └── [audit middleware] → AuditLog.create(...)
    │
    ▼ (success)
  TanStack Query invalidates ["deals", "pipeline"]
    │
    ▼
  Kanban re-renders with server-confirmed state
```

### Global Search Flow

```
User types in GlobalSearch (Cmd+K)

  useSearch() hook
    │  debounce 300ms
    ▼
  GET /api/search?q=acme

  app/api/search/route.ts
    │
    ├── contacts: prisma.$queryRaw`
    │     SELECT id, "firstName", "lastName", email,
    │            ts_rank(search_vector, query) AS rank
    │     FROM contacts,
    │          plainto_tsquery('english', ${q}) query
    │     WHERE search_vector @@ query
    │     ORDER BY rank DESC LIMIT 5`
    │
    ├── companies: (same pattern with companies.search_vector)
    │
    └── deals: prisma.$queryRaw`
          SELECT id, title
          FROM deals
          WHERE title ILIKE ${`%${q}%`}
          LIMIT 5`
    │
    ▼
  { data: { contacts[], companies[], deals[] } }
    │
    ▼
  Command palette renders grouped results
```

### Activity Timeline Flow

```
Contact Detail page loads

  app/(dashboard)/contacts/[id]/page.tsx  [RSC]
    │
    ├── prisma.contact.findUnique({ include: { activities, tasks, deals } })
    │
    └── <ActivityTimeline activities={contact.activities} />
          │
          ▼  (client component)
    TanStack Query: useActivities({ contactId })
          │  (background refresh keeps timeline live)
          ▼
    GET /api/contacts/[id]/activities
          │
          ▼
    Ordered by occurredAt DESC, grouped by date
```

---

## 9. Caching Strategy

### Three Cache Layers

```
┌──────────────────────────────────────────────────────────────┐
│  LAYER 1: Vercel CDN (static assets)                         │
│  What:  JS bundles, CSS, fonts, public/ images               │
│  TTL:   Long (immutable with content hash in filename)       │
│  Invalidation: New deploy automatically busts cache          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  LAYER 2: Next.js Data Cache (server-side)                   │
│  What:  fetch() calls in Server Components                   │
│  TTL:   On-demand — invalidated by revalidateTag()           │
│  Tags:  'contacts', 'companies', 'deals', 'tasks', 'dashboard│
│  Pattern:                                                    │
│    On read:  fetch('/api/contacts', { next: { tags: ['contacts'] } })
│    On write: revalidateTag('contacts')  ← in route handler   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  LAYER 3: TanStack Query Cache (client-side)                 │
│  What:  API responses for interactive components             │
│  TTL:   staleTime: 30s (data considered fresh for 30s)       │
│  Invalidation: queryClient.invalidateQueries() after mutations│
│  Keys:  ['contacts', filters], ['deals', 'pipeline'], etc.   │
└──────────────────────────────────────────────────────────────┘
```

### Cache Invalidation on Mutations

| Mutation | Invalidates |
|---|---|
| Create/update/delete Contact | `revalidateTag('contacts')` + `queryClient.invalidateQueries(['contacts'])` |
| Create/update/delete Deal | `revalidateTag('deals')` + `['deals']` + `['deals', 'pipeline']` |
| Stage change on Deal | `['deals']` + `['deals', 'pipeline']` + `['dashboard']` |
| Create Activity | `['activities']` + parent contact/deal queries |
| Complete Task | `['tasks']` + `['dashboard']` |

---

## 10. Search Architecture

### Full-Text Search (Contacts & Companies)

PostgreSQL `tsvector` columns maintained by database triggers. No external search service required.

```
┌─────────────────────────────────────────────────────────────┐
│                    SEARCH INDEXING                          │
│                                                             │
│  INSERT/UPDATE contact                                      │
│       │                                                     │
│       ▼  [Postgres trigger: contacts_search_trigger]        │
│  search_vector = (                                          │
│    'A' weight: firstName + lastName                         │
│    'B' weight: email                                        │
│    'C' weight: jobTitle                                     │
│    'D' weight: notes                                        │
│  )  ← stored as tsvector in contacts.search_vector         │
│                                                             │
│  GIN index on search_vector                                 │
│  → O(1) lookup for any query term                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SEARCH QUERY                             │
│                                                             │
│  GET /api/search?q=john+smith                               │
│       │                                                     │
│       ▼                                                     │
│  plainto_tsquery('english', 'john smith')                   │
│  → 'john' & 'smith'                                        │
│       │                                                     │
│       ▼                                                     │
│  WHERE search_vector @@ tsquery                             │
│  ORDER BY ts_rank(search_vector, tsquery) DESC              │
│  LIMIT 5                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Trigram Search (Deals)

Deal titles use `pg_trgm` GIN index for fast `ILIKE` queries — suitable for short strings like deal names.

```
"Acme Corp Renewal Q3" → trigrams: {acm, cme, me , e c, co, cor, ...}
Query: "renewal" → trigrams overlap → fast GIN lookup
```

### Search Result Ranking

```
Score = ts_rank(search_vector, query)

Rank weights per field:
  A (firstName/lastName/companyName) = 1.0
  B (email/domain)                   = 0.4
  C (jobTitle/industry)              = 0.2
  D (notes/description)              = 0.1

Results sorted by score DESC within each entity type.
```

---

## 11. Infrastructure & Deployment

### Production Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL                                  │
│                                                                 │
│  ┌────────────────┐   ┌───────────────┐   ┌─────────────────┐  │
│  │  Edge Network  │   │  Serverless   │   │  Build Pipeline │  │
│  │  (CDN)         │   │  Functions    │   │                 │  │
│  │                │   │               │   │  pnpm install   │  │
│  │  Static assets │   │  Next.js app  │   │  prisma generate│  │
│  │  (JS, CSS)     │   │  (pages +     │   │  next build     │  │
│  │                │   │   API routes) │   │  → deploy       │  │
│  └────────────────┘   └──────┬────────┘   └─────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
              ┌───────────────┴────────────────┐
              │                                │
              ▼                                ▼
┌─────────────────────────┐     ┌──────────────────────────────┐
│       SUPABASE          │     │          SENTRY              │
│                         │     │   (error tracking)           │
│  ┌─────────────────┐    │     └──────────────────────────────┘
│  │  pgBouncer      │    │
│  │  (port 5432)    │    │
│  └───────┬─────────┘    │
│          │              │
│  ┌───────▼─────────┐    │
│  │  PostgreSQL 15  │    │
│  │  (port 5432     │    │
│  │   direct)       │    │
│  └─────────────────┘    │
└─────────────────────────┘
```

### Deployment Environments

| Environment | Branch | Database | URL |
|---|---|---|---|
| Production | `main` | Supabase prod project | `https://your-crm.vercel.app` |
| Preview | `feature/*`, PRs | Supabase staging project | `https://simple-crm-<hash>.vercel.app` |
| Development | local | `supabase start` (local Docker) | `http://localhost:3000` |

### CI/CD Pipeline

```
git push → GitHub
    │
    ▼
GitHub Actions (or Vercel Git Integration)
    │
    ├── pnpm install
    ├── pnpm lint
    ├── pnpm type-check
    ├── pnpm test (Vitest)
    ├── prisma validate
    └── next build
    │
    ▼ (pass)
Vercel deploys preview URL
    │
    ▼ (merge to main)
Vercel deploys production
    │
    ├── prisma migrate deploy  ← runs against DIRECT_URL
    └── new serverless functions live
```

### Local Development Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Postgres (Docker via Supabase CLI)
supabase start

# 3. Apply migrations + seed
pnpm prisma migrate dev
pnpm prisma db seed

# 4. Start dev server
pnpm dev
```

---

## 12. Security Architecture

### Defense-in-Depth Layers

```
┌──────────────────────────────────────────────────────────┐
│  LAYER 1: NETWORK                                        │
│  HTTPS everywhere (Vercel enforced)                      │
│  Security headers (next.config.js):                      │
│    Content-Security-Policy                               │
│    X-Frame-Options: DENY                                 │
│    X-Content-Type-Options: nosniff                       │
│    Referrer-Policy: strict-origin-when-cross-origin      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  LAYER 2: AUTHENTICATION                                 │
│  NextAuth HttpOnly cookie (CSRF protection built-in)     │
│  JWT signed with NEXTAUTH_SECRET (HS256)                 │
│  Passwords: bcrypt cost factor 12                        │
│  Rate limit: 10 auth requests/min/IP (Upstash)          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  LAYER 3: AUTHORIZATION                                  │
│  middleware.ts: route-level auth guard                   │
│  Route handlers: assertCanEdit() / assertIsAdmin()       │
│  Never trust client-sent userId — use session.user.id    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  LAYER 4: INPUT VALIDATION                               │
│  Zod schemas on every API route (body + query params)    │
│  Prisma parameterized queries (no raw string concat)     │
│  Raw SQL uses Prisma.sql tagged template (parameterized) │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  LAYER 5: DATA                                           │
│  Soft deletes (isArchived) preserve audit trail          │
│  Audit log: immutable record of all mutations            │
│  Secrets in env vars only — never in code or client bundle│
└──────────────────────────────────────────────────────────┘
```

### Secret Management

| Secret | Where Stored | Rotation |
|---|---|---|
| `NEXTAUTH_SECRET` | Vercel env var | Rotate every 90 days (invalidates all sessions) |
| `DATABASE_URL` | Vercel env var | Rotate via Supabase dashboard if compromised |
| `GOOGLE_CLIENT_SECRET` | Vercel env var | Rotate via Google Cloud Console |
| `RESEND_API_KEY` | Vercel env var | Rotate via Resend dashboard |

---

## 13. Error Handling Architecture

### Error Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   SERVER-SIDE ERRORS                        │
│                                                             │
│  Route handler throws:                                      │
│    ValidationError  → 400 + { error, details: ZodIssue[] } │
│    AuthError        → 401 + { error: "Unauthorized" }       │
│    ForbiddenError   → 403 + { error: "Forbidden" }          │
│    NotFoundError    → 404 + { error: "Not found" }          │
│    Error (unknown)  → 500 + { error: "Internal error" }     │
│                      + Sentry.captureException()            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   CLIENT-SIDE ERRORS                        │
│                                                             │
│  TanStack Query mutation fails:                             │
│    └── onError callback → toast.error(message)  [Sonner]   │
│                                                             │
│  Unhandled render error:                                    │
│    └── error.tsx boundary → friendly error page            │
│                           + Sentry.captureException()       │
│                                                             │
│  Network failure:                                           │
│    └── TanStack Query retry (3x, exponential backoff)       │
│        → toast.error("Connection issue, retrying...")       │
└─────────────────────────────────────────────────────────────┘
```

### HTTP Status Code Map

| Status | Meaning | Trigger |
|---|---|---|
| 200 | OK | Successful GET / PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Zod validation failure |
| 401 | Unauthorized | No session cookie |
| 403 | Forbidden | Insufficient role/ownership |
| 404 | Not Found | Record doesn't exist |
| 409 | Conflict | Duplicate unique field (e.g. email, domain) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled exception |

---

## 14. Key Architectural Decisions

### ADR-001: Monolith over Microservices
**Decision:** Single Next.js app for both frontend and API.
**Rationale:** A CRM for 5–200 seats doesn't need the operational overhead of microservices. Co-located code enables type sharing between client and server (Zod schemas, Prisma types) and simplifies deployment to a single Vercel project.
**Trade-off:** Scaling individual API concerns independently is harder, but this is unlikely to be needed in Phase 1–2.

### ADR-002: Cursor-Based Pagination over Offset
**Decision:** All list endpoints use cursor pagination.
**Rationale:** Offset pagination is unstable (items shift when records are added/deleted mid-navigation) and slow on large datasets (`OFFSET 10000` scans 10,000 rows). Cursor pagination is stable and O(log n) with a B-tree index.
**Trade-off:** Cannot jump to arbitrary pages; only next/prev navigation. Acceptable for a CRM where users scroll sequentially.

### ADR-003: Postgres Full-Text Search over Elasticsearch
**Decision:** Use native Postgres `tsvector` + GIN indexes for search.
**Rationale:** Eliminates an external service dependency. Postgres FTS handles up to ~1M contacts comfortably. Adding Elasticsearch would add cost, operational complexity, and sync lag.
**Trade-off:** Less sophisticated relevance tuning and no fuzzy matching (mitigated by `pg_trgm` for short-string fields like deal titles).

### ADR-004: NextAuth JWT Sessions over Database Sessions
**Decision:** JWT stored in HttpOnly cookie; no session table.
**Rationale:** Stateless — no DB round-trip on every request to validate session. Vercel serverless functions are stateless by nature, making database sessions operationally awkward.
**Trade-off:** Cannot instantly revoke sessions server-side (JWT is valid until expiry). Mitigated by short expiry (30 days default) and ability to rotate `NEXTAUTH_SECRET` to invalidate all sessions in an emergency.

### ADR-005: Soft Deletes (Archive) over Hard Deletes
**Decision:** Contacts and Deals are archived (`isArchived = true`) rather than deleted.
**Rationale:** Sales data has long-term value; accidental deletion is a common support issue. Archived records remain in the audit log and can be restored by an admin.
**Trade-off:** Queries must include `WHERE isArchived = false` everywhere; mitigated by indexing `isArchived` and using a Prisma middleware default scope in Phase 3.

### ADR-006: Prisma over Raw SQL
**Decision:** Use Prisma ORM for all database access; raw SQL only for search triggers and migrations.
**Rationale:** Type-safe query builder prevents an entire class of runtime errors. Prisma generates TypeScript types directly from the schema, eliminating manual type definitions for DB models.
**Trade-off:** Prisma has overhead vs raw SQL and some advanced Postgres features require `prisma.$queryRaw`. Acceptable given the query complexity of a CRM.

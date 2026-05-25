# Simple CRM — System Specification

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Core Entities & Data Model](#3-core-entities--data-model)
4. [Features & Pages](#4-features--pages)
5. [API Design](#5-api-design)
6. [Pipeline Stages](#6-pipeline-stages)
7. [Search & Filtering](#7-search--filtering)
8. [Permissions & Roles](#8-permissions--roles)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Project Structure](#10-project-structure)
11. [Implementation Phases](#11-implementation-phases)
- [Appendix A — Key Dependencies](#appendix-a--key-dependencies)
- [Appendix B — Environment Variables](#appendix-b--environment-variables)

---

## 1. Project Overview

Simple CRM is a web-based customer relationship management application designed for small-to-medium sales teams. It provides contact and company management, a visual deal pipeline, activity logging, task tracking, and team collaboration features. The system prioritizes speed, simplicity, and data integrity over complex enterprise workflows.

**Primary users:** Sales representatives and sales managers at companies with 5–200 seats.

**Core value proposition:** A fast, no-bloat CRM that teams actually use — minimal setup, intuitive UI, and a clean data model.

---

## 2. Tech Stack

### Frontend

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Framework | Next.js (App Router) | 14.x | SSR, RSC, file-based routing, co-located API routes |
| Language | TypeScript | 5.x | Type safety across full stack |
| Styling | Tailwind CSS | 3.x | Utility-first, consistent design tokens |
| Component Library | shadcn/ui | latest | Radix primitives + Tailwind, fully owned components |
| State (server) | React Server Components + fetch | built-in | Minimize client bundle |
| State (client) | Zustand | 4.x | Lightweight client state (modals, UI state) |
| Forms | React Hook Form + Zod | latest | Validation shared with API schemas |
| Data Fetching | TanStack Query | 5.x | Client-side cache, optimistic updates, pagination |
| Icons | Lucide React | latest | Consistent icon set aligned with shadcn/ui |

### Backend

| Layer | Technology | Notes |
|---|---|---|
| API | Next.js Route Handlers | `/app/api/**` — no separate server process |
| ORM | Prisma | 5.x — type-safe DB access, migrations |
| Database | PostgreSQL 15 (via Supabase) | Managed, with pgBouncer connection pooling |
| Auth | Supabase Auth | Email/password, magic link, OAuth; session via `@supabase/ssr` cookies |
| Realtime | Supabase Realtime | Live Kanban updates; DB change subscriptions (Phase 2) |
| File Storage | Supabase Storage | Avatars bucket (Phase 1); attachments bucket (Phase 3) |
| Validation | Zod | Shared schemas between client and server |
| Background Jobs | Supabase Edge Functions | Async tasks (email digests, sync jobs) — Phase 3 |
| Email | Resend (Phase 3) | Transactional email + CRM email logging |

### Infrastructure

| Concern | Service | Notes |
|---|---|---|
| Frontend/API Hosting | Vercel | Automatic preview deploys per branch |
| Backend Platform | Supabase | Auth, Database, Storage, Realtime — single project per environment |
| Connection Pooler | Supabase pgBouncer (built-in) | Transaction mode for serverless functions; session mode for migrations |
| Local Dev | Supabase CLI (`supabase start`) | Docker-based local stack mirrors production exactly |
| Environment Config | Vercel Environment Variables | Separate dev/preview/prod sets |
| Error Monitoring | Sentry | |
| Analytics | Vercel Analytics | |

### Development Tooling

- **Package manager:** pnpm
- **Linting:** ESLint (Next.js config) + Prettier
- **Git hooks:** Husky + lint-staged (lint + type-check on commit)
- **Testing:** Vitest (unit) + Playwright (e2e, Phase 2)
- **Database seeding:** Prisma seed script with Faker.js
- **Local Supabase:** `supabase start` (Docker) — runs Auth, DB, Storage, Realtime locally

---

## 3. Core Entities & Data Model

### 3.1 Prisma Schema

> **Supabase note:** All IDs use `uuid()` to align with Supabase Auth's `auth.users.id` (UUID). The `profiles` table extends `auth.users` — Supabase Auth owns email/password/OAuth; we never store passwords in app tables. Row Level Security (RLS) policies are defined separately in `supabase/migrations/` (see §8.3).

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")    // pgBouncer (transaction mode) — app queries
  directUrl = env("DIRECT_URL")      // direct connection — migrations only
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum Role {
  ADMIN
  USER
}

enum DealStage {
  LEAD
  QUALIFIED
  PROPOSAL
  NEGOTIATION
  CLOSED_WON
  CLOSED_LOST
}

enum Currency {
  USD
  EUR
  GBP
  CAD
  AUD
}

enum ActivityType {
  CALL
  EMAIL
  MEETING
  NOTE
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}

enum TaskStatus {
  OPEN
  IN_PROGRESS
  DONE
  CANCELLED
}

enum CompanySize {
  SOLO          // 1
  MICRO         // 2–10
  SMALL         // 11–50
  MEDIUM        // 51–200
  LARGE         // 201–1000
  ENTERPRISE    // 1000+
}

// ─────────────────────────────────────────────
// PROFILE
// Extends auth.users (managed by Supabase Auth).
// A Postgres trigger auto-creates a Profile row
// whenever a user signs up via Supabase Auth.
// ─────────────────────────────────────────────

model Profile {
  // id mirrors auth.users.id — UUID assigned by Supabase Auth
  id        String   @id @db.Uuid
  email     String   @unique
  fullName  String?
  avatarUrl String?  // Supabase Storage public URL
  role      Role     @default(USER)
  team      String?  // free-text team/department label
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // CRM relations
  ownedContacts Contact[]  @relation("ContactOwner")
  ownedDeals    Deal[]     @relation("DealOwner")
  assignedTasks Task[]     @relation("TaskAssignee")
  activities    Activity[] @relation("ActivityCreator")
  auditLogs     AuditLog[]

  @@index([email])
  @@index([role])
  @@map("profiles")
}

// ─────────────────────────────────────────────
// TAG
// ─────────────────────────────────────────────

model Tag {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name      String   @unique
  color     String   @default("#6366f1") // hex color for UI badge
  createdAt DateTime @default(now())

  contacts  ContactTag[]
  companies CompanyTag[]

  @@index([name])
  @@map("tags")
}

// ─────────────────────────────────────────────
// COMPANY
// ─────────────────────────────────────────────

model Company {
  id          String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String
  domain      String?      @unique // e.g. "acme.com"
  industry    String?
  size        CompanySize?
  website     String?
  phone       String?
  // Address (embedded, not normalized — CRM simplicity)
  street      String?
  city        String?
  state       String?
  postalCode  String?
  country     String?
  description String?      @db.Text
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  contacts     Contact[]
  deals        Deal[]
  tags         CompanyTag[]

  // Full-text search vector (populated by trigger)
  searchVector Unsupported("tsvector")?

  @@index([name])
  @@index([domain])
  @@index([industry])
  // GIN index on searchVector created via raw migration
  @@map("companies")
}

model CompanyTag {
  companyId String  @db.Uuid
  tagId     String  @db.Uuid
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([companyId, tagId])
  @@map("company_tags")
}

// ─────────────────────────────────────────────
// CONTACT
// ─────────────────────────────────────────────

model Contact {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  firstName   String
  lastName    String
  email       String?
  phone       String?
  jobTitle    String?
  companyId   String?  @db.Uuid
  ownerId     String   @db.Uuid  // references profiles.id
  linkedInUrl String?
  avatarUrl   String?
  notes       String?  @db.Text
  isArchived  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company      Company?      @relation(fields: [companyId], references: [id], onDelete: SetNull)
  owner        Profile       @relation("ContactOwner", fields: [ownerId], references: [id])
  tags         ContactTag[]
  deals        Deal[]        @relation("DealPrimaryContact")
  dealContacts DealContact[]
  activities   Activity[]
  tasks        Task[]

  // Full-text search vector
  searchVector Unsupported("tsvector")?

  @@index([email])
  @@index([companyId])
  @@index([ownerId])
  @@index([lastName, firstName])
  @@index([isArchived])
  @@map("contacts")
}

model ContactTag {
  contactId String  @db.Uuid
  tagId     String  @db.Uuid
  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([contactId, tagId])
  @@map("contact_tags")
}

// ─────────────────────────────────────────────
// DEAL
// ─────────────────────────────────────────────

model Deal {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title            String
  value            Decimal?  @db.Decimal(15, 2)
  currency         Currency  @default(USD)
  stage            DealStage @default(LEAD)
  probability      Int?      // 0–100, auto-set by stage default or manual
  closeDate        DateTime?
  primaryContactId String?   @db.Uuid
  companyId        String?   @db.Uuid
  ownerId          String    @db.Uuid  // references profiles.id
  description      String?   @db.Text
  isArchived       Boolean   @default(false)
  wonAt            DateTime? // set when stage → CLOSED_WON
  lostAt           DateTime? // set when stage → CLOSED_LOST
  lostReason       String?
  probabilityManuallySet Boolean @default(false)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  primaryContact Contact?          @relation("DealPrimaryContact", fields: [primaryContactId], references: [id], onDelete: SetNull)
  company        Company?          @relation(fields: [companyId], references: [id], onDelete: SetNull)
  owner          Profile           @relation("DealOwner", fields: [ownerId], references: [id])
  contacts       DealContact[]
  activities     Activity[]
  tasks          Task[]
  stageHistory   DealStageHistory[]

  @@index([stage])
  @@index([ownerId])
  @@index([companyId])
  @@index([closeDate])
  @@index([isArchived])
  @@map("deals")
}

// Many-to-many: additional contacts on a deal
model DealContact {
  dealId    String  @db.Uuid
  contactId String  @db.Uuid
  role      String? // e.g. "Decision Maker", "Champion"
  deal      Deal    @relation(fields: [dealId], references: [id], onDelete: Cascade)
  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@id([dealId, contactId])
  @@map("deal_contacts")
}

// Audit trail for pipeline stage transitions
model DealStageHistory {
  id        String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  dealId    String     @db.Uuid
  fromStage DealStage?
  toStage   DealStage
  changedAt DateTime   @default(now())
  changedBy String?    @db.Uuid  // profiles.id

  deal      Deal       @relation(fields: [dealId], references: [id], onDelete: Cascade)

  @@index([dealId])
  @@map("deal_stage_history")
}

// ─────────────────────────────────────────────
// ACTIVITY
// ─────────────────────────────────────────────

model Activity {
  id          String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  type        ActivityType
  subject     String?      // short headline
  body        String?      @db.Text
  occurredAt  DateTime     @default(now())
  contactId   String?      @db.Uuid
  dealId      String?      @db.Uuid
  createdById String       @db.Uuid  // references profiles.id
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  contact     Contact?  @relation(fields: [contactId], references: [id], onDelete: SetNull)
  deal        Deal?     @relation(fields: [dealId], references: [id], onDelete: SetNull)
  createdBy   Profile   @relation("ActivityCreator", fields: [createdById], references: [id])

  @@index([contactId])
  @@index([dealId])
  @@index([createdById])
  @@index([occurredAt])
  @@index([type])
  @@map("activities")
}

// ─────────────────────────────────────────────
// TASK
// ─────────────────────────────────────────────

model Task {
  id           String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title        String
  description  String?      @db.Text
  dueDate      DateTime?
  priority     TaskPriority @default(MEDIUM)
  status       TaskStatus   @default(OPEN)
  contactId    String?      @db.Uuid
  dealId       String?      @db.Uuid
  assignedToId String       @db.Uuid  // references profiles.id
  createdById  String       @db.Uuid  // references profiles.id
  completedAt  DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  contact    Contact?  @relation(fields: [contactId], references: [id], onDelete: SetNull)
  deal       Deal?     @relation(fields: [dealId], references: [id], onDelete: SetNull)
  assignedTo Profile   @relation("TaskAssignee", fields: [assignedToId], references: [id])

  @@index([assignedToId])
  @@index([status])
  @@index([dueDate])
  @@index([contactId])
  @@index([dealId])
  @@map("tasks")
}

// ─────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────

model AuditLog {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String?  @db.Uuid  // references profiles.id
  action    String   // CREATE | UPDATE | DELETE
  entity    String   // "Contact" | "Deal" | etc.
  entityId  String   @db.Uuid
  changes   Json?    // diff object: { field: [oldValue, newValue] }
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  user      Profile? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([entity, entityId])
  @@index([userId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### 3.2 Default Stage Probability Map

| Stage | Default Probability |
|---|---|
| LEAD | 10% |
| QUALIFIED | 25% |
| PROPOSAL | 50% |
| NEGOTIATION | 75% |
| CLOSED_WON | 100% |
| CLOSED_LOST | 0% |

### 3.3 Supabase Auth → Profile Trigger

A Postgres function + trigger automatically creates a `profiles` row whenever a user signs up via Supabase Auth. Applied via a Supabase migration (not Prisma):

```sql
-- supabase/migrations/20240101000000_create_profile_trigger.sql

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3.4 Full-Text Search Setup

Two PostgreSQL triggers (applied via raw Prisma migration) maintain `tsvector` columns:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- contacts search vector: first name, last name, email, job title, notes
CREATE INDEX contacts_search_idx ON contacts USING GIN(search_vector);

CREATE FUNCTION contacts_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW."firstName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."lastName", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."jobTitle", '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.notes, '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_search_trigger
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION contacts_search_update();

-- companies search vector: name, domain, industry, description
CREATE INDEX companies_search_idx ON companies USING GIN(search_vector);

CREATE FUNCTION companies_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.domain, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.industry, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_search_trigger
  BEFORE INSERT OR UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION companies_search_update();

-- pg_trgm index for deal title search
CREATE INDEX deals_title_trgm_idx ON deals USING GIN (title gin_trgm_ops);
```

---

## 4. Features & Pages

### 4.1 Dashboard (`/dashboard`)

**Purpose:** Landing page after login. Gives a snapshot of the sales pipeline and workload.

**Sections:**
- **Pipeline summary cards** — count and total value per stage (horizontal bar or funnel visualization)
- **My open tasks** — next 5 tasks due, sorted by due date + priority; quick checkbox to mark done
- **Recent activity feed** — last 10 activities across all contacts/deals; each item links to its parent entity
- **Quick-add FAB** — floating button to add Contact, Deal, or Activity without leaving the dashboard
- **Deals closing this week/month** — table of deals with `closeDate` in the next 7 and 30 days

**Data:** Aggregated with Prisma `groupBy` + `count` + `sum` on deals. Activities via `findMany` ordered by `occurredAt DESC`. Tasks filtered by `assignedToId = session.user.id AND status != DONE`.

### 4.2 Contacts List (`/contacts`)

**Purpose:** Browse, search, and manage the full contact database.

**Features:**
- Paginated table (cursor-based, 25 per page)
- **Search bar** — full-text search via `search_vector`
- **Filters panel** (sidebar or popover):
  - By tag (multi-select)
  - By company (autocomplete)
  - By owner (dropdown — admins see all, users see self + team)
  - By created date range
  - Show/hide archived
- **Sort** by: name (A–Z / Z–A), created date, last activity date
- **Columns:** Avatar, Full Name, Email, Phone, Company, Tags, Owner, Last Activity, Created At
- **Bulk actions** (checkbox-select rows): assign owner, add tag, archive, delete (admin only)
- **Export CSV** button (filtered set)
- **+ New Contact** button → opens slide-over form

**Form fields (create/edit):** `firstName`, `lastName`, `email`, `phone`, `jobTitle`, `company` (autocomplete), `tags` (multi-select), `linkedInUrl`, `notes`, `owner` (admin only)

### 4.3 Contact Detail (`/contacts/[id]`)

**Layout:** Two-column — left (70%) = main content, right (30%) = sidebar.

**Left — tabs:**
- **Overview** — all contact fields, editable inline or via Edit modal
- **Activity Timeline** — chronological list of all activities with Add Activity button
- **Tasks** — tasks linked to this contact; quick-add inline

**Right sidebar:**
- Contact meta (owner, created date, last updated)
- Tags (inline edit)
- Linked Deals (cards with stage badge + value; link to deal detail)
- Company card (if linked; link to company detail)

### 4.4 Companies List (`/companies`)

Identical pattern to Contacts List with company-specific fields and filters (industry, size).

### 4.5 Company Detail (`/companies/[id]`)

**Left — tabs:**
- **Overview** — company fields, editable
- **Contacts** — list of associated contacts (inline mini-table)
- **Deals** — list of deals linked to this company
- **Activity Timeline** — aggregated activities from all linked contacts + deals

**Right sidebar:** Tags, owner/created meta, website/domain links.

### 4.6 Deals / Pipeline (`/deals`)

**Two views (toggle):**

**Kanban view (default):**
- One column per stage, horizontally scrollable on mobile
- Each card shows: deal title, company name, value (formatted), primary contact avatar, close date (color-coded: red if past, orange if this week)
- Drag-and-drop to move between stages (`@dnd-kit/core`)
- Optimistic UI update on drag; server confirms via `PATCH /api/deals/[id]`
- `+ Add Deal` button at top of each column
- Column header shows count + total value

**List view:**
- Table with columns: Title, Company, Contact, Stage (badge), Value, Close Date, Owner, Last Activity
- Same filter/sort/search/pagination pattern as Contacts

**Shared filters:** stage (multi-select), owner, close date range, value range.

### 4.7 Deal Detail (`/deals/[id]`)

**Left — tabs:**
- **Overview** — all deal fields editable; stage selector (visual step progress bar)
- **Contacts** — linked contacts with role labels; add/remove contacts
- **Activity Timeline** — activities on this deal
- **Tasks** — tasks on this deal

**Right sidebar:**
- Value + probability display (shows weighted value = value × probability)
- Stage history timeline (from `DealStageHistory`)
- Owner, created date, close date
- Quick stage-change buttons

### 4.8 Tasks List (`/tasks`)

**Features:**
- **Filter tabs:** My Tasks | All Tasks (admins) | Overdue | Due Today | Due This Week
- Filter by: status, priority, assignee, linked contact, linked deal
- Sort by: due date, priority, created date
- Inline status toggle (checkbox); inline priority badge (click to cycle)
- **Columns:** Title, Priority (badge), Status, Due Date, Linked To, Assigned To
- `+ New Task` button

### 4.9 Activity Log (`/activities`)

**Features:**
- Chronological feed, newest first
- Filter by: type (call/email/meeting/note), date range, contact, deal, created by
- Each row: type icon, subject, body preview (truncated), linked contact/deal, date, creator
- Click to expand inline or navigate to detail
- `+ Log Activity` button

### 4.10 Settings (`/settings`)

| Sub-page | Access | Description |
|---|---|---|
| `/settings/profile` | All | Edit name, email, password, avatar |
| `/settings/users` | Admin | Invite by email, change role, deactivate/reactivate |
| `/settings/tags` | Admin | CRUD tags — name + color picker, usage count |
| `/settings/pipeline` | Admin | Rename/reorder stages, set default probability + color |
| `/settings/integrations` | Admin | Connect Gmail, Google Calendar (Phase 3) |

---

## 5. API Design

All routes are under `/app/api/`. Auth required on every route unless noted.

**Standard response envelopes:**

```typescript
// Success
{ data: T, meta?: PaginationMeta }

// Error
{ error: string, code?: string, details?: ZodIssue[] }

type PaginationMeta = {
  nextCursor: string | null
  prevCursor: string | null
  total: number
  hasNextPage: boolean
}
```

### 5.1 Auth Routes

Auth is handled entirely by **Supabase Auth** — no custom auth route handlers needed for sign-in, sign-up, OAuth, or magic links. Supabase provides client-side methods and handles all token/session lifecycle.

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/callback` | OAuth callback handler — exchanges code for session via `@supabase/ssr` | Public |
| POST | `/api/auth/confirm` | Email confirmation / magic-link token exchange | Public |

> Sign-in, sign-up, password reset, and OAuth redirects are initiated client-side via `supabase.auth.signInWithPassword()`, `supabase.auth.signInWithOAuth()`, etc. — no custom API routes required.

### 5.2 User Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/users` | List all users | Admin |
| POST | `/api/users/invite` | Invite new user by email | Admin |
| GET | `/api/users/me` | Get current user profile | User |
| PATCH | `/api/users/me` | Update current user profile | User |
| PATCH | `/api/users/[id]` | Update user role/status | Admin |
| DELETE | `/api/users/[id]` | Deactivate user | Admin |

### 5.3 Contact Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/contacts` | List contacts (paginated, filterable) | User |
| POST | `/api/contacts` | Create contact | User |
| GET | `/api/contacts/[id]` | Get contact with relations | User |
| PATCH | `/api/contacts/[id]` | Update contact fields | Owner or Admin |
| DELETE | `/api/contacts/[id]` | Archive contact (soft delete) | Owner or Admin |
| POST | `/api/contacts/[id]/tags` | Add tags to contact | Owner or Admin |
| DELETE | `/api/contacts/[id]/tags/[tagId]` | Remove tag from contact | Owner or Admin |
| GET | `/api/contacts/[id]/activities` | List activities for contact | User |
| GET | `/api/contacts/[id]/tasks` | List tasks for contact | User |
| GET | `/api/contacts/[id]/deals` | List deals for contact | User |
| POST | `/api/contacts/bulk` | Bulk actions (tag, assign, archive) | User |
| GET | `/api/contacts/export` | Export filtered contacts as CSV | User |

**Query params for `GET /api/contacts`:**
```
cursor, limit (default 25, max 100)
search            — full-text query
tagIds            — comma-separated tag IDs (AND match)
companyId
ownerId
createdAfter, createdBefore  — ISO dates
sortBy            — lastName | createdAt | lastActivityAt
sortDir           — asc | desc
includeArchived   — boolean, default false
```

### 5.4 Company Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/companies` | List companies | User |
| POST | `/api/companies` | Create company | User |
| GET | `/api/companies/[id]` | Get company with contacts + deals | User |
| PATCH | `/api/companies/[id]` | Update company | User |
| DELETE | `/api/companies/[id]` | Archive company | Admin |
| GET | `/api/companies/[id]/contacts` | List contacts at company | User |
| GET | `/api/companies/[id]/deals` | List deals for company | User |

**Query params for `GET /api/companies`:**
```
cursor, limit
search
industry
size              — CompanySize enum
tagIds
sortBy            — name | createdAt | dealCount
sortDir
```

### 5.5 Deal Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/deals` | List deals | User |
| POST | `/api/deals` | Create deal | User |
| GET | `/api/deals/[id]` | Get deal with relations | User |
| PATCH | `/api/deals/[id]` | Update deal (incl. stage change) | Owner or Admin |
| DELETE | `/api/deals/[id]` | Archive deal | Owner or Admin |
| GET | `/api/deals/[id]/activities` | List activities on deal | User |
| GET | `/api/deals/[id]/tasks` | List tasks on deal | User |
| POST | `/api/deals/[id]/contacts` | Link contact to deal | User |
| DELETE | `/api/deals/[id]/contacts/[contactId]` | Unlink contact from deal | User |
| GET | `/api/deals/[id]/stage-history` | Get stage transition history | User |
| GET | `/api/deals/pipeline` | Aggregated kanban data (count + value per stage) | User |

**Query params for `GET /api/deals`:**
```
cursor, limit
search
stage             — comma-separated DealStage values
ownerId
companyId
closeDateAfter, closeDateBefore
valueMin, valueMax
sortBy            — title | closeDate | value | createdAt
sortDir
view              — list | kanban (kanban returns all, no cursor)
```

### 5.6 Activity Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/activities` | List activities | User |
| POST | `/api/activities` | Log new activity | User |
| GET | `/api/activities/[id]` | Get activity | User |
| PATCH | `/api/activities/[id]` | Edit activity | Creator or Admin |
| DELETE | `/api/activities/[id]` | Delete activity | Creator or Admin |

**Query params for `GET /api/activities`:**
```
cursor, limit
type              — ActivityType
contactId
dealId
createdById
occurredAfter, occurredBefore
sortDir           — asc | desc (default: desc)
```

### 5.7 Task Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/tasks` | List tasks | User |
| POST | `/api/tasks` | Create task | User |
| GET | `/api/tasks/[id]` | Get task | User |
| PATCH | `/api/tasks/[id]` | Update task | User |
| DELETE | `/api/tasks/[id]` | Delete task | Admin or Assignee |

**Query params for `GET /api/tasks`:**
```
cursor, limit
status            — TaskStatus
priority          — TaskPriority
assignedToId
contactId
dealId
dueBefore, dueAfter
mine              — boolean (shorthand: assignedToId = session.user.id)
overdue           — boolean (dueDate < now AND status != DONE)
```

### 5.8 Tag Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/tags` | List all tags | User |
| POST | `/api/tags` | Create tag | Admin |
| PATCH | `/api/tags/[id]` | Update tag name/color | Admin |
| DELETE | `/api/tags/[id]` | Delete tag (unlinks from all records) | Admin |

### 5.9 Search Route

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/search` | Global search across contacts, companies, deals | User |

**Query params:** `q` (required, min 2 chars), `limit` (default 5 per entity type)

**Response:**
```typescript
{
  data: {
    contacts: ContactSearchResult[]
    companies: CompanySearchResult[]
    deals: DealSearchResult[]
  }
}
```

### 5.10 Dashboard Route

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/dashboard` | Aggregated pipeline + activity + task summary | User |

---

## 6. Pipeline Stages

### Default Stages

| Order | Key | Display Name | Default Probability | Color |
|---|---|---|---|---|
| 1 | LEAD | Lead | 10% | `#94a3b8` slate |
| 2 | QUALIFIED | Qualified | 25% | `#60a5fa` blue |
| 3 | PROPOSAL | Proposal | 50% | `#a78bfa` violet |
| 4 | NEGOTIATION | Negotiation | 75% | `#fb923c` orange |
| 5 | CLOSED_WON | Closed Won | 100% | `#4ade80` green |
| 6 | CLOSED_LOST | Closed Lost | 0% | `#f87171` red |

### Stage Transition Rules

- Moving to `CLOSED_WON` sets `wonAt = now()` and `probability = 100`.
- Moving to `CLOSED_LOST` sets `lostAt = now()`, `probability = 0`, and prompts for `lostReason`.
- Moving out of a closed stage back to an open stage clears `wonAt`/`lostAt`.
- Every stage change records a row in `DealStageHistory`.
- If `probabilityManuallySet = true`, stage changes do not reset probability.

---

## 7. Search & Filtering

### 7.1 Global Search

Endpoint: `GET /api/search?q=<query>`

1. Query sanitized and wrapped in `plainto_tsquery('english', $query)`.
2. Contacts and companies searched via `search_vector @@ tsquery`, ranked by `ts_rank`.
3. Deals searched via `title ILIKE '%query%'` using `pg_trgm` GIN index.
4. Returns top 5 per entity type; target < 200ms.

### 7.2 Per-List Filtering

Filter state stored in URL query parameters — shareable and bookmarkable. Managed client-side with `nuqs`. Every filter change triggers a new API call.

```
/contacts?search=john&tagIds=tag_abc,tag_def&ownerId=user_xyz&sortBy=createdAt&sortDir=desc
```

### 7.3 Tag Filtering

Multiple tags use AND semantics by default (contact must have ALL selected tags):

```sql
WHERE contacts.id IN (
  SELECT contact_id FROM contact_tags
  WHERE tag_id IN (...)
  GROUP BY contact_id
  HAVING COUNT(DISTINCT tag_id) = <number_of_selected_tags>
)
```

### 7.4 Cursor-Based Pagination

All list APIs use cursor pagination (not offset) for stability and performance.

Cursor encodes `{ id: string, sortValue: any }` as base64url JSON:

```typescript
// lib/api/pagination.ts
function encodeCursor(id: string, sortValue: unknown): string {
  return Buffer.from(JSON.stringify({ id, sortValue })).toString('base64url')
}

function decodeCursor(cursor: string): { id: string; sortValue: unknown } {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
}
```

Prisma query pattern:
```typescript
const where = cursor
  ? { OR: [
      { [sortField]: { [gtOrLt]: cursor.sortValue } },
      { [sortField]: cursor.sortValue, id: { [gtOrLt]: cursor.id } }
    ]}
  : {}
```

---

## 8. Permissions & Roles

### 8.1 Role Matrix

| Action | Admin | User (own record) | User (other's record) |
|---|---|---|---|
| View contacts | All | All | All |
| Create contact | Yes | Yes | Yes |
| Edit contact | Any | Yes | No |
| Archive/delete contact | Any | Yes | No |
| View deals | All | All | All |
| Create deal | Yes | Yes | Yes |
| Edit deal / change stage | Any | Yes | No |
| Archive/delete deal | Any | Yes | No |
| View activities | All | All | All |
| Create activity | Yes | Yes | Yes |
| Edit/delete activity | Any | Own | No |
| Manage tasks | Any | Own + assigned | No |
| Manage users | Yes | No | No |
| Manage tags | Yes | No | No |
| Configure pipeline | Yes | No | No |
| View audit log | Yes | No | No |
| Export data | Yes | Yes | — |

"Own" = record's `ownerId` or `createdById` matches `session.user.id`.

### 8.2 Server-Side Enforcement

Route handlers verify the Supabase session and enforce ownership before any write:

```typescript
// lib/permissions.ts
export function assertCanEdit(
  userId: string,
  userRole: Role,
  record: { ownerId?: string; createdById?: string }
): void {
  if (userRole === 'ADMIN') return
  if (record.ownerId !== userId && record.createdById !== userId) {
    throw new ForbiddenError('You do not have permission to edit this record')
  }
}
```

`middleware.ts` uses `@supabase/ssr`'s `updateSession()` to validate the Supabase Auth cookie on every request — unauthenticated users are redirected to `/login`.

Admin-only settings pages (`/settings/users`, `/settings/tags`, `/settings/pipeline`) check `role === ADMIN` in the page component via the user's `profiles` row and return 403 otherwise.

### 8.3 Row-Level Security (RLS) Policies

Supabase RLS is enabled on all CRM tables as a **second layer of defense**. Even if the Next.js API layer is bypassed, the database itself enforces access rules. Policies are defined in `supabase/migrations/` and applied via `supabase db push`.

```sql
-- Enable RLS on all tables
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs  ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, only update their own
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Contacts: all authenticated users can read; only owner or admin can write
CREATE POLICY "contacts_select_all" ON contacts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "contacts_insert_authenticated" ON contacts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "contacts_update_own_or_admin" ON contacts
  FOR UPDATE USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "contacts_delete_own_or_admin" ON contacts
  FOR DELETE USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Same pattern applied to: companies, deals, activities, tasks
-- Audit logs: insert for all authenticated; select for admins only
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
```

### 8.4 Row-Level Visibility

Phase 1: All authenticated users can view all records (RLS SELECT policies are open to all authenticated users).
Phase 3 enhancement: team-scoped visibility — add `team` column check to RLS SELECT policies so users only see records owned by their team.

---

## 9. Non-Functional Requirements

### 9.1 Performance Targets

| Metric | Target |
|---|---|
| List page first contentful paint | < 500ms (p95) |
| Global search response time | < 200ms (p95) |
| Kanban board load (all open deals) | < 800ms (p95) |
| API response (simple CRUD) | < 100ms (p95) |
| API response (list with filters) | < 300ms (p95) |

**Strategies:**
- React Server Components for initial render (no client JS waterfall)
- Explicit Prisma `select` to avoid over-fetching
- pgBouncer connection pooling (Supabase built-in)
- `next/cache` revalidation tags (`revalidateTag('contacts')` on mutations)
- GIN indexes on full-text search vectors
- Prisma `include` with nested `select` to prevent N+1 queries

### 9.2 Scalability

- Cursor pagination handles millions of rows without degradation
- Native Postgres full-text search — no external service needed up to ~1M contacts
- Stateless Next.js API routes scale horizontally on Vercel
- Connection pooling required: serverless functions + Postgres = many short-lived connections

### 9.3 Responsiveness

- Mobile-first Tailwind layouts
- Kanban: horizontally scrollable with touch support
- List tables: collapse to card layout below `md` breakpoint
- Navigation: mobile bottom bar; desktop sidebar
- shadcn/ui components are WCAG 2.1 AA accessible and keyboard-navigable

### 9.4 Audit Trail

Every create/update/delete on Contact, Company, Deal, Activity, and Task writes an `AuditLog` row via Prisma middleware:

```typescript
// lib/prisma.ts
prisma.$use(async (params, next) => {
  const result = await next(params)
  const auditableModels = ['Contact', 'Company', 'Deal', 'Activity', 'Task']
  if (auditableModels.includes(params.model ?? '') && params.action !== 'findMany') {
    await prisma.auditLog.create({
      data: {
        entity: params.model!,
        entityId: result?.id ?? params.args.where?.id,
        action: mapPrismaActionToAuditAction(params.action),
        userId: getCurrentUserId(), // from AsyncLocalStorage context
        changes: computeChanges(params),
      }
    })
  }
  return result
})
```

### 9.5 Security

- **Auth security handled by Supabase Auth** — password hashing (bcrypt), brute-force protection, secure token storage, and PKCE for OAuth flows
- **Row Level Security (RLS)** enforced at the database level as a second authorization layer (§8.3)
- CSRF protection: Supabase Auth uses PKCE + `@supabase/ssr` HttpOnly cookies
- All input validated and sanitized with Zod before DB access
- SQL injection: prevented by Prisma parameterized queries; raw queries use `Prisma.sql` tagged template
- Rate limiting on auth routes: handled by Supabase Auth (built-in); additional app-level rate limiting on write endpoints via `@upstash/ratelimit` + Vercel KV (Phase 3)
- Security headers via `next.config.js` `headers()` (`Content-Security-Policy`, `X-Frame-Options`, etc.)
- `SUPABASE_SERVICE_ROLE_KEY` never exposed to client bundle — only used server-side in route handlers

### 9.6 Error Handling

- API errors: structured JSON + HTTP status codes — 400 (validation), 401, 403, 404, 409 (conflict), 500
- Client: TanStack Query error boundaries + toast notifications (shadcn/ui Sonner)
- Sentry captures unhandled exceptions on both server and client

---

## 10. Project Structure

```
simple-crm/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # App shell: sidebar + top nav
│   │   ├── dashboard/page.tsx
│   │   ├── contacts/
│   │   │   ├── page.tsx                # Contacts list
│   │   │   └── [id]/page.tsx           # Contact detail
│   │   ├── companies/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── deals/
│   │   │   ├── page.tsx                # Pipeline + list view
│   │   │   └── [id]/page.tsx
│   │   ├── tasks/page.tsx
│   │   ├── activities/page.tsx
│   │   └── settings/
│   │       ├── layout.tsx              # Settings sub-nav
│   │       ├── profile/page.tsx
│   │       ├── users/page.tsx
│   │       ├── tags/page.tsx
│   │       └── pipeline/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── contacts/
│   │   │   ├── route.ts                # GET list, POST create
│   │   │   ├── bulk/route.ts
│   │   │   ├── export/route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts            # GET, PATCH, DELETE
│   │   │       ├── activities/route.ts
│   │   │       ├── deals/route.ts
│   │   │       └── tags/
│   │   │           ├── route.ts
│   │   │           └── [tagId]/route.ts
│   │   ├── companies/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── contacts/route.ts
│   │   │       └── deals/route.ts
│   │   ├── deals/
│   │   │   ├── route.ts
│   │   │   ├── pipeline/route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── activities/route.ts
│   │   │       ├── contacts/
│   │   │       │   ├── route.ts
│   │   │       │   └── [contactId]/route.ts
│   │   │       ├── stage-history/route.ts
│   │   │       └── tasks/route.ts
│   │   ├── activities/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── tasks/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── tags/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── users/
│   │   │   ├── route.ts
│   │   │   ├── me/route.ts
│   │   │   ├── invite/route.ts
│   │   │   └── [id]/route.ts
│   │   ├── search/route.ts
│   │   └── dashboard/route.ts
│   ├── layout.tsx                      # Root layout (HTML, providers)
│   └── globals.css
│
├── components/
│   ├── ui/                             # shadcn/ui generated components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopNav.tsx
│   │   └── MobileNav.tsx
│   ├── contacts/
│   │   ├── ContactsTable.tsx
│   │   ├── ContactForm.tsx
│   │   ├── ContactFilters.tsx
│   │   └── ContactCard.tsx
│   ├── companies/
│   │   ├── CompaniesTable.tsx
│   │   └── CompanyForm.tsx
│   ├── deals/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   ├── DealCard.tsx
│   │   ├── DealsTable.tsx
│   │   ├── DealForm.tsx
│   │   └── StageSelect.tsx
│   ├── activities/
│   │   ├── ActivityTimeline.tsx
│   │   ├── ActivityItem.tsx
│   │   └── ActivityForm.tsx
│   ├── tasks/
│   │   ├── TasksTable.tsx
│   │   ├── TaskForm.tsx
│   │   └── TaskStatusToggle.tsx
│   ├── common/
│   │   ├── GlobalSearch.tsx
│   │   ├── TagBadge.tsx
│   │   ├── TagSelect.tsx
│   │   ├── OwnerSelect.tsx
│   │   ├── CursorPagination.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── SlideOver.tsx
│   │   ├── EmptyState.tsx
│   │   └── DataTable.tsx
│   └── dashboard/
│       ├── PipelineSummary.tsx
│       ├── RecentActivity.tsx
│       └── UpcomingTasks.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                   # createServerClient() — for RSC, Route Handlers, middleware
│   │   ├── client.ts                   # createBrowserClient() — for Client Components
│   │   └── admin.ts                    # createAdminClient() — service role, server-only
│   ├── prisma.ts                       # Prisma client singleton + audit middleware
│   ├── permissions.ts                  # assertCanEdit(), assertIsAdmin()
│   ├── validations/
│   │   ├── contact.ts                  # Zod schemas
│   │   ├── company.ts
│   │   ├── deal.ts
│   │   ├── activity.ts
│   │   ├── task.ts
│   │   └── profile.ts
│   ├── api/
│   │   ├── response.ts                 # Typed success/error response helpers
│   │   ├── pagination.ts               # Cursor encode/decode helpers
│   │   └── errors.ts                   # ForbiddenError, NotFoundError, etc.
│   ├── search.ts                       # Full-text search query builder
│   ├── format.ts                       # Currency, date, name formatters
│   └── utils.ts                        # General helpers (cn, etc.)
│
├── hooks/
│   ├── useContacts.ts
│   ├── useCompanies.ts
│   ├── useDeals.ts
│   ├── useTasks.ts
│   ├── useActivities.ts
│   ├── useSearch.ts                    # Global search with debounce
│   ├── useCurrentUser.ts               # Reads Supabase Auth session + profiles row
│   ├── useRealtimeDeals.ts             # Supabase Realtime subscription for Kanban (Phase 2)
│   └── useFilters.ts                   # nuqs-based URL filter state
│
├── types/
│   ├── index.ts
│   ├── api.ts                          # API request/response types
│   ├── entities.ts                     # Extended entity types (Prisma + computed fields)
│   └── supabase.ts                     # Generated Supabase DB types (via supabase gen types)
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                         # Dev seed (Faker.js — 50 contacts, 10 companies)
│   └── migrations/                     # Prisma-managed migrations (schema changes)
│
├── supabase/
│   ├── config.toml                     # Supabase CLI project config
│   └── migrations/                     # Supabase-managed migrations (RLS, triggers, extensions)
│       ├── 20240101000000_create_profile_trigger.sql
│       ├── 20240101000001_enable_rls.sql
│       └── 20240101000002_rls_policies.sql
│
├── middleware.ts                       # Supabase Auth session refresh + route protection
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
├── .env.local                          # gitignored
└── package.json
```

---

## 11. Implementation Phases

### Phase 1 — MVP (Weeks 1–4)

**Goal:** Auth, contacts, companies — the foundation of the data model.

**Week 1 — Foundation:**
- Initialize Next.js 14 project (TypeScript, Tailwind, shadcn/ui, pnpm)
- Initialize Supabase project (local: `supabase init` + `supabase start`)
- Configure Prisma pointing to Supabase PostgreSQL (`DATABASE_URL` + `DIRECT_URL`)
- Implement full Prisma schema (all models); run initial migration (`prisma migrate dev`)
- Apply Supabase migrations: profile trigger, RLS enable, RLS policies
- Configure `@supabase/ssr` — `lib/supabase/server.ts`, `client.ts`, `middleware.ts`
- Implement auth pages (`/login`, `/register`) using `supabase.auth.signInWithPassword()` / `signUp()`
- `middleware.ts` using `updateSession()` — protects all `/(dashboard)` routes
- Set up Supabase Storage: create `avatars` bucket (public) and `attachments` bucket (private)
- Write seed script; run `prisma db seed`

**Week 2 — Contacts:**
- `GET/POST /api/contacts` with full filter/sort/cursor pagination
- `GET/PATCH/DELETE /api/contacts/[id]`
- Tag management endpoints + `GET /api/tags`
- Contacts list page (server component + DataTable)
- Contact detail page (overview tab + edit modal)
- ContactForm with Zod validation + React Hook Form

**Week 3 — Companies:**
- Companies API routes (full CRUD + pagination)
- Companies list + detail pages
- Company-to-contact linkage
- Settings: Tags management page (admin)
- Settings: Profile page

**Week 4 — Polish + Deploy:**
- App shell (sidebar, top nav, mobile nav)
- Dashboard page with live data
- Error boundaries + loading states (Suspense)
- Deploy to Vercel + Supabase production
- README + `.env.example`

**Exit criteria:** A logged-in user can manage contacts and companies end-to-end; data persists in production Postgres.

---

### Phase 2 — Deals, Activities, Tasks (Weeks 5–8)

**Goal:** Full sales workflow — pipeline, logging, and task management.

**Week 5 — Deals Pipeline:**
- Deal API routes (full CRUD, stage transitions, pipeline aggregation)
- `DealStageHistory` recording on every stage change
- Kanban board (`@dnd-kit/core` drag-and-drop)
- Deal list view + deal detail page
- `GET /api/deals/pipeline` for kanban column data

**Week 6 — Activities:**
- Activity API routes (full CRUD)
- `ActivityTimeline` component (contact detail + deal detail + activities page)
- Log Activity form; activities list page

**Week 7 — Tasks:**
- Task API routes (full CRUD)
- Tasks list page with filter tabs
- TaskForm + inline status toggle
- Wire tasks into contact detail + deal detail
- Dashboard: connect live pipeline summary + upcoming tasks

**Week 8 — Realtime + Polish:**
- **Supabase Realtime:** `useRealtimeDeals()` hook — subscribe to `deals` table changes; live Kanban updates across all connected users without polling
- Playwright e2e tests for critical paths (login, create contact, create deal, move stage)
- Settings: Users management (admin — invite via `supabase.auth.admin.inviteUserByEmail()`, role change, deactivate)
- Settings: Pipeline stage configuration
- Audit log viewer in Settings (admin)
- Performance audit: check p95 on list pages; add missing indexes

**Exit criteria:** Full deal lifecycle from Lead to Closed Won; activities logged; tasks tracked; live Kanban updates working.

---

### Phase 3 — Search, Reporting, Integrations (Weeks 9–14)

**Goal:** Power features — search, reporting, and external integrations.

**Week 9 — Search:**
- Full-text search triggers + GIN indexes (raw migration)
- `GET /api/search` global search endpoint
- `GlobalSearch` command palette (Cmd+K shortcut)
- Per-list search connected to full-text endpoint

**Week 10 — Reporting:**
- `GET /api/reports/pipeline` — deal value by stage over time
- `GET /api/reports/activities` — activity count by type and user
- `GET /api/reports/leaderboard` — deals won by user (current month/quarter)
- Reports page with charts (Recharts)
- CSV export for all list endpoints

**Week 11 — Gmail Integration:**
- OAuth 2.0 flow for Gmail (Google provider via NextAuth)
- Store Gmail tokens per user (encrypted at rest)
- Sync recent emails matching contact email addresses → Activity records of type EMAIL
- Email compose from Contact detail page

**Week 12 — Google Calendar Integration:**
- OAuth flow for Google Calendar
- Sync upcoming meetings with contact participants → Activity records of type MEETING
- "Schedule Meeting" action from Contact/Deal detail

**Week 13 — Notifications:**
- In-app notification bell (task due reminders, deal stage changes) — built on Supabase Realtime
- Email notifications via Resend (daily digest of overdue tasks) — triggered by Supabase Edge Function on cron schedule

**Week 14 — Hardening:**
- Security review: rate limiting on all write endpoints, input sanitization audit
- Redis caching layer for dashboard aggregations (Upstash Redis)
- Mobile UX pass: Kanban usable on tablet, all forms usable on mobile
- API reference auto-generated from Zod schemas (`zod-to-openapi`)
- Staging environment + QA pass

**Exit criteria:** Production-ready CRM with search, reporting, and Gmail integration working end-to-end.

---

## Appendix A — Key Dependencies

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "typescript": "5.x",
    "@prisma/client": "5.x",
    "@supabase/supabase-js": "2.x",
    "@supabase/ssr": "0.x",
    "zod": "3.x",
    "react-hook-form": "7.x",
    "@hookform/resolvers": "3.x",
    "@tanstack/react-query": "5.x",
    "zustand": "4.x",
    "nuqs": "1.x",
    "@dnd-kit/core": "6.x",
    "@dnd-kit/sortable": "8.x",
    "tailwindcss": "3.x",
    "class-variance-authority": "0.7.x",
    "clsx": "2.x",
    "tailwind-merge": "2.x",
    "lucide-react": "latest",
    "recharts": "2.x",
    "date-fns": "3.x",
    "sonner": "1.x"
  },
  "devDependencies": {
    "prisma": "5.x",
    "supabase": "1.x",
    "@faker-js/faker": "8.x",
    "vitest": "1.x",
    "@playwright/test": "1.x",
    "eslint": "8.x",
    "prettier": "3.x",
    "husky": "9.x",
    "lint-staged": "15.x"
  }
}
```

---

## Appendix B — Environment Variables

```bash
# .env.example

# ─── Supabase ──────────────────────────────────────────────────────────────────
# Public keys — safe to expose to the browser
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"

# Service role key — SERVER ONLY, never expose to client
# Used for admin operations (invite user, bypass RLS)
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

# ─── Database (Prisma) ─────────────────────────────────────────────────────────
# Pooled connection via pgBouncer — used by the running app
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=10"

# Direct connection — used only by prisma migrate (bypasses pgBouncer)
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"

# ─── OAuth providers (optional — Phase 3) ─────────────────────────────────────
# Configure in Supabase Dashboard → Auth → Providers
# (no env vars needed in app — Supabase handles the OAuth flow)

# ─── Email (Phase 3) ───────────────────────────────────────────────────────────
RESEND_API_KEY=""

# ─── Error monitoring ──────────────────────────────────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=""

# ─── Rate limiting (Phase 3) ──────────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

> **Important:** Commit `.env.example` to the repository. Add `.env.local` to `.gitignore`.
> The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — only import it in server-side files (`lib/supabase/admin.ts`). Never reference it in client components or expose it in the browser bundle.

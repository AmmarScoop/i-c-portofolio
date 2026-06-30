# Kids Tech Academy — Portfolio & Progress Management System

A full-stack MVP for a children's technology academy (Robotics + Programming tracks) built with
Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui-style components, Prisma, NextAuth, Zod,
React Hook Form, and the `xlsx` package for Excel import/export.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + hand-built shadcn/ui-pattern components (Radix UI primitives)
- **Prisma ORM** — defaults to **SQLite** for zero-config local dev; swap to **PostgreSQL/Supabase** by
  changing one line (see "Switching to Postgres/Supabase" below)
- **NextAuth** (Credentials provider, JWT sessions) for both Admin and Child logins
- **Zod** for all server-side and Excel-row validation
- **React Hook Form** for the course form (other forms use plain controlled state for brevity)
- **xlsx** for the children Excel template + bulk import

## Getting started

```bash
cd academy
npm install
cp .env.example .env
# Generate a real secret for NEXTAUTH_SECRET:
openssl rand -base64 32

npm run db:push      # creates prisma/dev.db (SQLite) from schema.prisma
npm run db:seed      # seeds demo courses, children, badges, attendance, payments
npm run dev           # http://localhost:3000
```

### Demo logins (created by the seed script)

| Role  | Email               | Password   |
|-------|---------------------|------------|
| Admin | admin@academy.test  | Admin123!  |
| Child | sara@academy.test   | Child123!  |

(You can override the admin email/password via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`.)

## Switching to PostgreSQL / Supabase

1. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
   to `provider = "postgresql"`.
2. Set `DATABASE_URL` in `.env` to your Supabase/Postgres connection string.
3. Run `npx prisma migrate dev --name init` instead of `db:push`.
4. Optionally wire up `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (already present in
   `.env.example`) if you want to store session product photos in Supabase Storage instead of the
   local filesystem — see "Image uploads (session product photos)" below.
5. Optional: Postgres supports native Prisma `enum` types (SQLite doesn't). The schema currently
   models `role`, `track`, `outputType`, `status`, and `triggerType` as plain `String` columns
   precisely so it works out of the box on SQLite; the TypeScript union types in `src/lib/enums.ts`
   and the `z.enum([...])` schemas in `src/lib/zod-schemas.ts` are what actually enforce the allowed
   values today. If you move to Postgres you can convert these fields back to native `enum` blocks
   for DB-level enforcement too — not required, just an optional hardening step.

## Project structure

```
academy/
  prisma/
    schema.prisma       # all 11 entities from the spec
    seed.ts              # demo data: 6 courses x 3 levels x 4 sessions, children, badges, payments
  src/
    lib/
      auth.ts            # NextAuth config + requireAdmin()/requireChild() guards
      prisma.ts          # singleton Prisma client
      enums.ts            # TS union types for the string-based "enum" columns (see below)
      portfolio.ts         # PortfolioItem <-> Attendance sync logic (see below)
      badges.ts             # badge auto-award rule engine
      excel.ts                # Excel template/export builder + import parser/validator
      zod-schemas.ts           # all Zod validation schemas
      storage.ts                # session product photo storage abstraction (local disk / Supabase)
      image-validation.ts        # shared client+server image type/size validation
    middleware.ts          # route guard: /admin/** -> ADMIN only, /child/** -> CHILD only
    components/
      ui/                  # shadcn/ui-style primitives (button, card, dialog, table, tabs, ...)
      admin/                # admin-only interactive components (forms, dialogs, attendance grid)
      child/                # child-facing nav
    app/
      login/                # shared login page
      admin/                # admin pages (see Pages below)
      child/                # child pages (see Pages below)
      api/                  # route handlers (all admin routes call requireAdmin() server-side)
```

## Pages

**Admin** (all under `/admin`, guarded by middleware + `requireAdmin()`):
`dashboard`, `courses`, `courses/[id]` (levels & sessions), `children`, `children/[id]`,
`enrollments`, `attendance`, `payments`, `badges`.

**Child** (all under `/child`, guarded by middleware + `requireChild()`):
`dashboard`, `progress`, `portfolio`, `badges`. A child can only ever see their own data — every
child API/page derives `childId` from the session, never from a URL parameter.

## Core business logic

### Why enum-like fields are plain Strings

Prisma's SQLite connector does not support native `enum` types (Postgres/MySQL do). Since this
project defaults to SQLite for zero-config local dev, fields like `role`, `track`, `outputType`,
`status`, and `triggerType` are declared as `String` in `prisma/schema.prisma`. Allowed values are
enforced at the application layer instead: `src/lib/enums.ts` holds the canonical TypeScript union
types, and `src/lib/zod-schemas.ts` validates every value with `z.enum([...])` before it reaches the
database. See "Switching to PostgreSQL/Supabase" above if you want native DB-level enums.

### Auto-portfolio generation from attendance

Defined in `src/lib/portfolio.ts`, called from `POST /api/attendance`:

- Marking a child **PRESENT** for a session **upserts** a `PortfolioItem` keyed on the unique
  `(childId, sessionId)` pair, using the session's `outputType` / `outputName` / `outputDescription`
  **and `productImageUrl`** (copied onto `PortfolioItem.mediaUrl` — see "Session product photos"
  below). Because it's an upsert on a unique pair, re-saving attendance for the same child/session
  **never creates duplicates**.
- Re-saving PRESENT also re-syncs title/description/type/photo onto the existing auto-created item,
  so if an admin edits the session's output or photo *after* attendance was already marked, the
  child's portfolio item picks up the change automatically.
- Changing attendance away from PRESENT (to ABSENT/LATE/EXCUSED) **soft-deactivates** the
  auto-created item (`isActive = false`) instead of deleting it. This is intentional — see the
  doc-comment in `portfolio.ts` for the full rationale (preserves any media/notes an admin added,
  and is fully reversible if the attendance mistake is corrected back to PRESENT). All portfolio
  views (admin + child) filter on `isActive = true`, so deactivated items never show up — the user
  experience is identical to deletion, without the risk of losing data.
- Manually-created portfolio items (`createdAutomatically = false`) are never touched by this sync.

### Session product photos

Each `CourseSession` has optional `productImageUrl` / `productImageAlt` fields — a photo of the
real robot/app/game/story/project a child builds (or is expected to build) in that session.

- **Admin side** (`/admin/courses/[id]`): the session add/edit dialog
  (`src/components/admin/session-form-dialog.tsx`) includes an upload control
  (`src/components/admin/image-upload-field.tsx`) to upload, preview, replace, or remove the photo
  before saving. The sessions grid shows a thumbnail (or a type-emoji placeholder if no photo was
  uploaded yet).
- **Upload pipeline**: the upload field posts the file to `POST /api/upload`, which validates type
  (JPG/PNG/WEBP only) and size (max 5MB, see `src/lib/image-validation.ts`) and stores it via the
  `src/lib/storage.ts` abstraction — local disk by default, or Supabase Storage if configured (see
  below). Replacing or removing a photo best-effort deletes the old file from storage.
- **Child side**: the photo flows onto the child's portfolio item the moment attendance is marked
  PRESENT (see above), and is shown on `/child/dashboard` (as a "coming up next" preview and in
  "Latest Creations"), `/child/progress` (thumbnail on each completed session), and
  `/child/portfolio` (full gallery card). If no photo was ever uploaded, every child view falls back
  to a friendly colorful gradient + emoji for that project's output type
  (`src/components/shared/product-image.tsx`) — the UI never shows a broken image.

### Image uploads (session product photos)

`src/lib/storage.ts` implements a small storage abstraction with two backends, selected
automatically based on environment variables — no code changes needed to switch:

1. **Local filesystem (default)** — works with zero configuration. Files are written to
   `public/uploads/session-products/` and served by Next.js at `/uploads/session-products/<file>`.
   Good for local dev/demos; not suitable for most serverless hosting (ephemeral filesystem).
2. **Supabase Storage** — used automatically once both `NEXT_PUBLIC_SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` are set in `.env`. Talks to the Supabase Storage REST API directly via
   `fetch()`, so **no extra npm dependency** is required. To enable it:
   1. Create a Storage bucket named **`session-products`** in your Supabase project.
   2. Mark the bucket **Public** (Storage → `session-products` → Settings → Public bucket) so the
      stored URLs are directly viewable by the child UI without signed URLs.
   3. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` (see `.env.example`).

No new required environment variables were introduced — these two were already present (unused) in
`.env.example` from the original MVP and are now actually wired up.

### Badge auto-award engine

Defined in `src/lib/badges.ts`, called after every attendance save (and after enrollment status
changes to COMPLETED). Supports `ATTENDANCE_COUNT`, `PROJECT_COUNT`, `LEVEL_COMPLETED`, and
`COURSE_COMPLETED` triggers; `MANUAL` badges are only awarded via the "Assign Badge" action on a
child's profile. Awarding is idempotent (`ChildBadge` has a unique `(childId, badgeId)` constraint).

### Excel import / export

- `GET /api/children/template` — downloads an `.xlsx` template with columns `fullName, parentName,
  parentPhone, parentEmail, age, dateOfBirth, emergencyContactName, emergencyContactPhone,
  schoolName, preferredTrack, skillLevel, notes` and one example row. Only `fullName`, `parentName`,
  `parentPhone`, and `age` are required — the rest are optional student-management fields.
- `POST /api/children/import` (`mode=preview`) — parses the uploaded file, validates every row with
  Zod (`childImportRowSchema` in `src/lib/zod-schemas.ts`), flags duplicates (matched on `fullName` +
  `parentPhone`, against both the database and other rows in the same file), and returns a per-row
  valid/invalid report **without writing anything**.
- `POST /api/children/import` (`mode=commit`) — re-validates and creates only the valid, non-duplicate
  rows, returning the count actually imported.
- The admin UI (`Import from Excel` dialog on `/admin/children`) drives both steps: download template
  → upload → preview table with clear per-row errors → commit → success count.
- `POST /api/children/export` — bulk-export action from `/admin/children` (select rows → "Export to
  Excel"). Exports the selected children (or all, if no ids given) with their full student-management
  fields plus a derived course/enrollment/payment-status summary.

### Student management features

- **Children list filters** (`/admin/children`): search by name or parent phone, plus filters for
  age, course, track, payment status, and enrollment status, with sort by newest/name/age/most-unpaid
  — all encoded in the URL query string (shareable/bookmarkable).
- **Bulk actions**: select multiple children via checkboxes to export to Excel, enroll them all into
  a course, or award them all a badge in one action (`src/components/admin/children-table.tsx`).
- **Child profile tabs** (`/admin/children/[id]`): Overview / Enrollments / Attendance / Payments /
  Portfolio / Badges / Notes. Overview summarizes contact info, current course/level, progress %,
  payment + attendance summaries, latest portfolio items, and earned badges in one glance.
- **Internal notes** (`ChildNote` model): typed note history (GENERAL/BEHAVIOR/PROGRESS/PAYMENT/
  PARENT_COMMUNICATION) per child, with add/edit/delete from the Notes tab — separate from the
  short free-text `Child.notes` field used on the quick-add form.
- **Extra contact/context fields on `Child`**: `emergencyContactName`, `emergencyContactPhone`,
  `schoolName`, `preferredTrack`, `skillLevel` — all optional, shown on the child form and Overview tab.

## Arabic / RTL support

Admin UI labels are bilingual (English primary, Arabic secondary) throughout — courses, tracks,
attendance statuses, payment statuses, and nav labels all show both. The child login screen and
dashboard headers include Arabic text directly. `globals.css` includes `[dir="rtl"]` rules so any
container can be flipped to right-to-left by setting `dir="rtl"` on it (e.g. if you add a language
toggle that wraps the app in `<div dir="rtl">` for Arabic-speaking users). Full per-string i18n
(a language switcher translating every label) was treated as a stretch goal beyond this MVP — the
groundwork (bilingual labels, RTL-aware CSS) is in place to extend it.

## Important business-logic comments

Look for `/** ... */` doc comments above the exported functions in `src/lib/portfolio.ts` and
`src/lib/badges.ts` — they document the exact rules implemented (duplicate prevention, soft-delete
rationale, trigger semantics).

## A note on this build environment

This project was originally generated in a sandboxed environment with **no access to the npm
registry**, so the initial build could not be verified there. The session product photo feature
(schema changes, upload pipeline, child UI, student-management improvements) was added in a second
sandboxed session with the same restriction — `npx prisma generate` / `db push` / `npm run build`
could not be run there either, since even fetching the Prisma engine binary requires network access.
Every change was written by hand against the existing patterns in the codebase and statically
reviewed. **Before running the app, you must run, in order:**

```bash
npx prisma generate   # regenerates the Prisma Client with the new CourseSession/Child/ChildNote fields
npm run db:push        # applies the schema changes to your database
npm run db:seed         # re-seed demo data (now includes sample session photos, notes, etc.)
npm run build             # or `npm run dev` — verify no TypeScript/build errors
```

If anything surfaces, it's most likely a small import/typo, not a structural issue with the schema
or business logic — the new Prisma fields (`CourseSession.productImageUrl/productImageAlt`,
`Child.emergencyContactName/emergencyContactPhone/schoolName/preferredTrack/skillLevel`, the
`ChildNote` model) only become available to TypeScript after `prisma generate` runs locally.

## Acceptance checklist

- [x] Admin can create a full course structure (course → levels → sessions, each with an output).
- [x] Admin can import children from Excel (template download, preview, validation, commit).
- [x] Admin can enroll children into courses and change their current level/status.
- [x] Admin can mark session attendance (PRESENT/ABSENT/LATE/EXCUSED) for a whole roster at once.
- [x] Marking PRESENT auto-creates a portfolio item; toggling away soft-deactivates it (no duplicates).
- [x] Admin can track payment status per child per level (PAID/PARTIAL/UNPAID).
- [x] Admin can create badges with auto-award rules and manually assign any badge.
- [x] Child can log in and view their own progress, portfolio, and badges (and nothing else's).
- [x] Routes are protected by middleware (`/admin/**`, `/child/**`) plus server-side `requireAdmin()`/
      `requireChild()` checks in every API route and page.
- [x] Admin can upload/preview/replace/remove a product photo for each session.
- [x] The session product photo appears on the child dashboard/progress/portfolio pages, with a
      friendly fallback when no photo was uploaded.
- [x] Marking attendance PRESENT copies the session's product photo onto the auto-created
      `PortfolioItem.mediaUrl`; duplicates are prevented via the existing unique-constraint upsert.
- [x] Children list has search (name/phone), filters (age/course/track/payment/enrollment status),
      and sort (newest/name/age/most-unpaid).
- [x] Bulk actions on the children list: export to Excel, bulk-enroll, bulk-award badge.
- [x] Child profile is organized into Overview/Enrollments/Attendance/Payments/Portfolio/Badges/Notes tabs.
- [x] Admin can add, view, edit, and delete internal notes for a child (typed history).
- [x] Excel import template + export include the new student-management fields.
- [ ] App runs locally without TypeScript/Prisma/build/runtime errors — **could not be verified in
      this sandbox** (no network access to fetch the Prisma engine or run a real build); please run
      the commands above locally and report back if anything fails.

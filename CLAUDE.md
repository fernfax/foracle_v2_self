# CLAUDE.md — project conventions

Notes for Claude Code working in this repository. Keep brief; update when conventions change.

## Deployment

- **`main` is the production branch.** It is deployed to Render automatically on every push.
- **A push to `main` triggers a production deploy.** Always run `npm run build` locally before pushing to `main` so a broken build doesn't take production down. Type checking via `npx tsc --noEmit` alone is not sufficient — Render runs the full Next build.
- Feature work happens on `feature/*` branches and is merged into `main` when ready to ship.
- Do not force-push to `main`.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + Tailwind v4
- Drizzle ORM + Postgres (`drizzle.config.ts`, schemas in `db/`)
- Clerk auth (provider in `app/layout.tsx`, route protection in `app/(app)/layout.tsx`)
- Recharts for all data viz
- shadcn-style primitives in `components/ui/`

## Design system

- Brand source of truth: `design_guide/design_guide.md` (and the HTML reference alongside it).
- Tokens live in `app/globals.css` (`:root` + `.dark`). Brand utilities (`brand-terracotta`, `brand-deep-forest`, etc.) and the `font-display` (Space Grotesk) / `font-editorial` (Lora italic) families are in `tailwind.config.ts`.
- Chart palette helper: `lib/chart-palette.ts` — use `CHART_PALETTE`, `STATUS_COLORS`, `CHART_AXIS_STYLE` instead of inline hex.
- Brand divider strip: `components/ui/tile-motif.tsx`.
- Avoid hardcoded Tailwind brand-color utilities (`bg-blue-*`, `text-emerald-*`, etc.). Use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`) or the `brand-*` utilities.

## Commands

- `npm run dev` — Next dev server on `http://localhost:3000`
- `npm run build` — production build (run before pushing to `main`)
- `npx tsc --noEmit` — typecheck only
- `npm run db:studio` / `db:generate` / `db:migrate` / `db:push` — Drizzle workflows
- `npm test` — Vitest

## Out of scope by default

- `docs/` updates, schema changes, and unrelated branch state are not part of UI/UX tasks. Don't bundle them into a UI commit.

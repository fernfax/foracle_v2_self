# CLAUDE.md — project conventions

Notes for Claude Code working in this repository. Keep brief; update when conventions change.

## Deployment

- **`main` is the production branch.** It is deployed to Render automatically on every push.
- **A push to `main` triggers a production deploy.** Always run `npm run build` locally before pushing to `main` so a broken build doesn't take production down. Type checking via `npx tsc --noEmit` alone is not sufficient — Render runs the full Next build.
- Feature work happens on `feature/*` branches and is merged into `main` when ready to ship.
- Do not force-push to `main`.
- **Format and lint before committing.** Run `npm run format` and `npm run lint` (fix what it reports) before every commit. A husky `pre-commit` hook runs `lint-staged` (`eslint --fix` + `prettier --write`) over staged files as a safety net, but don't rely on it — keep the working tree clean so commits aren't polluted by reformatting unrelated lines.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + Tailwind v4
- Drizzle ORM + Postgres (`drizzle.config.ts`, schemas in `db/`)
- Clerk auth (provider in `app/layout.tsx`, route protection in `app/(app)/layout.tsx`)
- Recharts for all data viz
- shadcn-style primitives in `components/ui/`2

## Design system

- Brand source of truth: `design_guide/design_guide.md` (and the HTML reference alongside it).
- Tokens live in `app/globals.css` (`:root` + `.dark`). Brand utilities (`brand-terracotta`, `brand-deep-forest`, etc.) and the `font-display` (Space Grotesk) / `font-editorial` (Lora italic) families are in `tailwind.config.ts`.
- Chart palette helper: `lib/chart-palette.ts` — use `CHART_PALETTE`, `STATUS_COLORS`, `CHART_AXIS_STYLE` instead of inline hex.
- Brand divider strip: `components/ui/tile-motif.tsx`.
- Avoid hardcoded Tailwind brand-color utilities (`bg-blue-*`, `text-emerald-*`, etc.). Use semantic tokens (`bg-primary`, `text-muted-foreground`, `border-border`) or the `brand-*` utilities.

## Commands

- `npm run dev` — Next dev server on `http://localhost:3000`
- `npm run build` — production build (run before pushing to `main`)
- `npm run format` — Prettier write across the repo (config in `.prettierrc.json`)
- `npm run format:check` — Prettier check only (no writes)
- `npm run lint` — ESLint (`eslint .`, flat config in `eslint.config.mjs`); `npm run lint:fix` to auto-fix
- `npx tsc --noEmit` — typecheck only
- `npm run db:studio` / `db:generate` / `db:migrate` / `db:push` — Drizzle workflows
- `npm test` — Vitest
- `npm run test:db-setup` — **one-time only**. Creates a `foracle_test` database next to your dev one, enables pgvector, and applies the schema. Required before any service-level real-DB tests run. Re-run after schema changes.

## Out of scope by default

- `docs/` updates, schema changes, and unrelated branch state are not part of UI/UX tasks. Don't bundle them into a UI commit.

## QA expectations

For any UI/UX change — especially in `components/income/`, `components/expenses/`, `components/policies/`, or anywhere a live preview gets committed on release (drag-to-commit, debounced inputs, optimistic UI):

1. Use the gstack `browse` skill to dogfood the actual user gesture against the dev server before reporting the task complete. Type checking and build success do not verify feature correctness.
2. If preview state can diverge from committed state, screenshot or read DOM/network state **before** and **after** the gesture and verify both agree. The Mar→Feb drag bug shipped because preview math was correct in isolation but the commit pipeline double-applied the delta — only an end-to-end gesture test would have caught it.
3. For substantial features, proactively suggest `/qa` so the user can opt into the full test-fix-verify loop.
4. If you can't browser-test the change (no dev server, headless dependencies missing, auth flow blocking), say so explicitly rather than claiming success.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:

- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

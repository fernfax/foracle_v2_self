# Session change log

> ⚠️ **RECONSTRUCTED FILE (partial).** The original `SESSION_CHANGES.md` was
> accidentally deleted during a feature-flag build session and rebuilt from
> memory. Sections 1–2 are reconstructed from a brief glimpse of the original
> and may be **incomplete or imprecise** — verify against the actual diff before
> relying on them. Section 3 (feature flags + admin portal) is authored fresh
> this session and is accurate. Treat the top sections as a checklist to
> re-confirm, not a source of truth.

Running log of changes made this build session. **Verification (Playwright e2e
+ gstack browse + full `npm run build`) is deferred to the end of the session**
and run all at once.

Legend: ✅ done · ⏳ verify at end-of-session

---

## 1. Landing page revamp (`app/page.tsx`) — ⏳ reconstructed, verify
- Full redesign of the public marketing page: new hero + showpiece, five feature
  sections with real screenshots (Sankey, projection, assets, investments,
  insurances), flagship **Foracle AI (Beta)** section, mobile/PWA section, CTA,
  footer. Brand tokens (no inline hex), keeps shader + TileMotif.
- Widened content containers to `max-w-7xl` (less side gutter).
- Image `width`/`height` hints updated to match the retina screenshot ratios.
- Screenshots committed under `public/screens/`.

## 2. Real PWA support — ⏳ reconstructed, verify
- `public/manifest.webmanifest` — standalone, themed, categorized.
- App icons added: `public/apple-icon.png`, `public/icon-192.png`,
  `public/icon-512.png`.
- (Re-confirm any `app/layout.tsx` metadata/manifest wiring against the diff.)

## 2b. CPF explainer additions (`lib/cpf-calculator.ts`) — ⏳ reconstructed, verify
- Exposed display constants/helpers for a CPF explainer UI: `OW_CEILING_AMOUNT`,
  `OW_CEILING_YEAR`, `ANNUAL_WAGE_CEILING_AMOUNT`, `CPF_RATE_BRACKETS`,
  `getCPFBracketIndex`, `CPF_ALLOCATION_BRACKETS`, `getCPFAllocationBracketIndex`,
  and `computeBonusCPF` (Additional-Wage / bonus CPF). Consumed by
  `components/income/incomes-beta/quick-adjust-pad.tsx`.

---

## 3. Per-household feature flags + cross-tenant admin portal — ✅ this session

### Core flag system (per-household)
- `lib/feature-flags/registry.ts` — single source of truth: 15 `FlagKey`s
  (routes + sub-features) with `requires`/`enhances` dependency graph,
  `defaultEnabled`, `stability`. Betas default off (`income.beta`,
  `income.timelineStudio`).
- `lib/feature-flags/resolve.ts` — pure cascade+block resolver: `resolveFlags`,
  `wouldEnableAlso`, `dependentsOf`, `assertNoCycles`.
- `lib/services/feature-flags.ts` — family-scoped persistence on
  `families.featureFlags` (JSON map). Family-id-explicit fns
  (`getFamilyFlagOverrides` / `setFamilyFlagOverride` /
  `getResolvedFlagsForFamily`) are the source of truth; ctx-based fns delegate.
- `lib/actions/feature-flags.ts` — `"use server"` wrappers (self-serve).
- `lib/api-schemas/feature-flags.ts` — Zod `flagKeySchema` built from the registry.
- `components/feature-flags/feature-flag-provider.tsx` — client context:
  `useFeatureFlag`, `useFeatureFlags`, `useToggleFlag`.

### Schema / migration
- `db/schema.ts` — `feature_flags text` moved from `users` → `families`
  (per-household scope). Migration `drizzle/0003_add_feature_flags.sql` edited
  to add to `families` + `DROP COLUMN IF EXISTS` on `users`. Applied locally via
  `db:push`. ⚠️ Production migration path needs confirming (journal drift —
  `db:generate` can't run non-interactively).

### Consumer gating
- `components/sidebar/sidebar.tsx` — nav items filtered by resolved flags;
  superadmin-only "Admin" link (threaded `isSuperAdmin` prop).
- Route guards: `lib/feature-flags/guard.ts` (`assertFeatureEnabled`) on the 9
  gatable route `page.tsx` files (404 when off).
- `components/dashboard/cashflow-sankey.tsx` — Sankey/Projection views gated,
  fallback + both-off placeholder.
- `app/(app)/user/client.tsx` + `components/income/incomes-beta/*` — `income.beta`
  gates the beta view; `income.bonus` / `income.futureMilestones` /
  `income.timelineStudio` gate affordances.
- `components/developer/feature-flags-panel.tsx` — self-serve dependency-aware
  toggle panel mounted on `/developer`.

### Cross-tenant admin portal
- `lib/admin/superadmin.ts` — `isSuperAdminEmail` / `getIsSuperAdmin` /
  `assertSuperAdmin`, driven by `FORACLE_SUPERADMIN_EMAILS` (Clerk primary email).
- `lib/actions/admin-feature-flags.ts` — `adminListFamilies`,
  `adminGetFamilyResolvedFlags`, `adminGetFamilyOverrides`, `adminSetFamilyFlag`
  (each `assertSuperAdmin` first).
- `app/(app)/admin/page.tsx` — superadmin-gated route (non-admins →
  `redirect("/overview")`).
- `components/admin/admin-feature-flags-panel.tsx` — family picker +
  dependency-aware toggles operating on any household.
- `app/(app)/layout.tsx`, `components/sidebar/dashboard-shell.tsx` — thread
  `isSuperAdmin` from server to the sidebar.
- `.env.local.example` — documented `FORACLE_SUPERADMIN_EMAILS`.

### Verification (this session)
- `npx tsc --noEmit` → clean.
- `npx vitest run lib/feature-flags` → 10/10 pass.
- `npm run build` → compiles, all 34 pages generated, `/admin` present.
- ⏳ End-to-end browser QA of the toggle gestures NOT yet run (needs authed dev
  session + a configured superadmin email).

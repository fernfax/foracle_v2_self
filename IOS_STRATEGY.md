# Foracle iOS Port — Strategic Plan

## Context

Foracle is a Next.js 16 + React 19 personal/family finance webapp deployed on Render. The goal is to ship an iOS app (Android to follow) that gives users full-featured access on the go, with quick expense capture as the daily-driver surface. Today the app exposes almost all data through Next.js server actions (no REST API), authenticates via Clerk's web SDK, and is mid-migration toward family-scoped data — most actions still filter by `userId` alone despite `familyId` columns existing on every relevant table.

The mobile app must (a) work for households where multiple family members enter shared data, (b) be safe to use offline for the most common action (logging an expense), and (c) feel native enough to pass App Store review for a finance app.

### Decisions locked in with the user

| Decision | Choice |
|---|---|
| Mobile stack | React Native + Expo (TypeScript, Expo Router) |
| v1 scope | Feature parity with web |
| Backend approach | New `/api/v1/*` REST routes inside the existing Next.js app |
| Offline | Daily expense capture only — AsyncStorage queue + idempotent bulk endpoint |
| Repo structure | Monorepo: `apps/web` + `apps/mobile` + `packages/shared` + `packages/api-client` |
| Auth | Clerk Expo SDK (`@clerk/clerk-expo`), bearer JWT verified by Clerk middleware |
| Shipping order | Sequential — backend API stable + tested before mobile work starts |
| Native features v1 | Push notifications + biometric unlock (widget deferred to v1.1) |
| Family scoping fix | Done as part of Phase B, service-by-service |
| Mid-flight WIP on `main` | Land `incomes-beta` + `developer/` to `main` before Phase A |
| Assistant streaming | Non-streaming v1 (matches web today); SSE upgrade in v1.1 |

---

## Phases

### Phase A — Monorepo migration (2–4 days)

**Goal**: convert the current single-package Next.js repo into an npm-workspaces + Turborepo monorepo without breaking Render's auto-deploy of `main`.

**Pre-req**: land the in-flight `incomes-beta` and `developer/` work onto `main` first; both create large diffs in files that will move during the migration.

**Target structure**:
```
apps/web/            # current repo contents (app/, components/, lib/, db/, drizzle/, public/, next.config.ts, …)
apps/mobile/         # added in Phase C
packages/shared/     # platform-agnostic: Zod schemas, Drizzle row types via $inferSelect, currency/date/cpf helpers, brand color hex
packages/api-client/ # thin fetch wrapper, accepts fetch impl + token getter
turbo.json
tsconfig.base.json
package.json         # workspaces declaration only
```

**Files to move into `packages/shared/`** (and update imports across `apps/web`):
- `lib/currency-utils.ts`
- `lib/cpf-calculator.ts`, `lib/cpf-projection-calculator.ts`
- `lib/family-relationships.ts`
- `lib/expense-calculator.ts`, `lib/budget-utils.ts`, `lib/balance-calculator.ts` (audit for `react`/`next` imports first)
- `lib/chart-palette.ts` color constants only (Recharts config stays in web)

**Render cutover**:
1. Set Render service to `Root Directory: apps/web`, `Build: cd ../.. && npm install && npx turbo run build --filter=web`, `Start: cd apps/web && npm start`.
2. Run on a Render preview environment first; only flip the main service in the same PR that merges the migration.
3. Tag the pre-migration commit (`pre-monorepo-<date>`) for instant rollback.

**Use `git mv`** (not `mv` + `git add`) so history is preserved on every moved file.

**Verification**: `npx turbo run build` clean from root; Render preview env serves the production app; `tsc --noEmit` clean across the workspace.

---

### Phase B — REST API `/api/v1/*` + family-scoping migration (2–3 weeks)

**Goal**: build a versioned, family-scoped REST API inside `apps/web/app/api/v1/*` that both the existing web and the future mobile app can consume — completing the `userId` → `familyId` scoping migration as services are extracted.

**Layout**:
```
apps/web/app/api/v1/
  _lib/{auth.ts, errors.ts, response.ts, pagination.ts}
  daily-expenses/{route.ts, [id]/route.ts, bulk/route.ts}
  expenses/, expense-categories/, expense-subcategories/
  incomes/, goals/, policies/
  assets/{properties, vehicles, investments}
  family/{members, invitations}
  onboarding/{status, complete}
  user/{singlish-mode, tour, push-tokens}     # push-tokens added for Phase E
  assistant/{chat, threads/[id]}
  budget/, holdings/, health/
```

**Service extraction rule** (the part that fixes family scoping):
> A route handler may import a server action directly only if the action already calls `getCurrentUserAndFamily()`. Otherwise, extract the action's body into `lib/services/<resource>.ts`, swap it to family scoping, then have BOTH the route and the original action call the new service.

Reusable today:
- `lib/auth-context.ts` — `getCurrentUserAndFamily()` is the contract every service must adopt
- `lib/actions/incomes-beta.ts`, `lib/actions/family-invitations.ts` — already family-scoped, can be imported directly
- `lib/ai/orchestrator.ts`, `lib/ai/threads.ts`, `lib/ai/rate-limiter.ts` — `/api/v1/assistant/chat` wraps these (non-streaming, matches `app/api/ai/chat/route.ts`)

**Conventions**:
- Success: `{ success: true, data, meta?: { cursor } }`
- Error: `{ success: false, error: { code, message, details? } }` with codes `UNAUTHORIZED|FORBIDDEN|NOT_FOUND|VALIDATION_ERROR|CONFLICT|RATE_LIMITED|INTERNAL`
- Pagination: cursor-based, opaque base64 of `{createdAt, id}`, default 50/max 200
- Validation: every body/query parsed with the matching Zod schema from `@foracle/shared`
- Decimals stay as strings on the wire (no quiet `Number()` cast)
- Idempotency: write endpoints accept a client-generated `id`; duplicate creates return 200 with the existing row (required for the offline queue)

**Versioning**:
- URL prefix `/api/v1/*`; breaking changes require `/api/v2/*` alongside, not in-place edits
- `X-Client-Version`, `X-Client-Platform` headers in; `X-Api-Version`, `X-Api-Min-Client-Version` headers out — client shows an "update required" wall if its version is below the floor

**Tests** (Vitest):
- Per resource: happy path (200), unauthenticated (401), invalid body (422), **family-scoping (user A cannot read user B's family's data)** — write the family-scoping test FIRST against the new service
- Hosted Postgres test DB or `docker-compose.yml` (already in repo)
- Block merge to `main` if the API suite fails

**Critical files**:
- New: `apps/web/lib/services/{expenses,daily-expenses,goals,policies,property-assets,vehicle-assets,investments,family-members,expense-categories,expense-subcategories,onboarding,user,budget}.ts`
- New: every route file under `apps/web/app/api/v1/**`
- Migration: `apps/web/db/schema.ts` — add `push_tokens` table (`id, userId, familyId, token, platform, createdAt, revokedAt`)
- Existing actions in `apps/web/lib/actions/*` — body replaced with a service call, behavior unchanged for web

**Verification**: every endpoint returns expected shape with `curl` + a Clerk session JWT; web app still works end-to-end; `/api/v1/health` returns `{ ok, version, commit }`.

---

### Phase C — Mobile foundation (1–2 weeks)

**Goal**: bootstrap Expo app, theming, navigation, auth, and a working `health` round-trip.

**Setup**:
- `pnpm create expo-app apps/mobile --template tabs` (or Expo Router blank); SDK 53+, RN 0.76+, strict TS
- `metro.config.js` configured for workspace packages (watches `packages/*` and root, `nodeModulesPaths` includes root `node_modules`)
- `tsconfig.json` extends `tsconfig.base.json`

**Auth**:
- `@clerk/clerk-expo` + `expo-secure-store` token cache
- Root `_layout.tsx` wraps `<ClerkProvider tokenCache={SecureStoreCache}>`
- `packages/api-client` factory: `createClient({ baseUrl, getToken, fetch? })`; mobile passes `() => clerk.session.getToken()`
- TanStack Query for data; query keys = `[resource, filter]`; mutations invalidate by resource; refetch on app foreground

**Theming**: NativeWind v4 — port `tailwind.config.ts` brand-* utilities; transcribe `app/globals.css` `:root` + `.dark` tokens into `global.css`. Fonts (Space Grotesk, Lora) loaded via `expo-font`. Safe-area via `react-native-safe-area-context`. iOS blur via `expo-blur` `<BlurView>` (no `backdrop-blur` classname).

**Navigation**: 5-tab pattern (Overview, Expenses, Goals, Assistant, More) — More is a stack listing Assets, Policies, Investments, Budget, User. Web's 9-item `components/mobile-nav.tsx` is the IA reference but not a 1:1 port (5-tab matches iOS HIG).

**Folder structure**: `apps/mobile/app/` mirrors `apps/web/app/(app)/*` (Expo Router groups: `(auth)`, `(app)`, `onboarding`).

**Verification**: app boots on iOS Simulator; sign-in via Clerk works; `/api/v1/health` returns 200; theme matches the design tokens against a reference screenshot.

---

### Phase D — Feature implementation (4–6 weeks)

**Ship order** (each ships end-to-end before starting the next):
1. **Daily expenses** + categories — validates auth/API/offline/theming on the daily-driver surface
2. **Recurring expenses**
3. **Overview/Dashboard** (partial, enriched as later phases land)
4. **Income** (incomes-beta is already family-scoped — easiest after expenses)
5. **Budget** (depends on income + expenses)
6. **Goals** (depends on budget surplus calc)
7. **Policies**, **Assets** (forms over CRUD, parallelizable)
8. **Family members** management
9. **Assistant** chat (last — riskiest UX, non-streaming v1)

**Charts**: Victory Native XL (built on react-native-skia). Reuse `lib/chart-palette.ts` hex values. Avoid `react-native-svg-charts` (unmaintained).

**Gestures (drag-to-commit)**: `react-native-gesture-handler` + `react-native-reanimated` v3. Pattern that prevents the Mar→Feb double-apply bug noted in CLAUDE.md: preview state in a Reanimated shared value, commit state in React state, mutation called once on gesture-end via `runOnJS` — never per frame. Snapshot at gesture-start, diff at gesture-end, commit delta exactly once.

**Numpad**: port `components/budget/expense-numpad.tsx` 1:1 — div→`<View>`, button→`<Pressable>`, add `expo-haptics` light impact per tap.

**Assistant**: `POST /api/v1/assistant/chat` returns full response (non-streaming, matching `app/api/ai/chat/route.ts`). Mobile shows spinner then renders message + `toolsUsed` chips. Tool calls happen entirely server-side. SSE upgrade is a v1.1 contract addition.

**Offline expense queue** (`apps/mobile/src/lib/offline-queue.ts`):
- AsyncStorage key `foracle:queue:v1`
- Op shape: `{ id (client UUID, used as idempotency key), type, payload, createdAt, attempts, lastError? }`
- Flow: optimistic insert into TanStack Query cache → enqueue → NetInfo "connected" event drains queue via `POST /api/v1/daily-expenses/bulk` → server response per-op `{id, status: created|conflict|failed}` → success removes from queue, failure increments `attempts`, banner shown after 3 attempts
- Cap queue at 500 entries with a banner — never silently drop
- Server idempotency keyed on client `id`: duplicate creates return 200 with the existing row, not 409

**Verification per feature**: TanStack Query happy path, error toast on 4xx/5xx, pull-to-refresh, empty state, loading skeleton. Daily expenses specifically: airplane-mode submit → reconnect → server has the row, no dupes after a second reconnect.

---

### Phase E — Native features: push + biometric (1–2 weeks; widget deferred to v1.1)

**Push notifications**:
- `expo-notifications` + `expo-device`; permission request at first relevant feature use, not app boot
- On sign-in mobile POSTs APNs token to `/api/v1/user/push-tokens` (schema added in Phase B)
- Server-side triggers: budget threshold crossings (inside `lib/services/budget.ts`); family-activity events (large expense, new income)
- Use Expo Push API initially (handles APNs cert management); migrate to direct APNs if richer payloads needed
- `EXPO_ACCESS_TOKEN` env var on Render
- Notification copy defaults to generic ("New activity in your family budget"); detailed previews opt-in to avoid finance data on lock screen

**Biometric unlock**:
- `expo-local-authentication`
- Flag stored in SecureStore on user opt-in
- Cold launch + resume after >5 min background → full-screen biometric prompt before mounting `_layout`
- After 3 failures → fall back to Clerk re-auth, not just sign-out
- Add `NSFaceIDUsageDescription` to `app.json`

**Widget**: deferred to v1.1.

**Verification**: permission prompts appear exactly once at the right moment; push test from server reaches device; biometric prompt after >5 min background; lock-screen banner does not leak amounts.

---

### Phase F — Release (1–2 weeks)

**EAS Build**:
- `eas.json` profiles: `development` (simulator), `preview` (internal TestFlight), `production` (App Store)
- Bundle ID `com.foracle.app`
- `eas credentials` for code-signing + APNs key

**App Store**:
- `PrivacyInfo.xcprivacy` declares: financial data, contact info (email via Clerk), biometric IDs, push tokens
- App Privacy section: "Data Linked to You" = financial, contact, identifiers, usage. "Data Used to Track You" = none.
- Test account provided to App Review with seeded family + expenses; reviewer must be able to bypass invite onboarding
- Description copy: explicit "not financial advice", TLS in transit + Postgres encryption at rest
- Screenshots: 6.7" iPhone (Pro Max) required + 5.5" recommended
- Age rating: review against assistant chat moderation — likely 12+

**API version coupling**:
- `app.json` declares `extra.minApiVersion: 1`
- Every request sends `X-Client-Version`, `X-Client-Platform: ios`
- Server replies `X-Api-Min-Client-Version`; mobile shows update wall when its version falls below

**Verification**: internal TestFlight installs on physical device; all features work against production API; 1-week external TestFlight beta with 5–10 testers before submission.

---

## Timeline

| Phase | Effort | Calendar (1 engineer) |
|---|---|---|
| A — Monorepo migration | S–M | 2–4 days |
| B — REST API + family scoping | L | 2–3 weeks |
| C — Mobile foundation | M | 1–2 weeks |
| D — Feature implementation | L | 4–6 weeks |
| E — Push + biometric (widget deferred) | S–M | ~1 week |
| F — Release | M | 1–2 weeks |
| **Total** | | **~9–13 weeks**, buffered to **12–16 weeks** for App Store launch |

---

## Critical files to modify or create

- `apps/web/lib/auth-context.ts` — the family-scoping contract every new service must adopt
- `apps/web/db/schema.ts` — type source for `packages/shared`; adds `push_tokens` table in Phase B
- `apps/web/lib/services/**` — new business-logic layer (created during Phase B)
- `apps/web/app/api/v1/**` — new REST surface
- `apps/web/app/api/ai/chat/route.ts` — template for `/api/v1/assistant/chat`
- `apps/web/lib/actions/*` — body replaced with service calls, behavior unchanged
- `packages/shared/src/{schemas,types,currency.ts,cpf.ts,date.ts}` — moved from `apps/web/lib/*`
- `packages/api-client/src/{client.ts,endpoints/*}` — fetch wrapper consumed by mobile
- `apps/mobile/app/**` — Expo Router screens mirroring `apps/web/app/(app)/*`
- `apps/mobile/src/lib/offline-queue.ts` — AsyncStorage queue + bulk-sync drain
- `apps/mobile/src/lib/{biometric,push,theme}.ts` — native feature glue + brand tokens
- `turbo.json`, `tsconfig.base.json`, root `package.json` — workspace plumbing
- Render service settings — Root Directory + Build Command swap (Phase A cutover)

---

## Risks and mitigations (top of mind)

| Phase | Risk | Mitigation |
|---|---|---|
| A | Render build breaks → prod down | Validate on a Render preview env first; tag pre-migration SHA for instant rollback |
| A | `git mv` loses history | Verify `git log --follow` on a sample of moved files post-commit |
| B | Family-scoping migration leaks data (mobile sees less than web, or vice versa) | Write the family-scoping test FIRST against each new service; service rejects calls without `familyId` |
| B | Refactor breaks an existing web action | One service extraction per PR; e2e smoke after each merge |
| D | Drag-commit Mar→Feb-class bug re-occurs | Reanimated shared value for preview, single mutation at gesture-end, Maestro e2e gesture test |
| D | Offline queue corruption / dupes after reconnect | Client-generated UUID as server-side idempotency key; cap queue at 500 with surfaced banner |
| D | Decimal/currency rounding diverges between platforms | `packages/shared/src/currency.ts` is the only place doing money math |
| E | Push payload exposes amounts on lock screen | Generic copy by default; detailed previews opt-in |
| F | App Store rejection for "financial advice" | Scrub advice wording from UI + description; assistant prompt refuses financial-advice prompts explicitly |

---

## End-to-end verification

After Phase B: hit every `/api/v1/*` endpoint with `curl` + a Clerk session JWT; integration suite green; web app still works.

After Phase C: install dev build on iOS Simulator, sign in via Clerk, fetch `/api/v1/health` from inside the app.

After Phase D (per feature): open the mobile screen, perform the relevant action, verify the row appears in Postgres + on the web app. For daily expenses specifically: airplane mode → submit 3 expenses → reconnect → confirm exactly 3 rows arrive at the server with the client-supplied UUIDs.

After Phase E: trigger a push from a backend script and confirm receipt on device; close-and-reopen the app after 6 min to confirm biometric prompt.

After Phase F: internal TestFlight build installs on a physical iPhone and works against production API; external TestFlight beta with 5–10 testers for a week.

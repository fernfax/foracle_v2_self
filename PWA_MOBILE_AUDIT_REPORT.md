# PWA & Mobile Experience Audit — Foracle web app

**Date:** 2026-06-09 · **Branch:** `feature/user-homepage-revamp` (== `main`)
**Auditor role:** senior mobile QA + PWA architect
**Method:** full read-only static analysis (recursed app/components/lib/db/tests, excluding node_modules/.next/.git) + existing-suite execution. Live mobile-viewport verification was **attempted but blocked** mid-audit — see [§Execution](#phase-3--execution).
**Severity order (per brief):** offline-data-loss (P0) > installability (P1) > responsive-breakage (P2) > ergonomics (P3) > cosmetic (P4).

---

## Executive summary

**This repository is a responsive Next.js web app + REST API. It is NOT a Progressive Web App.** There is no manifest, no service worker, no offline capability, no web push, and the icon set is incomplete. The genuine mobile product is a **separate native iOS/Android app** that consumes this repo's `/api/v1` (evidence: `push-tokens` platform enum is `["ios","android"]`, and a "mobile offline queue" drain endpoint exists). That native app — not this repo — is where offline-data-loss risk lives, and its API contract *is* covered by tests here.

So the audit splits cleanly:
- **No P0 in this repo.** The web app has **no offline write path**; offline mutations fail-loud (fetch rejects → error toast), so there is no silent data loss to find on web.
- **P1 — installability is absent**, yet `app/(app)/mobile-guide/page.tsx` actively tells users they're getting a standalone, offline-capable app. Those promises are false.
- **P2/P3 — real iOS-specific bugs**: safe-area insets are a no-op (missing `viewport-fit=cover`), the layout SSRs as desktop then flips to mobile on the client, and inputs trigger iOS zoom-on-focus.
- **Test gap**: Playwright is desktop-Chrome-only; there is zero mobile-viewport or PWA coverage. Scaffolded in this audit.

---

## Phase 1 — Capability inventory

### PWA foundation
| Piece | Status | Evidence (file:line) |
|---|---|---|
| Web App Manifest | ❌ missing | none in repo; `app/layout.tsx:30-42` `metadata` has no `manifest` |
| Service worker | ❌ missing | no `sw.*`/serwist/workbox; no `next-pwa`/`serwist`/`workbox`/`web-push` deps in `package.json` |
| `viewport` export | ❌ missing | no `export const viewport` anywhere in `app/` → Next default `width=device-width,initial-scale=1`, **no `viewport-fit=cover`, no `themeColor`** |
| Icons | ⚠️ incomplete | `public/`: favicon-32, favicon.ico, logo-72/108/144, wordmark-*. **No 192, no 512, no maskable.** Wired `app/layout.tsx:33-41` |
| PWA build config | ⚠️ none | `next.config.ts` (whole file) — no PWA plugin, no caching headers |

### Installability
- **Android/Chrome:** ❌ not installable — fails manifest + SW + 192/512-icon criteria. No `beforeinstallprompt` handler anywhere.
- **iOS A2HS:** ⚠️ guide exists (`app/(app)/mobile-guide/page.tsx`) but the result is not standalone (no `apple-mobile-web-app-capable`) and not offline (no SW).

### Mobile surfaces (all responsive web; none offline-capable; none use web device APIs)
Bottom-nav set (`components/mobile-nav.tsx:19-29`): `/overview · /user · /expenses · /assets · /policies · /investments · /goals · /budget · /assistant` (+ `/mobile-guide`). Mobile↔desktop switch is height-aware (`globals.css:13,288` and `dashboard-shell.tsx:32-46` — desktop = width≥768 **and** height≥600, so landscape phones stay mobile — good).

| Surface | Mobile layout | Offline | Web device APIs |
|---|---|---|---|
| All of the above | ✅ responsive | ❌ none (no SW) | ❌ none |
| **Budget** (priority) | ✅ responsive; daily logging via server actions/API | ❌ online-only on web | ❌ none |

### Device capabilities
| Capability | Web app | Notes |
|---|---|---|
| Haptics | ❌ none | no `navigator.vibrate` in web code |
| Push | ❌ web none | `lib/api-schemas/push-tokens.ts:3` platform = `["ios","android"]` → **native push only** (APNs/FCM) |
| Camera / Geolocation | ❌ none | no `getUserMedia`/`geolocation` |
| Offline queue | ➡️ native | `app/api/v1/daily-expenses/bulk/route.ts:11` "mobile offline queue" drain; `lib/api-schemas/daily-expenses.ts:46` idempotency required — serves the **native** client |

---

## Phase 2 — Mobile QA test matrix

Coverage key: ✅ exists · 🟡 partial · ❌ GAP. "How to verify" names the runnable mechanism.

| # | Capability | Test case | Coverage | How to verify |
|---|---|---|---|---|
| R1 | Responsive | No horizontal scroll @ 360/390/414/768 on every surface | 🟡 scaffolded (public pages) | `mobile.responsive.spec.ts` (iPhone 13 + Pixel 5 projects); authed surfaces = G9 |
| R2 | Responsive | No clipped content / overlap at small widths | ❌ | manual + visual diff per surface |
| R3 | Responsive | Safe-area insets respected (notch/home indicator) | ❌ broken | G2 — `viewport-fit=cover` missing → `env(safe-area-*)`=0 |
| T1 | Touch | Tap targets ≥44px (bottom nav, row actions, FAB) | ❌ | `mobile.pwa.spec.ts` G7 (needs auth) |
| T2 | Touch | No hover-only interactions | ✅ (row actions always-visible) | code: `components/ui/row-actions.tsx` |
| T3 | Touch | Input zoom prevented on iOS | ❌ broken | G10 — body `font-size:15px` (`globals.css:215`), inputs `text-sm` |
| T4 | Touch | Swipe/scroll (bottom-nav horizontal scroll, charts) | 🟡 | manual on device; `touch-pan-y` used on income cards |
| O1 | Offline | Cold load offline serves shell | ❌ N/A | G8 — no SW |
| O2 | Offline | Mutation offline → queue/sync (web) | ❌ N/A (fail-loud) | web has no queue; native only |
| O3 | Offline | SW update without breaking open session | ❌ N/A | no SW |
| I1 | Install | First install (Android) | ❌ | needs manifest+SW+icons |
| I2 | Install | Launch standalone from home screen | ❌ | G4 — no `apple-mobile-web-app-capable`/`display:standalone` |
| I3 | Install | Update path | ❌ | no SW |
| P1 | Push | Permission UX / subscription / delivery / denial | ➡️ native | `tests/api/v1/{routes,services}/push-tokens.test.ts` cover the API; web N/A |
| H1 | Haptics | Fires on intent, no-ops when unsupported | ➡️ native | none in web |
| B1 | Budget | Daily-log happy path on phone: speed, keyboard, overage indicator | ❌ | G9 (needs auth e2e on mobile project) |
| F1 | PWA failure | SW serving stale JS/CSS | ❌ N/A | no SW |
| F2 | PWA failure | Manifest scope trapping navigation | ❌ N/A | no manifest |
| F3 | PWA failure | iOS Safari quirks (no prompt, limited push, storage eviction) | 🟡 documented | this report |

---

## Phase 3 — Execution

### Existing tests
- **Vitest:** `npm test` → **524 passed / 4 failed** (45 files). The 4 failures are real-DB *service* tests, **unrelated to mobile/PWA** and not from the portfolio work:
  - `tests/api/v1/services/budget.test.ts:201` — budget-shift expected 500, got 600
  - `tests/api/v1/services/family-members.test.ts:91` — expected length 1, got 2
  - (+2 more in the same files)
  These smell like real-DB **test-isolation/ordering flakiness** (shared `foracle_test`, `fullyParallel`). ⚠️ They are currently **on `main`** and the pre-push hook only runs e2e, so it did not catch them. Out of this audit's scope but worth a fix (serialize these suites or reset state per test).
- **Playwright e2e:** smoke + incomes-beta dogfood **passed** in the pre-push run. Config is **desktop-Chrome only** (`playwright.config.ts`, pre-audit).

### Added in this audit (scaffolds, uncommitted)
- `playwright.config.ts` — added **iPhone 13** + **Pixel 5** projects (real viewport/touch/DPR/UA), scoped to `mobile.*.spec.ts`; desktop project now `testIgnore`s them.
- `tests/e2e/mobile.responsive.spec.ts` — live no-overflow + tap-target checks on public pages (landing, sign-in).
- `tests/e2e/mobile.pwa.spec.ts` — `test.fixme()` coverage for gaps **G1–G10** (manifest, viewport-fit, theme-color, apple-capable, 192/512 icons, SW, tap targets, offline cold-load, Budget offline-sync, input zoom). Un-`fixme` each as it's fixed.
- Run with: `npx playwright test --project="Mobile Safari (iPhone 13)" --project="Mobile Chrome (Pixel 5)"` against a **healthy** dev server.

### Lighthouse
**Not run.** (1) The dev server was unhealthy at audit time; (2) Lighthouse 12 **removed the PWA category**, so a "PWA score" is no longer obtainable — use `npx lighthouse <url> --preset=desktop`/mobile for perf/a11y/best-practices/SEO once the server is healthy, and the `mobile.pwa.spec.ts` gap tests for installability instead.

### ⚠️ Live-verification limitation (honest disclosure)
Mid-audit the running dev server (`localhost:3000`) began returning blank pages with `TypeError: Failed to fetch … loadClerkJS` and `/budget → 307`. This is an **environment failure** (Clerk dev-instance rate limiting after a long heavy session, and/or `.next` left in a production-build state by an earlier `next build`), **not a mobile defect.** I therefore **discarded** the live mobile-sweep results (they were measuring un-rendered pages) and did not assert any responsive finding from them. To get live mobile coverage: `pkill -f "next dev"` then `npm run dev` (fresh `.next`), wait for the Clerk dev limit to reset, and run the scaffolded Playwright mobile projects.

---

## Gaps ranked by severity

### P0 — offline data loss
**None in this repo.** The web app has no offline write path; offline mutations reject visibly. The native app's offline queue is the P0 surface, and it is *not* in this repo — but its server contract is tested (`tests/api/v1/{routes,services}/daily-expenses-bulk*`, `push-tokens*`). If you want web parity, that's G8/G9 (P1/P2), not a current data-loss bug.

### P1 — installability & false claims
- **G-A · Not installable as a PWA.** No manifest, SW, or 192/512/maskable icons. *Fix:* add `app/manifest.ts` (name, short_name, `start_url:"/overview"`, `scope:"/"`, `display:"standalone"`, `theme_color:"#B8622A"`, `background_color:"#FBF7F1"`, icons incl. 192, 512, and a 512 `purpose:"maskable"`); generate the icons into `public/icons/`; add a service worker (Serwist is the current Next 15/16-friendly choice) with an app-shell + runtime cache; register it client-side. Refs: `app/layout.tsx:30-42`, `next.config.ts`, `public/`.
- **G-B · `mobile-guide` overpromises (user-facing false claims).** `app/(app)/mobile-guide/page.tsx:64` "Full-screen experience without browser UI" and `:76` "Works offline for cached data" are both false today. *Fix (fast):* either ship the standalone/offline support (G-A + G4) or correct the copy now; at minimum add `apple-mobile-web-app-capable`/`apple-mobile-web-app-status-bar-style` so A2HS at least opens standalone (`:32,:64` promise it).

### P2 — responsive / iOS breakage
- **G2 · Safe-area insets are a no-op on iOS.** `app/globals.css:343-344` `.pb-safe` uses `env(safe-area-inset-bottom)`, applied to the fixed bottom nav (`components/mobile-nav.tsx:69`), but `env(safe-area-*)` only resolves with `viewport-fit=cover`, which is never set → the bottom nav sits under the home indicator on notch/Dynamic-Island iPhones. *Fix:* add `export const viewport: Viewport = { themeColor: "#FBF7F1", viewportFit: "cover" }` to `app/layout.tsx`.
- **G-C · SSR renders the desktop layout, then flips to mobile.** `components/sidebar/dashboard-shell.tsx:35-61` `useIsDesktop()` defaults `true` until client mount → every mobile load paints the desktop shell (sidebar) first, then reflows to mobile (layout shift / CLS), and if JS stalls the user is stuck in the unusable desktop layout. *Fix:* gate layout with CSS (the height-aware `desktop:` variant already exists in `globals.css`) instead of a JS-mount boolean, or SSR a neutral shell; at minimum default `isDesktop=false` and correct up.
- **G-D · Mobile header ignores the top safe area.** `dashboard-shell.tsx:92-93` sticky `h-[70px]` header has no `pt-safe`/`env(safe-area-inset-top)` → status-bar/notch overlap in standalone. (Latent until G4 makes standalone real.) *Fix:* add top safe-area padding once `viewport-fit=cover` lands.

### P3 — ergonomics
- **G10 · iOS input zoom-on-focus.** Body `font-size:15px` (`app/globals.css:215`) and dialog inputs `text-sm` (14px) are <16px → iOS Safari auto-zooms on focus, breaking the layout during data entry (worst on Budget/expense logging). *Fix:* set form controls to ≥16px on mobile (e.g. a `@media (max-width:768px){ input,select,textarea{font-size:16px} }` rule) — do **not** use `maximum-scale=1` (a11y regression).
- **G-E · Bottom nav: 9 items in an 8-wide horizontal scroller.** `components/mobile-nav.tsx:31` `VISIBLE_ITEMS=8` with 9 items → the 9th ("Assistant") is off-screen behind a scroll + dot pager; discoverability/ergonomics hit, and tap-target width is 12.5% (~45px @360w, borderline). *Fix:* reduce to ≤5 primary tabs + "More", or verify ≥44px and accept the scroller.
- **T1 · Tap targets unverified at device scale** (blocked by env). Covered by `mobile.pwa.spec.ts` G7 once auth is wired.

### P4 — cosmetic / polish
- **G3 · No `theme-color`** → browser UI / status bar not themed.
- **G-F · No maskable icon** → Android adaptive-icon letterboxing once installable.

---

## Live-run addendum (dev server recovered)

**Fixes applied this session** (code-only, P2/P3): G2 (`viewport-fit=cover`), G-D (header `safe-area-inset-top`), G3 (`theme-color`), G4 (`apple-mobile-web-app-capable` → real iOS standalone), G10 (≥16px inputs), G-B (mobile-guide copy). Files: `app/layout.tsx`, `app/globals.css`, `components/sidebar/dashboard-shell.tsx`, `app/(app)/mobile-guide/page.tsx`.

**New gaps from the live Playwright run — now FIXED:**
- **G11 (P3) — landing CTA was 32px tall.** The nav "Get Started" was a `size="sm"` button. Bumped to 44px on phones (`h-11 sm:h-8`, `app/page.tsx`). Verified on iPhone 13 + Pixel 5.
- **G12 (P2) — reported iPhone-13 overflow was a load-transient, not a real bug.** A WebKit diagnostic showed the page settles to `scrollWidth == clientWidth == 390` on both pages; the `LifeStages` timeline (1790px track) is already clipped by its `overflow-hidden` section. The earlier failure measured at 400ms mid-layout. The responsive test now polls the settled layout (`tests/e2e/mobile.responsive.spec.ts`).

The mobile responsive tests are now **live (un-`fixme`'d) and passing** on both device projects (6/6).

## Appendix

**Native-app boundary.** The strongest mobile capabilities (offline queue, push, presumably haptics) live in a separate native app. This repo owns the *contract*: `app/api/v1/user/push-tokens/*`, `app/api/v1/daily-expenses/bulk/route.ts`, and `lib/api-schemas/{push-tokens,daily-expenses}.ts`. Keep auditing those at the API layer (already well-tested); a true "mobile" audit of offline/push must also target the native repo.

**Files added by this audit (uncommitted):** `playwright.config.ts` (mobile projects), `tests/e2e/mobile.responsive.spec.ts`, `tests/e2e/mobile.pwa.spec.ts`, this report.

**Quickest high-value sequence:** G2 (one `viewport` export, fixes safe areas + theme-color) → G-B copy fix → G-A (manifest + icons + SW) → G10 → G-C.

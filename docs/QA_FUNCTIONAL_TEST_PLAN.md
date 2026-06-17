# Foracle — Functional QA Test Plan (Pre-Vercel-Migration Baseline)

**Status:** active · **Created:** 2026-06-09 · **Owner:** QA (Claude Code)
**Purpose:** A repeatable, persona-driven functional QA spec used to (1) establish a behavior baseline on the current stack before the Render→Vercel migration, and (2) be re-run verbatim against the Vercel deployment afterward to catch regressions. **This is the single source of truth — every persona run checks against it.**

This pass is **purely functional**: no security, no performance/efficiency. The question for every page is _"for this kind of real user, can they do what they should, and do they see what they should?"_

---

## How to use this document

1. **Harness** (below) — start the dev server, authenticate the browse session, and use the reset+seed scripts to put one persona's data in front of the browser at a time.
2. For each persona, walk its **deep-test** pages against the **Per-page QAQC criteria** (Part 3), recording pass/fail per row into `.gstack/qa-reports/migration-baseline/qa-report-persona-NN-*.md`.
3. Actively probe the **Regression watchlist** (Part 2) — these are code-level risks already identified; each persona that touches the relevant page must verify them.
4. After all personas, roll findings into `.gstack/qa-reports/migration-baseline/QA_BASELINE_SUMMARY.md`.
5. After the Vercel cutover, follow the **Re-run runbook** (Part 4) and diff against the baseline reports.

---

## Part 0 — Harness (local dev)

- **App:** `http://localhost:3000` (dev server already running; **port 3000**, not the stale 3002 in `DEV_SERVER_PORT.md` — the Clerk JWT `azp`, Playwright baseURL, and cookies are all bound to 3000).
- **DB:** `postgresql://evanlee@localhost:5432/foracle_v2_self`. `psql` is not on PATH → use `/Applications/Postgres.app/Contents/Versions/17/bin/psql`.
- **One reused login:** `evanleeyz@gmail.com` / Clerk `user_37saN3qoomjrkSRkqix5DaIPEdg` / family `fam_user_37saN3qoomjrkSRkqix5DaIPEdg`, already `onboarding_completed=true`, with a permanent clerk-linked **Self** family-member row `AfJc5H4SGvgCH7RBO35cH` (**never deleted** by the reset).
- **Browse:** binary at `~/.claude/skills/gstack/browse/dist/browse`.

**Per-persona cycle:**

```bash
PSQL="/Applications/Postgres.app/Contents/Versions/17/bin/psql"
URL="postgresql://evanlee@localhost:5432/foracle_v2_self"
B="$HOME/.claude/skills/gstack/browse/dist/browse"

# 1. Reset + seed the persona — SCRIPTS REMOVED (see note below). Enter the
#    persona's data through the app, or restore a script from git history.

# 2. Authenticate the browse session (import Clerk cookies from real Chrome)
"$B" goto http://localhost:3000                          # land on localhost first
"$B" cookie-import-browser chrome --domain localhost     # re-run after any daemon restart
"$B" goto http://localhost:3000/overview                 # expect dashboard, NOT /sign-in
```

> **Note — persona seed scripts removed.** The `_reset_family.sql` / `persona_NN_*.sql`
> seed scripts were squashed away (see `src/db/manual-migrations/0001_baseline.sql`,
> which now holds only the from-scratch schema). The persona _scenarios_ below are
> still the coverage matrix, but you now reproduce a persona's data by hand through
> the app, or by restoring a specific seed file from git history
> (`git log -- src/db/manual-migrations/qa/`). For authenticated automated checks,
> use the Playwright setup in `tests/e2e/` (Clerk auth via `auth.setup.ts`).

The Clerk **display name in the sidebar stays "Evan Lee"** for every persona (it's the Clerk account identity, independent of the seeded household) — this is expected, not a bug; judge each persona by its _data_, not the account name.

---

## Part 1 — Personas & coverage

| #   | Persona (age)                       | Profile                                                                                                                        | Churn lens (what the track probes)    | Deep-tests                                         |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | -------------------------------------------------- |
| 1   | **Maya — Blank Slate** (23)         | Just onboarded, zero data                                                                                                      | "I see nothing useful — why bother?"  | Empty states everywhere                            |
| 2   | **Wei Jie — Fresh Grad** (24)       | 1 salary $3.8k, rents, minimal spend, 1 goal                                                                                   | "Too complex for my simple finances"  | incomes, budget, goals                             |
| 3   | **Rachel & Tom — DINK** (29/31)     | Dual income, condo goal, ILP each, joint savings, ETF/crypto                                                                   | "Can't model our shared finances"     | incomes (multi-member), family, goals              |
| 4   | **The Lims — Young Family** (38/36) | 1.5 incomes, 2 kids, HDB+mortgage, car, 4 policies                                                                             | "Doesn't capture my whole household"  | family, assets, policies, budget, overview         |
| 5   | **Daniel — Sandwich Gen** (46)      | Sole earner, 2 teens + 2 parents, 7 policies, eldercare                                                                        | "Can't track who I'm responsible for" | family, policies, cpf, expenses                    |
| 6   | **Robert — Pre-Retiree** (58)       | Winding-down income, CPF-heavy, paid-off property, bonds/cash                                                                  | "CPF projection wrong/unclear"        | cpf, overview, investments, holdings               |
| 7   | **Priya — HNW Investor** (51)       | 4 income streams, 6 investments, 2 properties, 2 vehicles, 5 holdings                                                          | "Net worth doesn't add up"            | investments, assets (all tabs), overview, holdings |
| 8   | **Marcus — Freelancer** (34)        | Freelance+dividend (no CPF) + a past salary, lumpy spend                                                                       | "Doesn't handle irregular income"     | incomes (non-salary/past/no-CPF), budget, overview |
| 9   | **Aisha — Over-Budgeter** (35)      | Over budget monthly, many dailies, 5 budget shifts, loans                                                                      | "Budget math is off / it nags me"     | budget (deep), expenses, daily expenses            |
| 10  | **The Ngs — Power User** (42)       | Everything maxed: 6 incomes (past+future), 2 props, 2 vehicles, all investment types, 8 policies, 5 goals, 2 months of dailies | "App gets slow/inconsistent"          | ALL pages + cross-page reconciliation              |

**Coverage matrix (● deep · ○ smoke):**

| Page                 | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | 9   | 10  |
| -------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/overview`          | ●   | ○   | ○   | ●   | ○   | ●   | ●   | ●   | ○   | ●   |
| `/user?tab=family`   | ●   | ○   | ●   | ●   | ●   | ○   | ○   | ○   | ○   | ●   |
| `/user?tab=incomes`  | ●   | ●   | ●   | ○   | ○   | ○   | ○   | ●   | ○   | ●   |
| `/user?tab=expenses` | ●   | ○   | ○   | ●   | ●   | ○   | ○   | ○   | ●   | ●   |
| `/user?tab=cpf`      | ●   | ○   | ○   | ○   | ●   | ●   | ○   | ○   | ○   | ●   |
| `/user?tab=holdings` | ●   | ○   | ○   | ○   | ○   | ●   | ●   | ○   | ○   | ●   |
| `/assets`            | ●   | ○   | ○   | ●   | ○   | ○   | ●   | ○   | ○   | ●   |
| `/policies`          | ●   | ○   | ●   | ●   | ●   | ○   | ○   | ○   | ○   | ●   |
| `/investments`       | ●   | ○   | ○   | ○   | ○   | ●   | ●   | ○   | ○   | ●   |
| `/goals`             | ●   | ●   | ●   | ●   | ○   | ●   | ○   | ○   | ○   | ●   |
| `/budget`            | ●   | ●   | ○   | ●   | ○   | ○   | ○   | ●   | ●   | ●   |
| `/assistant`         | ○   | —   | —   | —   | —   | —   | —   | —   | —   | ●   |
| `/mobile-guide`      | ○   | —   | —   | —   | —   | —   | —   | —   | —   | ○   |

Public pages (`/`, `/sign-in`, `/sign-up`) are persona-independent. Onboarding (`/onboarding`) has its own runbook in **Part 6** below. `/developer`, `/developer/diagram`, `/admin` are out of scope (the latter correctly bounces this non-superadmin account).

---

## Part 2 — Regression watchlist (verify these explicitly)

Code-level risks identified during spec authoring. **P** = expected severity if confirmed broken. Each persona that touches the page must check the relevant items and record the result.

| #   | Area                | Risk                                                                                                                                                                                                                                                           | Verify                                                                                                                   | P        |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| R1  | Net worth (`/user`) | **Vehicle CRUD never `revalidatePath('/user')`** → net worth stale after any vehicle add/edit/delete until manual reload                                                                                                                                       | Add/edit a vehicle on `/assets`, navigate to `/user` _without_ reloading; is the Car-Loan liability / net worth updated? | P2       |
| R2  | Net worth           | **Investment CRUD has no `revalidatePath`** → `/user` + `/overview` stale until reload (page compensates via `router.refresh()` only on `/investments`)                                                                                                        | Edit an investment's capital, go to `/user`; did Investments class total update without a reload?                        | P2       |
| R3  | Net worth           | **Property _delete_ doesn't `revalidatePath('/user')`**                                                                                                                                                                                                        | Delete a property, check `/user` net worth still shows it                                                                | P2       |
| R4  | Net worth vs card   | **Vehicle outstanding-loan divergence**: `/assets` card uses time-decaying flat-rate `P×(n−k)/n`; net worth uses `loanAmountTaken − loanAmountRepaid`. A nearly-paid car can still book the full loan as a liability if `loanAmountRepaid` is blank            | Compare a vehicle's card "Outstanding loan" vs the `/user` Car-Loan liability                                            | P2       |
| R5  | Goals               | **Editing an _achieved_ goal may un-achieve it** — `updateGoal` defaults `isAchieved:false`, the edit dialog doesn't send it                                                                                                                                   | On `/goals`, mark a goal achieved → edit it → save → does it stay in the Achieved tab?                                   | P2       |
| R6  | Goals               | "Mark as achieved" does **not** set `currentAmountSaved = targetAmount` → achieved goal can show <100% funded in its modal                                                                                                                                     | Mark achieved, open details, check funded %                                                                              | P3       |
| R7  | Budget              | **Budget-shift double-count** (the Mar→Feb-class bug). Page does a full refetch after a shift; the previewed source/dest `monthlyBudget` must equal the committed values, delta applied **once**                                                               | Shift $X A→B; note preview; commit; reload; confirm source −X and dest +X exactly, `totalBudget` unchanged               | P1       |
| R8  | Budget              | Summary `totalSpent` is **tracked-only** — spending in a category with no recurring-expense budget shows as a breakdown row but is excluded from summary "spent" (deliberate; easy to misread as "spent doesn't match")                                        | Add a daily expense in an untracked category; confirm it appears in breakdown but not summary spent                      | P3 (doc) |
| R9  | Budget              | Shift while viewing a **past** month must send that month's year/month, not today's                                                                                                                                                                            | Navigate to May, shift, confirm the shift lands in May                                                                   | P2       |
| R10 | Incomes             | **NETT total chip** — the centered focal "Total /mo" pill must update to take-home on Gross⇄Nett toggle and stay correct while scrolling months (historical bug surface)                                                                                       | Toggle Gross/Nett; scroll; watch the pill                                                                                | P2       |
| R11 | Incomes             | **Drag-to-commit** (Mar→Feb class) — dragging a bar shows a preview; commit happens on pointer-up via month-delta. Verify committed start/end dates == preview position **after reload**                                                                       | Drag an income bar; screenshot before/after; reload; compare dates                                                       | P1       |
| R12 | Policies            | **Multi-step create** (policy → linked expense → back-link) — double-submit if `isLoading` doesn't cover all 3 awaits → two policies + two expenses; orphaned link on partial failure makes the expense un-deletable from the expense list                     | Rapid-double-click submit; confirm exactly one policy + one linked expense                                               | P2       |
| R13 | Policies            | Delete is optimistic and **not rolled back** on server failure                                                                                                                                                                                                 | (best-effort) — note behavior on a failed delete                                                                         | P3       |
| R14 | Sankey              | Recharts `<Sankey>` mutates `node.value`; labels/tooltips must read `realValueById`. A refactor reading `n.value` doubles the hub number                                                                                                                       | Confirm "Total Income" equals the sum of inflow nodes (not ~2×)                                                          | P2       |
| R15 | Sankey              | Tooltip is portaled to `document.body` (`position:fixed`) — historical "far from cursor"/sidebar-offset bug                                                                                                                                                    | Hover nodes; confirm tooltip tracks the cursor                                                                           | P3       |
| R16 | CPF                 | **Single source of truth** — CPF tab per-member Total must equal the Holdings "`<member>` · CPF" row; a multi-income member must not double-count                                                                                                              | Cross-check CPF tab vs Holdings tab per member                                                                           | P2       |
| R17 | Net worth           | **Identity**: `netWorth == totalAssets − totalLiabilities`; asset-class chips sum to `totalAssets`; composition % sums to 100                                                                                                                                  | Reconcile hero vs chips vs composition on `/user` Holdings                                                               | P2       |
| R18 | Overview (server)   | **`TimeoutNegativeWarning: -NNNN`** server warning observed on `/overview` load (negative duration computed somewhere — possibly a date-diff/scheduling calc)                                                                                                  | Watch console on each overview load; note when it fires                                                                  | P3       |
| R19 | Charts              | Transient Recharts `width(-1)/height(-1)` warning on first paint (chart container 0-size before layout) — confirm charts still render                                                                                                                          | Watch sankey / projection / wealth charts render on first paint                                                          | P3       |
| R20 | Holdings            | Add/edit/delete holding failure uses a native `alert()` (inconsistent with the toast success path)                                                                                                                                                             | (best-effort) note on failure                                                                                            | P3       |
| R21 | Cosmetic            | `/mobile-guide` uses hardcoded hex + `bg-white` instead of design tokens (CLAUDE.md violation)                                                                                                                                                                 | Visual only                                                                                                              | P4       |
| R22 | Assistant           | Threads are **in-memory** (`new Map()`) — context lost on cold start / different instance; requires `OPENAI_API_KEY`. Treat "forgot context" as expected ephemerality                                                                                          | Skip or partial-test; note if key absent                                                                                 | known    |
| R23 | Cross-page          | Classic-overview `familyMembers` counts pending/revoked (differs from Family tab); classic `totalAssets` (property+vehicle equity only) ≠ Holdings net worth (adds cash/investments/insurance/CPF) — **not bugs**, document so QA doesn't expect them to match | —                                                                                                                        | doc      |
| R24 | Cross-tab freshness | Family grid mutates local state; CPF/Holdings use `router.refresh()`; Incomes use optimistic state — a change on one tab won't reflect on another until reload. **Reload between cross-tab reconciliations**                                                   | —                                                                                                                        | doc      |

---

## Part 3 — Per-page QAQC criteria

> Format per entry: **Empty state** / **Populated state** / a _Should-be-able-to → Should-expect_ table / **Data-consistency checks** / **QA-sensitive** / **Regression watch**. Derived from the actual handlers in the code.

### 3A — User Homepage hub

#### `/overview` — Dashboard (Cashflow Sankey default; `?view=classic` alternate)

**Empty state:** Title "Overview" + a "Go to:" pill bridge always render. With no current-month income, the Sankey card body shows _"No income recorded for `<Month Year>` — try a different month, switch to Projection, or add an income."_ Projection toggle + month nav still work. Classic view shows `$0`/`0` metric cards.
**Populated state:** Sankey — left income inflow nodes (one per active current-month income; a separate "`<name>` Bonus" node in bonus months; a red "Shortfall" node when overspending), a center "Total Income" hub, right outflow stack ordered Savings → CPF → expense categories (size-desc). Totals strip: "Total Income $X · $Y take-home" (take-home only when CPF>0) and "Total Expenses $Z". 500px pulse skeleton until mounted.

| Should be able to                             | Should expect                                                                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Land on `/overview` authed                    | Cashflow Sankey renders by default; skeleton → resolves                                                                                                   |
| Click a "Go to:" pill                         | Routes to `/user?tab=<tab>` (Expenses → `/user?tab=expenses`)                                                                                             |
| Toggle Sankey → Projection                    | Title swaps to "Balance Projection"; embedded `MonthlyBalanceGraph` (View Mode / Time Range / Investments controls); month-nav row hides                  |
| Click ◀/▶ month nav (Sankey)                  | `selectedMonth` ±1; chart rebuilds; "Current Month" button appears when off-current; **◀ disabled on the current month**                                  |
| Hover income node/ribbon                      | Tooltip: name, Monthly $, Share %; for CPF income a Gross/Employee-CPF/Net block + "Go to Incomes →"                                                      |
| Click an expense category bar                 | Drills down: that category fans into one sub-tendril per line item; others dim; subtext "Showing `<cat>` breakdown · $X across N items · Show categories" |
| Click expanded bar / sub-tendril / empty area | Collapses back to category view                                                                                                                           |
| Click "Go to Incomes/Expenses →" in a tooltip | AlertDialog confirm → routes; **clicking a bar/ribbon itself never navigates**                                                                            |

**Data-consistency:** "Total Income" == Σ inflow nodes (+Bonus +Shortfall) == Incomes/Family-tab gross for the current month. "Total Expenses" excludes savings/investment/retirement categories (they roll into Savings). Conservation: Σ income(+shortfall) == CPF + Σ expense categories + Savings.
**QA-sensitive:** Sankey mutates `node.value`; real $ read from `realValueById` (see R14). Tooltip portaled to body (R15).
**Regression watch:** month-change resets `expandedId` (R-month-nav); one-off/future income can make Projection non-empty while Sankey is empty for the current month — both states must coexist.

#### `/user?tab=overview` — Overview (same Sankey, embedded)

Same component/behavior as `/overview`. Default tab when no `?tab`. `?tab=current` is silently aliased to `holdings`. Deep-links `?tab=cpf|incomes|holdings` and back/forward must restore the right tab.

#### `/user?tab=family` — Family

**Empty:** `EmptyState` "No family members yet" + "Add member". **Populated:** card grid; each card = initials avatar, name, "`Role` · Age N", footer (notes / Contributing), Role badge; edit always, **delete hidden for the self role**.

| Should be able to                           | Should expect                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Add member (Name+Relationship+DOB required) | Card prepended optimistically; toast "`name` added"; CTA reads "Next" if Contributing checked else "Add Member" |
| Edit a card                                 | Updates in place; toast "Member updated"                                                                        |
| Delete a non-self card                      | AlertDialog "Remove `name`? Linked income, CPF and policies will be unlinked"; card removed; toast              |
| Try to delete self                          | No delete affordance rendered                                                                                   |
| Search                                      | Filters by name OR relationship; no match → "No members match" (count chip still total)                         |

**Data-consistency:** visible-member count feeds Incomes grouping + CPF/Holdings member dropdowns; deleting a member unlinks (not deletes) its income/CPF/holdings → income reappears "Unassigned", holding holder becomes None. Pending/revoked invites do **not** appear here.
**QA-sensitive:** grid is local state, not server-refetched (R24) — reload to reconcile other tabs.

#### `/user?tab=incomes` — Incomes (Timeline Studio; `?view=legacy` = table)

**Empty:** `IncomeStatBand` zeros; a blurred non-interactive backdrop with a centered "Add Income" CTA. **Populated:** 4-up stat band (Gross/mo, Take-home/mo after CPF, Active streams, Largest source); the Projected Income River (24-mo desktop window, scale slider, "Now" playhead, focal "Total $X /mo" pill, age chip, Gross/Nett toggle, scroll nav, member lanes with archetype-colored bars).

| Should be able to                 | Should expect                                                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Toggle Gross⇄Nett                 | Bars + focal Total pill recompute via each income's net/gross ratio (**R10 — pill must update**)                                             |
| Scroll timeline (◀/▶, wheel, pan) | Window shifts; "Today" recenters; focal Total + age chip update to the centered month                                                        |
| Add Income Stream (2-step dialog) | Pick member → name + amount + start month + Permanent/Temporary; category auto-derived (future if start>now); creates via `createIncomeBeta` |
| Edit mode → draw a bar on a lane  | Dashed preview tracks drag; pointer-up → commit popup (name/amount, Permanent/Temporary); category auto-detected                             |
| Drag/resize a bar                 | Live preview + month-highlight; pointer-up commits start/end (milestones shift by same delta) — **R11 verify after reload**                  |
| Adjust a segment amount           | Base → updates `amount`; future segment → edits milestone JSON; equal-amount neighbor → merge prompt                                         |
| Delete an income                  | Confirm → optimistic delete + `deleteIncomeBeta`                                                                                             |

**Data-consistency:** stat-band Gross/Take-home == `householdSummary` == Overview Sankey "Total Income" (current month). CPF-subject nett bars use the same ratio as the Sankey per-income net. Bonus spikes use the same `bonusForMonth` as the Sankey "Bonus" node.
**QA-sensitive (high):** optimistic incomes (R10/R11); drag-to-commit; milestone-JSON merge path.

#### `/user?tab=expenses` — Expenses (embedded; `/expenses` 307-redirects here)

**Empty:** Receipt `EmptyState` "No expenses yet" + "Add expense". **Populated:** sortable/searchable/filterable recurring-expenses table; policy/property/vehicle/goal-linked rows show a link icon, are **view-only** for edit and **non-deletable** (manage from the source page).

| Should be able to          | Should expect                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Visit `/expenses`          | 307 → `/user?tab=expenses`                                                                                       |
| Add/edit/delete an expense | A `trackedInBudget` recurring expense **drives the `/budget` per-category budget** (via frequency normalization) |
| Open a policy-linked row   | Edit becomes "View expense"; delete suppressed                                                                   |

**Data-consistency:** $600/mo "Groceries"→"Food" expense ⇒ "Food" shows $600 budget on `/budget`; a one-time expense counts only in its start month. Category-name mismatch silently yields a "spent but no budget" row on `/budget`.

#### `/user?tab=cpf` — CPF

**Empty:** `EmptyState` "No CPF members yet / CPF is tracked for members with CPF-eligible income"; projection graph renders nothing. **Populated:** 3-up stat band (Total CPF balance, Monthly contributions, FRS target); per-member cards (% to FRS + edit, OA/SA/MA bars, Total footer); CPF Balance Projection (View Mode / Breakdown / Time Range, 3 summary tiles, per-member areas + Household line when >1).

| Should be able to                           | Should expect                                                                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Click a member's edit pencil                | If member has a primary active CPF income → dialog prefilled with OA/SA/MA; else toast "Add a CPF-eligible income for this member first." (no dialog) |
| Edit OA/SA/MA → Save                        | 2dp on blur; writes onto the income via `updateIncome`; toast; `router.refresh()` recomputes stat band + cards + projection                           |
| Change projection View Mode/Breakdown/Range | Chart + summary tiles recompute                                                                                                                       |

**Data-consistency (R16):** CPF tab per-member Total == Holdings "`member` · CPF" row (same `cpfBalanceForMember` selection; no multi-income double-count). Stat-band Total == Σ member totals == CPF contribution to net worth. "Monthly contributions" == projection's "Monthly Household CPF".
**QA-sensitive:** edit is not optimistic — verify refresh updates every CPF surface.

#### `/user?tab=current` → `holdings` — Holdings (Net Worth)

**Empty:** Net Worth hero ($0 / $0 assets · $0 liabilities); "Nothing tracked yet" + "Add holding". **Populated:** hero net worth, "$assets in assets · $liabilities in liabilities", stacked composition bar + legend; asset-class chips (Cash/Property/Vehicle/Investments/Insurance Cash Value/CPF, each with count); an Assets list (cash rows editable; property/vehicle/investment/insurance rows are read-only with a link to their page); a Liabilities list (Home Loan / Car Loan, negative) + "Net worth" footer.

| Should be able to                         | Should expect                                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Add a cash holding (Holder, Bank, Amount) | `addCurrentHolding`; toast; `router.refresh()` recomputes hero/composition/tables; "None" → no member link |
| Edit/delete a cash row                    | Dialog prefilled ("Last updated:") / AlertDialog "Remove this holding?"; refresh                           |
| Click external-link on a non-cash row     | Routes to `/assets` `/investments` `/policies` (read-only here)                                            |

**Data-consistency (R17):** `netWorth == totalAssets − totalLiabilities`; totalAssets = cash + property(purchase price) + vehicle(purchase price) + investments(currentCapital) + insurance cash value + CPF; totalLiabilities = property outstanding loan + vehicle(taken−repaid). Hero == chips sum; composition sums to totalAssets; CPF rows == CPF tab. Property/vehicle use **purchase price** (no depreciation) — intentional v1, don't flag. Rows with value ≤ 0 are dropped.
**QA-sensitive:** non-optimistic — one add/edit/delete must recompute hero + composition + chips + both tables. Save failure uses native `alert()` (R20).

---

### 3B — Wealth / Portfolio pages

> **Net-worth wiring (all three):** the net-worth surface is the Holdings view at `/user` (`src/lib/net-worth.ts`). Property asset = `originalPurchasePrice`, liability = stored `outstandingLoan` (>0 only). Vehicle asset = `originalPurchasePrice`, liability = `max(0, taken − repaid)`. Investment asset = `currentCapital` (active). **Goals do not appear in net worth.** Only `isActive !== false` rows count.

#### `/assets` (shell) — tabbed Property / Vehicle / Others

**Empty:** 500px skeleton until mounted; `SlidingTabs` Property/Vehicle/Others driven by `?tab=` (default property); tab strip is null server-side. **Actions:** click a tab → content swaps, URL gains `?tab=`; deep-link `?tab=vehicle` opens Vehicle after mount; back/forward reverts the tab. **Others** is a permanent "coming soon" empty state — no CRUD, and the generic `assets` table is excluded from net worth.

#### `/assets` → Property

**Empty:** "No properties yet" + "Add property". **Populated:** count toolbar; 2-col clickable cards (name, "Purchased MMM yyyy", edit/delete; Purchase price; Outstanding loan **or** "Owned outright"; loan-progress bar; monthly payment; interest rate; CPF-used footer).

| Should be able to                              | Should expect                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add property (6 required fields)               | Submit enabled only when all 6 set; success → **page hard-reloads** with the card; `/user` reflects new asset + (if outstanding>0) Home-Loan liability |
| Enter Loan Taken + Outstanding                 | "Repaid" auto = taken − outstanding (read-only; **can go negative** if outstanding>taken — no guard)                                                   |
| Enter Outstanding + Rate + Monthly             | "Interest" = outstanding×rate/100/12; "Principal" = monthly − interest (auto, read-only; **principal can go negative**)                                |
| Toggle "Add to expenditures" with date+payment | Confirmation dialog → creates a linked **Housing** recurring expense on `/expenses`                                                                    |
| Click a card                                   | `PropertyDetailsModal`: loan-progress, estimated payoff `ceil(outstanding/principal)` months, CPF section, "In/Not in Expenses" badge                  |
| Edit / delete                                  | Pre-filled dialog "Update Property" (hard-reload); delete optimistically removes + deletes linked expense                                              |

**Data-consistency:** card "Outstanding loan" == `/user` Home-Loan liability (both use stored `outstandingLoan`).
**QA-sensitive:** save = full `window.location.reload()`; verify card correct _after_ reload and `?tab=property` preserved. Property create/update revalidate `/user`; **delete does NOT (R3)**.
**Regression watch:** card hides loan UI when `loanAmountTaken` blank/0 even if `outstandingLoan>0`, but net worth still books that outstanding as a liability → a card showing "Owned outright" could still create a Home-Loan liability (verify).

#### `/assets` → Vehicle

**Empty:** "No vehicles yet" + "Add vehicle". **Populated:** count toolbar; 2-col cards (COE badge with days/months/years left; Purchase price; Outstanding loan or "Owned outright"; loan-progress using **time-based flat-rate**; monthly payment; rate).

| Should be able to                                  | Should expect                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Add vehicle (only Name+Date+Price required)        | Submit enabled with just those 3; success → hard-reload                               |
| Enter Loan + Tenure + Date                         | "Outstanding" auto = flat-rate `P×(n−k)/n` (helper "principal reduces linearly")      |
| Enter Loan + Flat Rate + Tenure                    | "Suggested" monthly link = `(P + P×rate/100×years)/months`; click fills payment       |
| Loan > 70% price / tenure > 7y / loan-end past COE | Amber warnings (display-only; don't block)                                            |
| Add to expenditures                                | Linked **Vehicle** recurring expense created                                          |
| Edit / delete                                      | Pre-filled "Update Vehicle" (hard-reload); delete optimistic + removes linked expense |

**Data-consistency (R4):** net worth books vehicle liability = `max(0, taken − repaid)` — **NOT** the time-decaying flat-rate the card shows. For any vehicle with a tenure, card "Outstanding" and `/user` Car-Loan **will not match**; a near-paid card can still book the full loan if `repaid` blank.
**QA-sensitive:** save = full reload; vehicle CRUD revalidates `/assets`+`/expenses` only — **never `/user` (R1)**.

#### `/investments` — Investments (Holdings)

**Empty:** `StatBand` zeros; "No holdings yet" + "Add holding"; `WealthProjectionChart` empty card. **Populated:** StatBand (Portfolio value = Σ currentCapital; Avg yield = capital-weighted; Monthly contribution = Σ normalized); `HoldingsTable` (color dot by type, Type badge, Current value, Proj. yield, Monthly contribution, actions); `WealthProjectionChart` (With/Without-Contributions areas, range selector 12m–20y).

| Should be able to                                                   | Should expect                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Add holding (Name, Capital, Yield, Contribution; Type/Freq default) | `createInvestment` → toast "Holding added" → `router.refresh()`; new row + recomputed StatBand + chart |
| Type select                                                         | Stock/Cash/Bonds/ETF/Crypto/Mutual Fund/REIT                                                           |
| Frequency → Custom                                                  | 12 month chips; submit blocked until ≥1 selected                                                       |
| Edit / delete                                                       | Pre-filled "Update Investment" → refresh; delete optimistic + confirm + refresh                        |

**Data-consistency:** each active `currentCapital` is an Investments asset in `/user` net worth; StatBand "Portfolio value" == that class total. Inactive excluded.
**QA-sensitive:** add/edit not optimistic (rely on `router.refresh()`); delete optimistic then refresh.
**Regression watch (R2):** **no `revalidatePath`** in investment actions → `/user`+`/overview` stale until those pages reload. Projection uses USD/en-US formatting (possible `$` vs `formatBudgetCurrency` mismatch).

#### `/goals` — Active / Achieved tabs

**Empty:** "No goals yet" + "Add goal". **Populated:** Active/Achieved tabs with count badges; cards (keyword icon, name, "Target MMM yyyy", $saved of $target, progress bar, "X% funded", "$remaining to go", "Mark as achieved" on active).

| Should be able to           | Should expect                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| Add goal (Name+Target+Date) | Calendar disables past dates; "Suggested: $X/month"; success → hard-reload, card in Active |
| Add to expenditures         | Linked **Savings** recurring expense created                                               |
| Click a card                | `GoalDetailsModal`: progress, time-remaining ("N days overdue" red), On Track/Behind box   |
| Mark as achieved            | Optimistic remove from Active + toast; moves to Achieved (**R5/R6**)                       |
| Edit / delete               | Pre-filled "Update Goal" (hard-reload); delete optimistic + warns if linked expense        |

**Data-consistency:** goals do **not** feed net worth; only the optional linked Savings expense crosses to `/expenses`. Goal actions revalidate `/overview` (not `/user`).
**Regression watch (R5):** editing an achieved goal may reset it to active (`updateGoal` defaults `isAchieved:false`) — **verify it stays achieved**. (R6) mark-achieved doesn't set saved=target.

---

### 3C — Money-flow + remaining pages

#### `/budget` — Budget Tracker

**Empty:** MonthNavigator (◀ enabled / ▶ disabled), `BudgetBreakdown` "No budget categories yet" / "Add recurring expenses…", all-zero overview, empty grid, "Manage Categories", `+` FAB; `BudgetShiftHistory` renders nothing; `DailySpendingChart` "No spending data". _Per-category budget is derived from recurring expenses_ — a new user must add a recurring expense first. **Populated:** one breakdown row per category where `monthlyBudget>0 || spent>0` (% badge: ≤85 success / 85–100 amber / >100 red / "No limit" when budget 0); 4 stat cards (Spent / Remaining / Daily Pacing / Spent Today); CategoryGrid; RecentExpensesList (Today/Yesterday/date); DailySpendingChart; BudgetShiftHistory.

| Should be able to                   | Should expect                                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Tap ◀                               | Re-fetches all 6 datasets for prev month; `todaySpent`=0 for non-current months                                 |
| Tap ▶                               | Advances; **disabled on current month** (no future nav)                                                         |
| Tap `+` FAB / a category card       | AddExpenseModal (category preselected when from a card)                                                         |
| Enter "10+5+3" on numpad            | Sums to **18**; one expense of 18 (not three)                                                                   |
| Pick a foreign currency             | SGD equivalent shown; persists `amount` in SGD (×rate), with original currency/amount/rate stored               |
| Submit / edit / delete an expense   | Drawer closes → `fetchMonthData` re-pulls everything (full refetch, **not** optimistic); spent/remaining update |
| Open "+ Adjust Budget" → shift      | Source dropdown lists only categories with `remaining>0`; `createBudgetShift`; new row in BudgetShiftHistory    |
| Delete a budget shift (mobile only) | `deleteBudgetShift`; allocation reverts                                                                         |
| Manage Categories                   | Refetches categories + budget + summary                                                                         |

**Data-consistency:** per-category spent == Σ daily_expenses for that name in the month; remaining == monthlyBudget − spent; monthlyBudget == recurring-expense base + net shift. **Summary `totalSpent` is tracked-only (R8).** **Shift is allocation-only: `totalBudget` must NOT change (R7)** — source −amt, dest +amt, net zero. Today/pacing use Asia/Singapore dates.
**QA-sensitive (high):** **Add expense before/after** — note category spent/remaining + list → submit → modal closes & refetch → new row at the same SGD amount → reload → still present, identical amount, category spent = pre-add + amount, **not double-applied** (foreign-currency converted once). **Budget shift (R7):** preview vs committed monthlyBudget must match, delta once; re-open modal → source `remaining` reflects post-shift.
**Regression watch:** R7, R9, R8 above. The repaired test `budget.test.ts -t "applies budget shifts"` asserts `food.monthlyBudget===500` — confirm green, but still verify in-app the source's available-to-shift drops.

#### `/policies` — Insurance Policies

**Empty:** Shield "No policies yet" + "Add Your First Policy" (or per-member "Add one"). **Populated:** 3-up StatBand (Total coverage / Monthly premiums / Active policies); count toolbar; policy-type filter chips; view toggle (cards / coverage matrix / benefit matrix); cards grouped by family member (Self pinned).

| Should be able to                                          | Should expect                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Add policy (provider, type, startDate, premium, frequency) | `createPolicy` → dialog closes, toast "Policy added", `router.refresh()`                                                                    |
| Frequency = Custom                                         | 12-month picker; ≥1 month required                                                                                                          |
| Add to Expenditures                                        | Validates fields → confirm modal → creates "Insurance" expense (`createExpenseFromPolicy`) → back-links via `updatePolicy(linkedExpenseId)` |
| Change status (Active/Lapsed/Cancelled/Matured)            | Only Active+isActive counts toward StatBand totals                                                                                          |
| Filter by type / switch matrix views                       | Narrows; CoverageMatrix/BenefitMatrix render members × policies                                                                             |
| Edit / `?edit=<id>` deep-link                              | Pre-filled dialog (deep-link auto-opens after 100ms, clears `?edit`)                                                                        |
| Delete                                                     | `deletePolicy` cascades the linked expense; optimistic remove + toast + refresh                                                             |

**Data-consistency:** policy `linkedExpenseId` ↔ expense `linkedPolicyId`; the linked expense shows on `/user?tab=expenses` with a Shield icon, **view-only/non-deletable** there. Deleting the policy removes the linked expense. StatBand "Monthly premiums" == Σ normalized active premiums; "Total coverage" == Σ largest coverage value.
**QA-sensitive / Regression (R12/R13):** multi-step create double-submit guard (`isLoading` must cover all 3 awaits → exactly one policy + one expense); orphaned link on partial failure; optimistic delete not rolled back. Stray `console.log` in submit paths (cleanup, non-functional).

#### `/assistant` — AI Assistant

**Empty:** empty `ChatView`, input box, Singlish toggle. **Populated:** user/assistant bubbles (assistant may show `toolsUsed`); quota info after first reply.

| Should be able to                | Should expect                                                             |
| -------------------------------- | ------------------------------------------------------------------------- |
| Send a message                   | User bubble appended **optimistically** (`temp_` id); POST `/api/ai/chat` |
| Successful reply                 | `threadId` captured (thread continues); assistant bubble + quota update   |
| Soft error (has `response`)      | Shown as assistant bubble; optimistic user message **kept**               |
| Hard error (no `response`/throw) | Optimistic user message **removed**                                       |
| Toggle Singlish                  | `setSinglishMode` persisted                                               |

**Skip note (R22):** requires `OPENAI_API_KEY`; without it `/api/ai/chat` 500s → test only empty-state render + optimistic-insert/rollback. Threads are ephemeral (in-memory) — "forgot context" is expected.

#### `/mobile-guide` — PWA install guide

Fully static. **Action:** open → 4 step images load from `public/guide/*.png`; "Back to Dashboard" → `/overview`. **Regression (R21):** hardcoded hex / `bg-white` (design-token violation) — cosmetic only.

---

## Part 4 — Re-run runbook (post-Vercel cutover)

The payoff: re-run this identical suite against Vercel and diff each page's behavior against the baseline reports.

1. **Point the harness at Vercel.** Replace `http://localhost:3000` with the Vercel URL throughout. The browse auth flow is the same (log into the Vercel URL in real Chrome, `cookie-import-browser chrome --domain <vercel-host>`).
2. **Provision the Vercel DB schema.** Apply `src/db/manual-migrations/0001_baseline.sql` (or `npm run db:push`) to the Vercel/Postgres connection string. The per-persona seed scripts have been removed — recreate a persona's data through the app, or restore a seed file from git history if you need one.
3. **Verify env parity first.** `DATABASE_URL`, Clerk publishable/secret keys (and that the Clerk instance's allowed origins include the Vercel host — the JWT `azp` check is origin-bound), `OPENAI_API_KEY` (for `/assistant`). A Clerk origin mismatch will bounce every authed page to `/sign-in` — check this before blaming the app.
4. **Walk each persona** against Part 3, recording results in a parallel `qa-reports/migration-vercel/` set.
5. **Diff:** any page whose behavior, numbers, or empty/populated state differs from the baseline report = a migration regression. Pay special attention to: server actions / `revalidatePath` behavior (Vercel's caching differs from Render), the `force-dynamic` pages (`/overview`, `/budget`, `/user`), date/timezone math (Asia/Singapore "today"), and the in-memory assistant threads (serverless cold starts lose them faster).

---

## Part 5 — Report template (per persona)

Each `qa-report-persona-NN-*.md` uses:

```
# QA — Persona NN: <Name> (<archetype>) — <date>
Data setup: <how the persona's data was created> · Health: NN/100

## Coverage
| Page | Result | Notes |
|------|--------|-------|
| /overview | ✅/⚠️/❌ | ... |

## Findings
### F-NN-01 — <title>  [P0–P4] [Functional/UX/Visual/Data]
- Page / gesture:
- Expected (per QAQC): ...
- Actual: ...
- Screenshot: screenshots/pNN-<slug>.png
- Regression-watch ref: R#

## Reconciliation checks (numbers verified)
- Total income $X == seed sum ✅ ; Net worth identity ✅ ; CPF tab == Holdings ✅
```

Findings roll up into `QA_BASELINE_SUMMARY.md` (deduped, P0–P3 backlog + Vercel sign-off checklist).

---

## Part 6 — Onboarding QA

Onboarding is once-per-account: `completeOnboarding()` sets `users.onboarding_completed = true`
(one-way), and `/onboarding` redirects to `/overview` while it's true. You do **not** need to
delete the Clerk account to re-test — Clerk identity is separate from app data. Two layers cover it:

### 6A — Amounts are correct (automated, the high-value layer)

`tests/onboarding-flow.test.ts` replays the wizard's save services (`createIncome`,
`createOnboardingExpenses`, `completeOnboarding`) against the `foracle_test` DB and asserts the
persisted rows produce the right numbers via `computeHouseholdSummary` — the same pure function
`/user` renders from. This is "user enters X → app shows the expected amounts," proven without a
browser or Clerk, and runs in CI.

```bash
npm run test:db-setup            # one-time: creates foracle_test + pgvector
npm run test -- onboarding-flow  # green = post-onboarding amounts correct
```

Scenarios: blank slate (zeroed summary), CPF salary + expenses + holdings (the core case —
gross/net/CPF/expenses/holdings/runway all checked), and a no-DOB member (CPF stays off per the
member+DOB policy). Add a scenario here whenever onboarding starts collecting a new figure.

### 6B — Re-run the real wizard (manual dogfood, repeatable)

To walk the actual wizard UI again against the dev DB, reset this household and re-run — no account
deletion:

```bash
# Flip onboarding_completed back to false (the _reset_onboarding.sql helper was
# removed in the migration squash). Replace <clerk-user-id>:
/Applications/Postgres.app/Contents/Versions/17/bin/psql \
  postgresql://evanlee@localhost:5432/foracle_v2_self \
  -c "update users set onboarding_completed = false where id = '<clerk-user-id>'"

# Then (authenticated) visit the real route — now reachable again:
#   http://localhost:3000/onboarding
# Walk all steps, Complete Setup, and confirm /overview shows what you entered.
```

To also clear the household's existing data first, delete it through the app (the
bundled reset script was removed). Re-run as needed.

**Expected-amounts checklist after a manual run** (`/user` and `/overview`):

- Total/gross income == the salary you entered; take-home == gross − CPF (CPF only if the Self
  member has a DOB).
- Total expenses == sum of the category amounts entered.
- Net worth / liquid holdings == sum of the holdings entered.
- `onboarding_completed` is `true` again and `/onboarding` redirects to `/overview`.

### Browser E2E

Clerk auth is now wired for Playwright: `tests/e2e/auth.setup.ts` signs in a dedicated `+clerk_test`
user via a Backend-API sign-in token, and the `authenticated` project reuses the saved session (see
`tests/e2e/dogfood-incomes-timeline.spec.ts`). A dedicated onboarding-wizard spec
(navigation/validation/redirect) still isn't written — 6A guards the numbers and 6B covers the UI
manually for now.

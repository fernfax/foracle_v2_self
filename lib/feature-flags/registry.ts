// Feature-flag registry — single source of truth for the per-user flag system.
//
// Every flag the app knows about is declared here. The DB only ever stores a
// sparse map of overrides (FlagKey -> boolean); anything absent falls back to
// the `defaultEnabled` below. Resolution / cascade logic lives in `resolve.ts`
// (pure, no DB) so it stays unit-testable.
//
// Two kinds of dependency:
//   - requires: hard. A flag is only effectively-enabled if every `requires`
//     ancestor is (recursively) effectively-enabled. Turning a parent off
//     cascades down and disables children.
//   - enhances: soft. Documentation only — it never forces anything off. Used
//     to describe "this page is nicer when X is also on" relationships.

export type FlagKey =
  | "overview"
  | "income"
  | "income.beta"
  | "income.bonus"
  | "income.futureMilestones"
  | "income.timelineStudio"
  | "expenses"
  | "budget"
  | "dashboard.sankey"
  | "dashboard.projection"
  | "assets"
  | "policies"
  | "investments"
  | "goals"
  | "assistant";

export type FeatureFlag = {
  key: FlagKey;
  label: string;
  description: string;
  category: string;
  // 'route' — a top-level navigable feature (a page/section).
  // 'sub'   — a sub-feature that lives inside a route.
  kind: "route" | "sub";
  dependsOn: {
    // Hard cascade + block: all must be effectively-enabled for this flag to count.
    requires: FlagKey[];
    // Soft / documented only: never force-disables.
    enhances: FlagKey[];
  };
  defaultEnabled: boolean;
  stability: "stable" | "beta" | "experimental";
};

export const FEATURE_FLAGS: Record<FlagKey, FeatureFlag> = {
  overview: {
    key: "overview",
    label: "Overview",
    description: "The household overview / dashboard landing page.",
    category: "Dashboard",
    kind: "route",
    dependsOn: { requires: [], enhances: ["income", "expenses", "investments", "assets"] },
    defaultEnabled: true,
    stability: "stable",
  },
  income: {
    key: "income",
    label: "Income",
    description: "The income tracking section.",
    category: "Income",
    kind: "route",
    dependsOn: { requires: [], enhances: [] },
    defaultEnabled: true,
    stability: "stable",
  },
  "income.beta": {
    key: "income.beta",
    label: "Income (Beta UI)",
    description: "The redesigned beta income experience.",
    category: "Income",
    kind: "sub",
    dependsOn: { requires: ["income"], enhances: [] },
    defaultEnabled: false,
    stability: "beta",
  },
  "income.bonus": {
    key: "income.bonus",
    label: "Bonuses",
    description: "Bonus and one-off income modelling within the income section.",
    category: "Income",
    kind: "sub",
    dependsOn: { requires: ["income"], enhances: [] },
    defaultEnabled: true,
    stability: "stable",
  },
  "income.futureMilestones": {
    key: "income.futureMilestones",
    label: "Future Milestones",
    description: "Planned future income milestones (raises, role changes).",
    category: "Income",
    kind: "sub",
    dependsOn: { requires: ["income"], enhances: [] },
    defaultEnabled: true,
    stability: "stable",
  },
  "income.timelineStudio": {
    key: "income.timelineStudio",
    label: "Timeline Studio",
    description: "Experimental visual income-timeline editor.",
    category: "Income",
    kind: "sub",
    dependsOn: { requires: ["income.beta", "income.futureMilestones"], enhances: [] },
    defaultEnabled: false,
    stability: "experimental",
  },
  expenses: {
    key: "expenses",
    label: "Expenses",
    description: "The expense tracking section.",
    category: "Expenses & Budget",
    kind: "route",
    dependsOn: { requires: [], enhances: [] },
    defaultEnabled: true,
    stability: "stable",
  },
  budget: {
    key: "budget",
    label: "Budget",
    description: "Budgeting built on top of expense data.",
    category: "Expenses & Budget",
    kind: "route",
    dependsOn: { requires: ["expenses"], enhances: [] },
    defaultEnabled: true,
    stability: "stable",
  },
  "dashboard.sankey": {
    key: "dashboard.sankey",
    label: "Cashflow Sankey",
    description: "The cashflow Sankey diagram on the overview.",
    category: "Dashboard",
    kind: "sub",
    dependsOn: { requires: ["overview", "income", "expenses"], enhances: [] },
    defaultEnabled: true,
    stability: "stable",
  },
  "dashboard.projection": {
    key: "dashboard.projection",
    label: "Cashflow Projection",
    description: "The cashflow projection chart on the overview.",
    category: "Dashboard",
    kind: "sub",
    dependsOn: { requires: ["overview", "income", "expenses"], enhances: [] },
    defaultEnabled: true,
    stability: "stable",
  },
  assets: {
    key: "assets",
    label: "Assets",
    description: "The assets tracking section.",
    category: "Assets",
    kind: "route",
    dependsOn: { requires: [], enhances: [] },
    defaultEnabled: true,
    stability: "stable",
  },
  policies: {
    key: "policies",
    label: "Policies",
    description: "Insurance policy tracking.",
    category: "Other",
    kind: "route",
    dependsOn: { requires: [], enhances: [] },
    defaultEnabled: true,
    stability: "stable",
  },
  investments: {
    key: "investments",
    label: "Investments",
    description: "The investments tracking section.",
    category: "Assets",
    kind: "route",
    dependsOn: { requires: [], enhances: [] },
    defaultEnabled: true,
    stability: "stable",
  },
  goals: {
    key: "goals",
    label: "Goals",
    description: "Financial goal planning.",
    category: "Other",
    kind: "route",
    dependsOn: { requires: [], enhances: [] },
    defaultEnabled: true,
    stability: "stable",
  },
  assistant: {
    key: "assistant",
    label: "Assistant",
    description: "The AI financial assistant.",
    category: "Other",
    kind: "route",
    dependsOn: { requires: [], enhances: [] },
    defaultEnabled: true,
    stability: "stable",
  },
};

// Ordered list of every flag key. Derived from the registry so it can't drift
// out of sync with FEATURE_FLAGS (object key order is insertion order here).
export const ALL_FLAG_KEYS: FlagKey[] = Object.keys(FEATURE_FLAGS) as FlagKey[];

// The default override map: each flag at its registry default. Useful as a
// starting point for callers that want a fully-populated map rather than the
// sparse stored form.
export function getDefaultOverrides(): Record<FlagKey, boolean> {
  return ALL_FLAG_KEYS.reduce((acc, key) => {
    acc[key] = FEATURE_FLAGS[key].defaultEnabled;
    return acc;
  }, {} as Record<FlagKey, boolean>);
}

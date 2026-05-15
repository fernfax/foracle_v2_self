export type DeveloperTableScope =
  | "self"            // users.id = currentUserId
  | "primaryFamily"   // families.id = currentUser.familyId
  | "userId"          // table.userId = currentUserId
  | "global";         // no scoping

export type DeveloperTableMeta = {
  name: string;
  scope: DeveloperTableScope;
};

export const DEVELOPER_TABLES: ReadonlyArray<DeveloperTableMeta> = [
  { name: "users", scope: "self" },
  { name: "families", scope: "primaryFamily" },
  { name: "family_members", scope: "userId" },
  { name: "incomes", scope: "userId" },
  { name: "incomes_beta", scope: "userId" },
  { name: "expenses", scope: "userId" },
  { name: "daily_expenses", scope: "userId" },
  { name: "expense_categories", scope: "userId" },
  { name: "expense_subcategories", scope: "userId" },
  { name: "budget_shifts", scope: "userId" },
  { name: "assets", scope: "userId" },
  { name: "property_assets", scope: "userId" },
  { name: "vehicle_assets", scope: "userId" },
  { name: "current_holdings", scope: "userId" },
  { name: "holding_amount_history", scope: "userId" },
  { name: "investment_policies", scope: "userId" },
  { name: "policies", scope: "userId" },
  { name: "insurance_providers", scope: "userId" },
  { name: "goals", scope: "userId" },
  { name: "quick_links", scope: "userId" },
  { name: "user_chunks", scope: "userId" },
  { name: "kb_chunks", scope: "global" },
];

export type TableRowsResult = {
  scope: DeveloperTableScope;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  returned: number;
  totalForScope: number;
  truncated: boolean;
};

export type DeveloperTableScope =
  | "self"            // users.id = currentUserId
  | "primaryFamily"   // families.id = currentUser.familyId
  | "familyId"        // table.familyId = currentUser.familyId  (family-shared rows)
  | "userId"          // table.userId = currentUserId           (per-user rows)
  | "global";         // no scoping

export type DeveloperTableMeta = {
  name: string;
  scope: DeveloperTableScope;
};

export const DEVELOPER_TABLES: ReadonlyArray<DeveloperTableMeta> = [
  { name: "users", scope: "self" },
  { name: "families", scope: "primaryFamily" },
  { name: "family_members", scope: "familyId" },
  { name: "incomes", scope: "familyId" },
  { name: "incomes_beta", scope: "familyId" },
  { name: "expenses", scope: "familyId" },
  { name: "daily_expenses", scope: "familyId" },
  { name: "expense_categories", scope: "familyId" },
  { name: "expense_subcategories", scope: "familyId" },
  { name: "budget_shifts", scope: "familyId" },
  { name: "assets", scope: "familyId" },
  { name: "property_assets", scope: "familyId" },
  { name: "vehicle_assets", scope: "familyId" },
  { name: "current_holdings", scope: "familyId" },
  { name: "holding_amount_history", scope: "familyId" },
  { name: "investment_policies", scope: "familyId" },
  { name: "policies", scope: "familyId" },
  { name: "insurance_providers", scope: "familyId" },
  { name: "goals", scope: "familyId" },
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

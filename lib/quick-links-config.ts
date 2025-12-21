export interface QuickLinkOption {
  key: string;
  label: string;
  href: string;
  icon: string;
  category: "main" | "user-tabs" | "expenses-tabs";
}

export const QUICK_LINK_OPTIONS: QuickLinkOption[] = [
  // Main Pages
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "Home", category: "main" },
  { key: "user", label: "User Homepage", href: "/dashboard/user", icon: "User", category: "main" },
  { key: "expenses", label: "Expenses", href: "/dashboard/user/expenses", icon: "Wallet", category: "main" },
  { key: "assets", label: "Assets", href: "/dashboard/user/assets", icon: "TrendingUp", category: "main" },
  { key: "insurance", label: "Insurance", href: "/dashboard/policies", icon: "Shield", category: "main" },
  { key: "goals", label: "Goals", href: "/dashboard/goals", icon: "Target", category: "main" },

  // User Homepage Tabs
  { key: "user-family", label: "User - Family", href: "/dashboard/user?tab=family", icon: "Users", category: "user-tabs" },
  { key: "user-incomes", label: "User - Incomes", href: "/dashboard/user?tab=incomes", icon: "DollarSign", category: "user-tabs" },
  { key: "user-cpf", label: "User - CPF", href: "/dashboard/user?tab=cpf", icon: "Building", category: "user-tabs" },
  { key: "user-holdings", label: "User - Holdings", href: "/dashboard/user?tab=current", icon: "Wallet", category: "user-tabs" },

  // Expenses Tabs
  { key: "expenses-list", label: "Expenses - List", href: "/dashboard/user/expenses?tab=expenses", icon: "Receipt", category: "expenses-tabs" },
  { key: "expenses-graph", label: "Expenses - Graph", href: "/dashboard/user/expenses?tab=graph", icon: "TrendingUp", category: "expenses-tabs" },
  { key: "expenses-reports", label: "Expenses - Reports", href: "/dashboard/user/expenses?tab=reports", icon: "PieChart", category: "expenses-tabs" },
];

export const MAX_QUICK_LINKS = 5;

export const CATEGORY_LABELS: Record<QuickLinkOption["category"], string> = {
  "main": "Main Pages",
  "user-tabs": "User Homepage Tabs",
  "expenses-tabs": "Expenses Tabs",
};

export function getQuickLinkOption(key: string): QuickLinkOption | undefined {
  return QUICK_LINK_OPTIONS.find((option) => option.key === key);
}

export function getOptionsByCategory(category: QuickLinkOption["category"]): QuickLinkOption[] {
  return QUICK_LINK_OPTIONS.filter((option) => option.category === category);
}

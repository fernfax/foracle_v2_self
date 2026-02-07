export interface QuickLinkOption {
  key: string;
  label: string;
  href: string;
  icon: string;
  category: "main" | "user-tabs" | "expenses-tabs";
}

export const QUICK_LINK_OPTIONS: QuickLinkOption[] = [
  // Main Pages
  { key: "overview", label: "Overview", href: "/overview", icon: "Home", category: "main" },
  { key: "user", label: "User Homepage", href: "/user", icon: "User", category: "main" },
  { key: "expenses", label: "Expenses", href: "/expenses", icon: "Wallet", category: "main" },
  { key: "assets", label: "Assets", href: "/assets", icon: "TrendingUp", category: "main" },
  { key: "insurance", label: "Insurance", href: "/policies", icon: "Shield", category: "main" },
  { key: "goals", label: "Goals", href: "/goals", icon: "Target", category: "main" },

  // User Homepage Tabs
  { key: "user-family", label: "User - Family", href: "/user?tab=family", icon: "Users", category: "user-tabs" },
  { key: "user-incomes", label: "User - Incomes", href: "/user?tab=incomes", icon: "DollarSign", category: "user-tabs" },
  { key: "user-cpf", label: "User - CPF", href: "/user?tab=cpf", icon: "Building", category: "user-tabs" },
  { key: "user-holdings", label: "User - Holdings", href: "/user?tab=current", icon: "Wallet", category: "user-tabs" },

  // Expenses Tabs
  { key: "expenses-list", label: "Expenses - List", href: "/expenses?tab=expenses", icon: "Receipt", category: "expenses-tabs" },
  { key: "expenses-graph", label: "Expenses - Graph", href: "/expenses?tab=graph", icon: "TrendingUp", category: "expenses-tabs" },
  { key: "expenses-reports", label: "Expenses - Reports", href: "/expenses?tab=reports", icon: "PieChart", category: "expenses-tabs" },
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

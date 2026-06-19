// Curated functional descriptions for the server actions in lib/actions/*.
//
// The developer-mode diagram (lib/developer-diagram.ts) auto-discovers every
// exported action and renders it as a node. The diagram knows the *shape* of
// the graph (who calls what) but not what each action does for the user. This
// catalog supplies that human-readable layer: a functional category and a
// one-line description, keyed by the node label "<file>.<exportName>" (e.g.
// "income.createIncome") so it lines up exactly with toActionNode().
//
// Adding a new action? Drop an entry here keyed by "<file>.<export>". Missing
// entries simply render without a description — the diagram still works.

export type ActionCategory =
  | "Income"
  | "Expenses"
  | "Daily spending"
  | "Categories"
  | "Budget"
  | "Goals"
  | "Net worth & assets"
  | "Insurance"
  | "CPF"
  | "Household"
  | "Onboarding & tours"
  | "Preferences"
  | "Currency"
  | "Dashboard"
  | "Platform"

export type ActionInfo = {
  category: ActionCategory
  description: string
}

// Brand-consistent accent per functional category (used for the side-panel chip).
export const CATEGORY_COLOR: Record<
  ActionCategory,
  { bg: string; text: string }
> = {
  Income: { bg: "#D9E5DF", text: "#1F3D36" },
  Expenses: { bg: "#FBE5D4", text: "#5C2E14" },
  "Daily spending": { bg: "#FBE5D4", text: "#5C2E14" },
  Categories: { bg: "#F2EAD3", text: "#5C4810" },
  Budget: { bg: "#FBE5D4", text: "#5C2E14" },
  Goals: { bg: "#C9E9E2", text: "#003F38" },
  "Net worth & assets": { bg: "#C9E9E2", text: "#003F38" },
  Insurance: { bg: "#E5DAF0", text: "#3B2A5C" },
  CPF: { bg: "#E5DAF0", text: "#3B2A5C" },
  Household: { bg: "#F2EAD3", text: "#5C4810" },
  "Onboarding & tours": { bg: "#EAE4DA", text: "#4A4034" },
  Preferences: { bg: "#EAE4DA", text: "#4A4034" },
  Currency: { bg: "#EAE4DA", text: "#4A4034" },
  Dashboard: { bg: "#D9E5DF", text: "#1F3D36" },
  Platform: { bg: "#E5E5E5", text: "#3A3A3A" }
}

export const ACTION_CATALOG: Record<string, ActionInfo> = {
  // ---- Income ----
  "income.createIncome": {
    category: "Income",
    description: "Record a new income source for a family member."
  },
  "income.updateIncome": {
    category: "Income",
    description: "Edit an income source; recomputes its CPF contribution."
  },
  "income.deleteIncome": {
    category: "Income",
    description: "Remove an income source (blocked if tied to a member)."
  },
  "income.toggleIncomeStatus": {
    category: "Income",
    description: "Pause or resume an income source."
  },
  "income.getIncomes": {
    category: "Income",
    description: "List all household income sources."
  },
  "incomes.getIncomes": {
    category: "Income",
    description: "List incomes via the normalized beta income model."
  },
  "incomes.createIncome": {
    category: "Income",
    description: "Add an income using the beta income model."
  },
  "incomes.updateIncome": {
    category: "Income",
    description: "Edit an income using the beta income model."
  },
  "incomes.deleteIncome": {
    category: "Income",
    description: "Delete an income using the beta income model."
  },
  "incomes.toggleIncomeStatus": {
    category: "Income",
    description: "Toggle an income active/inactive (beta model)."
  },

  // ---- Expenses ----
  "expenses.getExpenses": {
    category: "Expenses",
    description: "List all household expenses."
  },
  "expenses.addExpense": {
    category: "Expenses",
    description: "Add a recurring or one-off expense."
  },
  "expenses.updateExpense": {
    category: "Expenses",
    description: "Edit an existing expense."
  },
  "expenses.deleteExpense": {
    category: "Expenses",
    description: "Delete an expense."
  },
  "expenses.createExpenseFromPolicy": {
    category: "Expenses",
    description: "Create an Insurance expense linked to a policy."
  },
  "expenses.updateExpenseFromPolicy": {
    category: "Expenses",
    description: "Update the expense linked to a policy."
  },
  "expenses.deleteLinkedExpense": {
    category: "Expenses",
    description: "Delete the expense linked to a policy."
  },

  // ---- Daily spending ----
  "daily-expenses.getDailyExpensesForMonth": {
    category: "Daily spending",
    description: "Get the day-by-day spending log for a month."
  },
  "daily-expenses.getDailyExpenses": {
    category: "Daily spending",
    description: "Get daily spending entries for a date range."
  },
  "daily-expenses.addDailyExpense": {
    category: "Daily spending",
    description: "Log a daily expense (with currency conversion)."
  },
  "daily-expenses.updateDailyExpense": {
    category: "Daily spending",
    description: "Edit a logged daily expense."
  },
  "daily-expenses.deleteDailyExpense": {
    category: "Daily spending",
    description: "Delete a logged daily expense."
  },
  "daily-expenses.getCategorySpendingForMonth": {
    category: "Daily spending",
    description: "Total this month's spending grouped by category."
  },
  "daily-expenses.getTodaySpending": {
    category: "Daily spending",
    description: "Sum what's been spent so far today (SGT)."
  },
  "daily-expenses.getDailySpendingByDay": {
    category: "Daily spending",
    description: "Per-day spending totals for the spending chart."
  },

  // ---- Categories ----
  "expense-categories.getExpenseCategories": {
    category: "Categories",
    description: "List spending categories (auto-seeds missing ones)."
  },
  "expense-categories.addExpenseCategory": {
    category: "Categories",
    description: "Create a new spending category."
  },
  "expense-categories.updateExpenseCategory": {
    category: "Categories",
    description: "Rename a spending category."
  },
  "expense-categories.deleteExpenseCategory": {
    category: "Categories",
    description: "Delete a spending category."
  },
  "expense-categories.getExpensesByCategory": {
    category: "Categories",
    description: "List expenses within a named category."
  },
  "expense-categories.getAllExpensesGroupedByCategory": {
    category: "Categories",
    description: "Group all expenses by category for a month."
  },
  "expense-categories.updateExpenseCategoryIcon": {
    category: "Categories",
    description: "Set a category's icon."
  },
  "expense-categories.updateTrackedCategories": {
    category: "Categories",
    description: "Choose which categories count toward the budget."
  },
  "expense-categories.updateTrackedExpenses": {
    category: "Categories",
    description: "Choose which individual expenses the budget tracks."
  },
  "expense-subcategories.getSubcategoriesByCategory": {
    category: "Categories",
    description: "List subcategories under a category."
  },
  "expense-subcategories.getAllSubcategories": {
    category: "Categories",
    description: "List every subcategory for the user."
  },
  "expense-subcategories.addSubcategory": {
    category: "Categories",
    description: "Add a subcategory to a category."
  },
  "expense-subcategories.updateSubcategory": {
    category: "Categories",
    description: "Rename a subcategory."
  },
  "expense-subcategories.deleteSubcategory": {
    category: "Categories",
    description: "Delete a subcategory."
  },

  // ---- Budget ----
  "budget-calculator.calculateCategoryBudgets": {
    category: "Budget",
    description: "Derive the monthly budget per category from tracked expenses."
  },
  "budget-calculator.getTotalMonthlyBudget": {
    category: "Budget",
    description: "Total monthly budget across tracked expenses."
  },
  "budget-calculator.getBudgetVsActual": {
    category: "Budget",
    description: "Compare budget vs actual spend per category."
  },
  "budget-calculator.getBudgetSummary": {
    category: "Budget",
    description: "Overall budget summary: spent, remaining, pacing."
  },
  "budget-shifts.createBudgetShift": {
    category: "Budget",
    description: "Move budget from one category to another mid-month."
  },
  "budget-shifts.getBudgetShiftsForMonth": {
    category: "Budget",
    description: "List budget shifts made in a month."
  },
  "budget-shifts.deleteBudgetShift": {
    category: "Budget",
    description: "Undo a budget shift."
  },
  "budget-shifts.getBudgetAdjustmentsForMonth": {
    category: "Budget",
    description: "Net per-category budget adjustment from all shifts."
  },
  "budget-shifts.getShiftableAmount": {
    category: "Budget",
    description: "How much budget is still free to move from a category."
  },

  // ---- Goals ----
  "goals.createGoal": {
    category: "Goals",
    description: "Set a savings goal (can auto-create a Savings expense)."
  },
  "goals.getGoals": {
    category: "Goals",
    description: "List all savings goals."
  },
  "goals.getActiveGoals": {
    category: "Goals",
    description: "List active (not-yet-achieved) goals."
  },
  "goals.getAchievedGoals": {
    category: "Goals",
    description: "List achieved goals."
  },
  "goals.updateGoal": {
    category: "Goals",
    description: "Edit a goal; syncs its linked Savings contribution."
  },
  "goals.markGoalAchieved": {
    category: "Goals",
    description: "Mark a savings goal as achieved."
  },
  "goals.deleteGoal": {
    category: "Goals",
    description: "Delete a goal and its linked Savings expense."
  },

  // ---- Net worth & assets ----
  "current-holdings.getCurrentHoldings": {
    category: "Net worth & assets",
    description: "List cash & bank account balances."
  },
  "current-holdings.addCurrentHolding": {
    category: "Net worth & assets",
    description: "Add a cash/bank holding and record its balance."
  },
  "current-holdings.updateCurrentHolding": {
    category: "Net worth & assets",
    description: "Update a holding; snapshots the balance to history."
  },
  "current-holdings.deleteCurrentHolding": {
    category: "Net worth & assets",
    description: "Remove a cash/bank holding."
  },
  "property-assets.createPropertyAsset": {
    category: "Net worth & assets",
    description: "Add a property with loan/CPF/grant tracking."
  },
  "property-assets.getPropertyAssets": {
    category: "Net worth & assets",
    description: "List property assets."
  },
  "property-assets.updatePropertyAsset": {
    category: "Net worth & assets",
    description: "Edit a property asset."
  },
  "property-assets.deletePropertyAsset": {
    category: "Net worth & assets",
    description: "Delete a property and its linked expense."
  },
  "vehicle-assets.createVehicleAsset": {
    category: "Net worth & assets",
    description: "Add a vehicle with loan/COE tracking."
  },
  "vehicle-assets.getVehicleAssets": {
    category: "Net worth & assets",
    description: "List vehicle assets."
  },
  "vehicle-assets.updateVehicleAsset": {
    category: "Net worth & assets",
    description: "Edit a vehicle asset."
  },
  "vehicle-assets.deleteVehicleAsset": {
    category: "Net worth & assets",
    description: "Delete a vehicle and its linked expense."
  },
  "investments.getInvestments": {
    category: "Net worth & assets",
    description: "List investment holdings."
  },
  "investments.getInvestmentsSummary": {
    category: "Net worth & assets",
    description: "Portfolio summary: value, yield, contributions."
  },
  "investments.createInvestment": {
    category: "Net worth & assets",
    description: "Add an investment holding."
  },
  "investments.updateInvestment": {
    category: "Net worth & assets",
    description: "Edit an investment holding."
  },
  "investments.deleteInvestment": {
    category: "Net worth & assets",
    description: "Delete an investment holding."
  },

  // ---- Insurance ----
  "policies.getUserPolicies": {
    category: "Insurance",
    description: "List the household's insurance policies."
  },
  "policies.createPolicy": {
    category: "Insurance",
    description: "Add an insurance policy (optionally linked to an expense)."
  },
  "policies.updatePolicy": {
    category: "Insurance",
    description: "Edit an insurance policy."
  },
  "policies.deletePolicy": {
    category: "Insurance",
    description: "Delete a policy and cascade its linked expense."
  },
  "insurance-providers.getInsuranceProviders": {
    category: "Insurance",
    description: "List insurance providers (seeds defaults if empty)."
  },
  "insurance-providers.addInsuranceProvider": {
    category: "Insurance",
    description: "Add a custom insurance provider."
  },
  "insurance-providers.updateInsuranceProvider": {
    category: "Insurance",
    description: "Rename an insurance provider."
  },
  "insurance-providers.deleteInsuranceProvider": {
    category: "Insurance",
    description: "Delete an insurance provider."
  },

  // ---- CPF ----
  "cpf.getCpfByFamilyMember": {
    category: "CPF",
    description: "CPF contributions aggregated per family member."
  },

  // ---- Household ----
  "family-members.createFamilyMember": {
    category: "Household",
    description: "Add a family member to the household."
  },
  "family-members.updateFamilyMember": {
    category: "Household",
    description: "Edit a family member's details."
  },
  "family-members.getFamilyMemberIncomes": {
    category: "Household",
    description: "List incomes tied to a family member."
  },
  "family-members.deleteFamilyMember": {
    category: "Household",
    description: "Delete a member and cascade their incomes."
  },
  "family-members.getOrCreateSelfMember": {
    category: "Household",
    description: "Get or auto-create the 'Self' member for onboarding."
  },
  "family-members.getFamilyMembers": {
    category: "Household",
    description: "List family members (auto-creates 'Self')."
  },
  "family-invitations.inviteFamilyMember": {
    category: "Household",
    description: "Email an invite to join the family account."
  },
  "family-invitations.convertFamilyMember": {
    category: "Household",
    description: "Promote a pending member into a linked login."
  },
  "family-invitations.revokeInvitation": {
    category: "Household",
    description: "Cancel a pending family invitation."
  },
  "family-invitations.resendInvitation": {
    category: "Household",
    description: "Re-send a pending invitation email."
  },
  "family-invitations.getFamilyAdminData": {
    category: "Household",
    description: "Load roster, identity, and pending invites in one call."
  },

  // ---- Onboarding & tours ----
  "onboarding.checkOnboardingStatus": {
    category: "Onboarding & tours",
    description: "Check whether the user finished onboarding."
  },
  "onboarding.completeOnboarding": {
    category: "Onboarding & tours",
    description: "Mark onboarding complete."
  },
  "onboarding.getOnboardingData": {
    category: "Onboarding & tours",
    description: "Hydrate the wizard from saved answers on resume."
  },
  "onboarding.createOnboardingExpenses": {
    category: "Onboarding & tours",
    description: "Seed starter expenses from onboarding choices."
  },
  "tour.getTourStatus": {
    category: "Onboarding & tours",
    description: "Get which guided tours the user has completed."
  },
  "tour.markTourCompleted": {
    category: "Onboarding & tours",
    description: "Mark a guided tour as completed."
  },
  "tour.resetTourStatus": {
    category: "Onboarding & tours",
    description: "Reset a tour so it can replay."
  },
  "tour.isTourCompleted": {
    category: "Onboarding & tours",
    description: "Check whether a specific tour is completed."
  },

  // ---- Preferences ----
  "singlish-mode.getSinglishMode": {
    category: "Preferences",
    description: "Read the Singlish language-mode preference."
  },
  "singlish-mode.setSinglishMode": {
    category: "Preferences",
    description: "Toggle Singlish language mode."
  },
  "singlish-mode.getBackgroundDecor": {
    category: "Preferences",
    description: "Read the background wallpaper preference."
  },
  "singlish-mode.setBackgroundDecor": {
    category: "Preferences",
    description: "Set the background wallpaper."
  },
  "quick-links.getQuickLinks": {
    category: "Preferences",
    description: "List the user's pinned dashboard shortcuts."
  },
  "quick-links.addQuickLink": {
    category: "Preferences",
    description: "Pin a dashboard shortcut (within the max limit)."
  },
  "quick-links.removeQuickLink": {
    category: "Preferences",
    description: "Unpin a dashboard shortcut."
  },
  "quick-links.updateQuickLinksOrder": {
    category: "Preferences",
    description: "Reorder pinned shortcuts."
  },
  "quick-links.syncQuickLinks": {
    category: "Preferences",
    description: "Sync the pinned-shortcut set in one call."
  },

  // ---- Currency ----
  "currency.getExchangeRates": {
    category: "Currency",
    description: "Fetch SGD exchange rates (1h cache)."
  },
  "currency.convertToSGD": {
    category: "Currency",
    description: "Convert a foreign amount to SGD."
  },
  "currency.getExchangeRate": {
    category: "Currency",
    description: "Get one currency's rate to SGD."
  },

  // ---- Dashboard ----
  "user.getCurrentUserId": {
    category: "Dashboard",
    description: "Get the signed-in user's Clerk ID."
  },
  "user.getCurrentUser": {
    category: "Dashboard",
    description: "Load the signed-in user's profile."
  },
  "user.getUserIncomes": {
    category: "Dashboard",
    description: "Dashboard feed: household incomes."
  },
  "user.getUserExpenses": {
    category: "Dashboard",
    description: "Dashboard feed: household expenses."
  },
  "user.getUserAssets": {
    category: "Dashboard",
    description: "Dashboard feed: generic assets."
  },
  "user.getUserPropertyAssets": {
    category: "Dashboard",
    description: "Dashboard feed: property assets."
  },
  "user.getUserVehicleAssets": {
    category: "Dashboard",
    description: "Dashboard feed: vehicle assets."
  },
  "user.getUserPolicies": {
    category: "Dashboard",
    description: "Dashboard feed: insurance policies."
  },
  "user.getUserGoals": {
    category: "Dashboard",
    description: "Dashboard feed: savings goals."
  },
  "user.getUserFamilyMembers": {
    category: "Dashboard",
    description: "Dashboard feed: family members."
  },
  "user.getDashboardMetrics": {
    category: "Dashboard",
    description: "Aggregated dashboard metrics in one round-trip."
  },

  // ---- Platform ----
  "developer.getTableRows": {
    category: "Platform",
    description: "Read raw DB table rows (developer mode only)."
  }
}

export function getActionInfo(
  fileLabel: string,
  exportName: string
): ActionInfo | undefined {
  return ACTION_CATALOG[`${fileLabel}.${exportName}`]
}

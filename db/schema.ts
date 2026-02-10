import { pgTable, text, timestamp, decimal, integer, varchar, date, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table - synced with Clerk
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(), // Clerk user ID
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  imageUrl: text("image_url"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  tourCompletedAt: text("tour_completed_at"), // JSON: {"dashboard":"2024-01-15T...","incomes":null,"expenses":null}
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Family members table
export const familyMembers = pgTable("family_members", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  relationship: varchar("relationship", { length: 100 }), // spouse, child, dependent, etc.
  dateOfBirth: date("date_of_birth"),
  isContributing: boolean("is_contributing").default(false), // Consider this member's income into the total income
  notes: text("notes"), // Additional notes about family member
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Incomes table
export const incomes = pgTable("incomes", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  familyMemberId: varchar("family_member_id", { length: 255 }).references(() => familyMembers.id, { onDelete: "cascade" }), // Optional link to family member
  name: varchar("name", { length: 255 }).notNull(), // Income source name (e.g., "Primary Income", "Monthly Salary")
  category: varchar("category", { length: 100 }).notNull(), // salary, freelance, business, investment, etc.
  incomeCategory: varchar("income_category", { length: 50 }).default("current-recurring"), // current-recurring, future-recurring, temporary, one-off
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(), // monthly, yearly, one-time, weekly, bi-weekly, custom
  customMonths: text("custom_months"), // JSON array of month numbers for custom frequency (e.g., "[1,3,6,12]" for Jan, Mar, Jun, Dec)
  subjectToCpf: boolean("subject_to_cpf").default(false), // Subject to CPF deductions
  accountForBonus: boolean("account_for_bonus").default(false), // Whether to account for bonuses
  bonusGroups: text("bonus_groups"), // JSON array of bonus groups (e.g., '[{"month": 12, "amount": "1.5"}]')
  employeeCpfContribution: decimal("employee_cpf_contribution", { precision: 12, scale: 2 }), // Calculated employee CPF share
  employerCpfContribution: decimal("employer_cpf_contribution", { precision: 12, scale: 2 }), // Calculated employer CPF share
  netTakeHome: decimal("net_take_home", { precision: 12, scale: 2 }), // Gross minus employee CPF
  cpfOrdinaryAccount: decimal("cpf_ordinary_account", { precision: 12, scale: 2 }), // CPF OA allocation
  cpfSpecialAccount: decimal("cpf_special_account", { precision: 12, scale: 2 }), // CPF SA allocation
  cpfMedisaveAccount: decimal("cpf_medisave_account", { precision: 12, scale: 2 }), // CPF MA allocation
  description: text("description"), // Payment notes
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // Optional - leave empty for ongoing income
  pastIncomeHistory: text("past_income_history"), // JSON: historical income data [{period, granularity, amount, notes}]
  futureMilestones: text("future_milestones"), // JSON: planned income changes [{id, targetMonth, amount, reason, notes}]
  accountForFutureChange: boolean("account_for_future_change").default(false), // Include future milestones in balance projections
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Expense categories table
export const expenseCategories = pgTable("expense_categories", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }), // lucide icon name (e.g., "utensils", "car", "home")
  isDefault: boolean("is_default").default(false), // System default categories
  trackedInBudget: boolean("tracked_in_budget").default(true), // Whether to include in budget tracker
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Expense subcategories table - for more granular expense tracking
export const expenseSubcategories = pgTable("expense_subcategories", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id", { length: 255 }).notNull().references(() => expenseCategories.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insurance providers table
export const insuranceProviders = pgTable("insurance_providers", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  isDefault: boolean("is_default").default(false), // System default providers
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  linkedPolicyId: varchar("linked_policy_id", { length: 255 }), // Link to insurance policy if expense is auto-generated from policy
  linkedPropertyId: varchar("linked_property_id", { length: 255 }), // Link to property asset if expense is auto-generated from property
  linkedVehicleId: varchar("linked_vehicle_id", { length: 255 }), // Link to vehicle asset if expense is auto-generated from vehicle
  linkedGoalId: varchar("linked_goal_id", { length: 255 }), // Link to goal if expense is auto-generated from goal contribution
  name: varchar("name", { length: 255 }).notNull(), // Expense name (e.g., "Rent", "Groceries")
  category: varchar("category", { length: 100 }).notNull(), // housing, food, transportation, utilities, etc.
  expenseCategory: varchar("expense_category", { length: 50 }).default("current-recurring"), // current-recurring, future-recurring, temporary, one-off
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(), // monthly, yearly, one-time, weekly, bi-weekly, custom
  customMonths: text("custom_months"), // JSON array of month numbers for custom frequency (e.g., "[1,3,6,12]" for Jan, Mar, Jun, Dec)
  startDate: date("start_date"), // Optional - null for recurring expenses (applicable for all past/future months)
  endDate: date("end_date"), // Optional - leave empty for ongoing expense
  description: text("description"), // Additional notes
  isActive: boolean("is_active").default(true),
  trackedInBudget: boolean("tracked_in_budget").default(true), // Whether to include in budget tracker
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Daily expenses table - for tracking actual daily spending
export const dailyExpenses = pgTable("daily_expenses", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id", { length: 255 }).references(() => expenseCategories.id, { onDelete: "set null" }),
  categoryName: varchar("category_name", { length: 100 }).notNull(), // Store category name for historical reference
  subcategoryId: varchar("subcategory_id", { length: 255 }).references(() => expenseSubcategories.id, { onDelete: "set null" }),
  subcategoryName: varchar("subcategory_name", { length: 100 }), // Store subcategory name for historical reference
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Amount in SGD (converted if foreign currency)
  note: text("note"),
  date: date("date").notNull(), // The date of the expense
  originalCurrency: varchar("original_currency", { length: 10 }), // Currency code if not SGD (e.g., "USD", "EUR")
  originalAmount: decimal("original_amount", { precision: 12, scale: 2 }), // Amount in original currency
  exchangeRate: decimal("exchange_rate", { precision: 12, scale: 6 }), // Exchange rate used (1 foreign = X SGD)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Assets table (generic)
export const assets = pgTable("assets", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(), // property, vehicle, investment, savings, etc.
  name: varchar("name", { length: 255 }).notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).notNull(),
  purchaseValue: decimal("purchase_value", { precision: 15, scale: 2 }),
  purchaseDate: date("purchase_date"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Property Assets table
export const propertyAssets = pgTable("property_assets", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  linkedExpenseId: varchar("linked_expense_id", { length: 255 }),

  // Property Information
  propertyName: varchar("property_name", { length: 255 }).notNull(),
  purchaseDate: date("purchase_date").notNull(),

  // Purchase Details
  originalPurchasePrice: decimal("original_purchase_price", { precision: 15, scale: 2 }).notNull(),
  loanAmountTaken: decimal("loan_amount_taken", { precision: 15, scale: 2 }),

  // Loan Repayment
  outstandingLoan: decimal("outstanding_loan", { precision: 15, scale: 2 }).notNull(),
  monthlyLoanPayment: decimal("monthly_loan_payment", { precision: 12, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(),

  // Additional Details (CPF)
  principalCpfWithdrawn: decimal("principal_cpf_withdrawn", { precision: 15, scale: 2 }),
  housingGrantTaken: decimal("housing_grant_taken", { precision: 15, scale: 2 }),
  accruedInterestToDate: decimal("accrued_interest_to_date", { precision: 15, scale: 2 }),

  // Metadata
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Vehicle Assets table
export const vehicleAssets = pgTable("vehicle_assets", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  linkedExpenseId: varchar("linked_expense_id", { length: 255 }),

  // Vehicle Information
  vehicleName: varchar("vehicle_name", { length: 255 }).notNull(),
  purchaseDate: date("purchase_date").notNull(),
  coeExpiryDate: date("coe_expiry_date"), // Certificate of Entitlement expiry date (Singapore)

  // Purchase Details
  originalPurchasePrice: decimal("original_purchase_price", { precision: 15, scale: 2 }).notNull(),
  loanAmountTaken: decimal("loan_amount_taken", { precision: 15, scale: 2 }),

  // Loan Repayment
  loanAmountRepaid: decimal("loan_amount_repaid", { precision: 15, scale: 2 }),
  monthlyLoanPayment: decimal("monthly_loan_payment", { precision: 12, scale: 2 }),

  // Metadata
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Policies table (insurance, subscriptions, etc.)
export const policies = pgTable("policies", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  familyMemberId: varchar("family_member_id", { length: 255 }).references(() => familyMembers.id, { onDelete: "cascade" }), // Policy holder
  linkedExpenseId: varchar("linked_expense_id", { length: 255 }), // Link to auto-generated expense if policy is tracked in expenditures

  // Policy Information
  provider: varchar("provider", { length: 255 }).notNull(), // Insurance provider
  policyNumber: varchar("policy_number", { length: 255 }), // Optional policy number
  policyType: varchar("policy_type", { length: 100 }).notNull(), // life, health, auto, home, etc.
  status: varchar("status", { length: 50 }).default("active"), // active, lapsed, cancelled, matured

  // Policy Dates
  startDate: date("start_date").notNull(),
  maturityDate: date("maturity_date"), // Auto-populated or manually set
  coverageUntilAge: integer("coverage_until_age"), // Age when coverage ends

  // Premium Details
  premiumAmount: decimal("premium_amount", { precision: 12, scale: 2 }).notNull(),
  premiumFrequency: varchar("premium_frequency", { length: 50 }).notNull(), // monthly, custom
  customMonths: text("custom_months"), // JSON array of month numbers for custom frequency (e.g., "[1,3,6,12]" for Jan, Mar, Jun, Dec)
  totalPremiumDuration: integer("total_premium_duration"), // Total number of years to pay premiums

  // Coverage & Benefits (stored as JSON)
  coverageOptions: text("coverage_options"), // JSON: { death: amount, tpd: amount, criticalIllness: amount, earlyCriticalIllness: amount, hospitalisationPlan: amount }

  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Goals table
export const goals = pgTable("goals", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  linkedExpenseId: varchar("linked_expense_id", { length: 255 }), // Link to auto-generated expense if goal contribution is tracked

  // Basic Details
  goalName: varchar("goal_name", { length: 255 }).notNull(),
  goalType: varchar("goal_type", { length: 50 }).notNull().default("primary"), // primary, secondary
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
  targetDate: date("target_date").notNull(),

  // Progress Tracking
  currentAmountSaved: decimal("current_amount_saved", { precision: 15, scale: 2 }).default("0"),
  monthlyContribution: decimal("monthly_contribution", { precision: 12, scale: 2 }),
  description: text("description"),

  // Metadata
  isAchieved: boolean("is_achieved").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Current Holdings table
export const currentHoldings = pgTable("current_holdings", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  familyMemberId: varchar("family_member_id", { length: 255 }).references(() => familyMembers.id, { onDelete: "cascade" }), // Account holder
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  holdingAmount: decimal("holding_amount", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quick Links table - user-customizable header shortcuts
export const quickLinks = pgTable("quick_links", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  linkKey: varchar("link_key", { length: 100 }).notNull(), // e.g., "expenses-graph", "user-incomes"
  label: varchar("label", { length: 100 }).notNull(),
  href: varchar("href", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull(), // lucide icon name
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Investment Policies table - for tracking investment assets and contributions
export const investmentPolicies = pgTable("investment_policies", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),

  // Core fields
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // stock, cash, bonds, etf, crypto, mutual_fund, reit

  // Financial details
  currentCapital: decimal("current_capital", { precision: 15, scale: 2 }).notNull(),
  projectedYield: decimal("projected_yield", { precision: 5, scale: 2 }).notNull(), // Annual yield %

  // Contribution details
  contributionAmount: decimal("contribution_amount", { precision: 12, scale: 2 }).notNull(),
  contributionFrequency: varchar("contribution_frequency", { length: 50 }).notNull(), // monthly, custom
  customMonths: text("custom_months"), // JSON array of month numbers [1,3,6,9,12]

  // Status
  isActive: boolean("is_active").default(true),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Budget Shifts table - for transferring budget between categories within a month
export const budgetShifts = pgTable("budget_shifts", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  fromCategoryName: varchar("from_category_name", { length: 100 }).notNull(), // Source category
  toCategoryName: varchar("to_category_name", { length: 100 }).notNull(), // Destination category
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note"), // Optional note explaining the shift
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  familyMembers: many(familyMembers),
  incomes: many(incomes),
  expenses: many(expenses),
  expenseCategories: many(expenseCategories),
  expenseSubcategories: many(expenseSubcategories),
  dailyExpenses: many(dailyExpenses),
  assets: many(assets),
  propertyAssets: many(propertyAssets),
  vehicleAssets: many(vehicleAssets),
  policies: many(policies),
  goals: many(goals),
  currentHoldings: many(currentHoldings),
  quickLinks: many(quickLinks),
  investmentPolicies: many(investmentPolicies),
  budgetShifts: many(budgetShifts),
}));

export const familyMembersRelations = relations(familyMembers, ({ one, many }) => ({
  user: one(users, {
    fields: [familyMembers.userId],
    references: [users.id],
  }),
  incomes: many(incomes),
  currentHoldings: many(currentHoldings),
  policies: many(policies),
}));

export const incomesRelations = relations(incomes, ({ one }) => ({
  user: one(users, {
    fields: [incomes.userId],
    references: [users.id],
  }),
  familyMember: one(familyMembers, {
    fields: [incomes.familyMemberId],
    references: [familyMembers.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  user: one(users, {
    fields: [expenseCategories.userId],
    references: [users.id],
  }),
  subcategories: many(expenseSubcategories),
  dailyExpenses: many(dailyExpenses),
}));

export const expenseSubcategoriesRelations = relations(expenseSubcategories, ({ one, many }) => ({
  user: one(users, {
    fields: [expenseSubcategories.userId],
    references: [users.id],
  }),
  category: one(expenseCategories, {
    fields: [expenseSubcategories.categoryId],
    references: [expenseCategories.id],
  }),
  dailyExpenses: many(dailyExpenses),
}));

export const dailyExpensesRelations = relations(dailyExpenses, ({ one }) => ({
  user: one(users, {
    fields: [dailyExpenses.userId],
    references: [users.id],
  }),
  category: one(expenseCategories, {
    fields: [dailyExpenses.categoryId],
    references: [expenseCategories.id],
  }),
  subcategory: one(expenseSubcategories, {
    fields: [dailyExpenses.subcategoryId],
    references: [expenseSubcategories.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  user: one(users, {
    fields: [assets.userId],
    references: [users.id],
  }),
}));

export const propertyAssetsRelations = relations(propertyAssets, ({ one }) => ({
  user: one(users, {
    fields: [propertyAssets.userId],
    references: [users.id],
  }),
}));

export const vehicleAssetsRelations = relations(vehicleAssets, ({ one }) => ({
  user: one(users, {
    fields: [vehicleAssets.userId],
    references: [users.id],
  }),
}));

export const policiesRelations = relations(policies, ({ one }) => ({
  user: one(users, {
    fields: [policies.userId],
    references: [users.id],
  }),
  familyMember: one(familyMembers, {
    fields: [policies.familyMemberId],
    references: [familyMembers.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
}));

export const currentHoldingsRelations = relations(currentHoldings, ({ one }) => ({
  user: one(users, {
    fields: [currentHoldings.userId],
    references: [users.id],
  }),
  familyMember: one(familyMembers, {
    fields: [currentHoldings.familyMemberId],
    references: [familyMembers.id],
  }),
}));

export const quickLinksRelations = relations(quickLinks, ({ one }) => ({
  user: one(users, {
    fields: [quickLinks.userId],
    references: [users.id],
  }),
}));

export const investmentPoliciesRelations = relations(investmentPolicies, ({ one }) => ({
  user: one(users, {
    fields: [investmentPolicies.userId],
    references: [users.id],
  }),
}));

export const budgetShiftsRelations = relations(budgetShifts, ({ one }) => ({
  user: one(users, {
    fields: [budgetShifts.userId],
    references: [users.id],
  }),
}));

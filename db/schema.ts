import { pgTable, text, timestamp, decimal, integer, varchar, date, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table - synced with Clerk
export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(), // Clerk user ID
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  imageUrl: text("image_url"),
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
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(), // monthly, yearly, one-time, weekly, bi-weekly
  subjectToCpf: boolean("subject_to_cpf").default(false), // Subject to CPF deductions
  bonusAmount: decimal("bonus_amount", { precision: 12, scale: 2 }), // Annual bonus amount
  employeeCpfContribution: decimal("employee_cpf_contribution", { precision: 12, scale: 2 }), // Calculated employee CPF share
  employerCpfContribution: decimal("employer_cpf_contribution", { precision: 12, scale: 2 }), // Calculated employer CPF share
  netTakeHome: decimal("net_take_home", { precision: 12, scale: 2 }), // Gross minus employee CPF
  cpfOrdinaryAccount: decimal("cpf_ordinary_account", { precision: 12, scale: 2 }), // CPF OA allocation
  cpfSpecialAccount: decimal("cpf_special_account", { precision: 12, scale: 2 }), // CPF SA allocation
  cpfMedisaveAccount: decimal("cpf_medisave_account", { precision: 12, scale: 2 }), // CPF MA allocation
  description: text("description"), // Payment notes
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // Optional - leave empty for ongoing income
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 255 }).notNull(), // housing, food, transportation, utilities, etc.
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(), // monthly, yearly, one-time
  description: text("description"),
  date: date("date").notNull(),
  isRecurring: boolean("is_recurring").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Assets table
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

// Policies table (insurance, subscriptions, etc.)
export const policies = pgTable("policies", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(), // life, health, auto, home, subscription, etc.
  provider: varchar("provider", { length: 255 }).notNull(),
  policyNumber: varchar("policy_number", { length: 255 }),
  premium: decimal("premium", { precision: 12, scale: 2 }).notNull(),
  frequency: varchar("frequency", { length: 50 }).notNull(), // monthly, yearly, quarterly
  coverageAmount: decimal("coverage_amount", { precision: 15, scale: 2 }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Goals table
export const goals = pgTable("goals", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 15, scale: 2 }).default("0"),
  targetDate: date("target_date"),
  category: varchar("category", { length: 100 }), // retirement, emergency fund, house, education, etc.
  priority: integer("priority").default(1), // 1-5 scale
  description: text("description"),
  isAchieved: boolean("is_achieved").default(false),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  familyMembers: many(familyMembers),
  incomes: many(incomes),
  expenses: many(expenses),
  assets: many(assets),
  policies: many(policies),
  goals: many(goals),
  currentHoldings: many(currentHoldings),
}));

export const familyMembersRelations = relations(familyMembers, ({ one, many }) => ({
  user: one(users, {
    fields: [familyMembers.userId],
    references: [users.id],
  }),
  incomes: many(incomes),
  currentHoldings: many(currentHoldings),
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

export const assetsRelations = relations(assets, ({ one }) => ({
  user: one(users, {
    fields: [assets.userId],
    references: [users.id],
  }),
}));

export const policiesRelations = relations(policies, ({ one }) => ({
  user: one(users, {
    fields: [policies.userId],
    references: [users.id],
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

import type { DriveStep } from "driver.js";

export type TourName = "dashboard" | "incomes" | "expenses";

export interface TourConfig {
  name: TourName;
  title: string;
  description: string;
  steps: DriveStep[];
}

// Dashboard Tour - 7 steps
const dashboardSteps: DriveStep[] = [
  {
    element: '[data-tour="month-nav"]',
    popover: {
      title: "Month Navigation",
      description:
        "Use these arrows to view your finances for different months. All cards below will update to show that month's data.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: '[data-tour="income-card"]',
    popover: {
      title: "Total Net Income",
      description:
        "Your monthly take-home income after CPF deductions. Click to see a detailed breakdown by source.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="expenses-card"]',
    popover: {
      title: "Total Expenses",
      description:
        "All your expected expenses for the selected month. Click to explore by category.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: '[data-tour="savings-card"]',
    popover: {
      title: "Net Savings",
      description:
        "The difference between your income and expenses. Green means you're saving, red means you're overspending.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="assets-card"]',
    popover: {
      title: "Total Assets",
      description:
        "Your net equity in properties and vehicles. Click to see the full breakdown.",
      side: "top",
      align: "start",
    },
  },
  {
    element: '[data-tour="goals-card"]',
    popover: {
      title: "Active Goals",
      description:
        "Track your financial goals like emergency funds, retirement, or major purchases.",
      side: "top",
      align: "center",
    },
  },
  {
    element: '[data-tour="quick-actions"]',
    popover: {
      title: "Quick Actions",
      description:
        "Shortcuts to add income, expenses, or set new financial goals quickly.",
      side: "top",
      align: "center",
    },
  },
];

// Incomes Tour - 5 steps
const incomesSteps: DriveStep[] = [
  {
    element: '[data-tour="add-income-btn"]',
    popover: {
      title: "Add New Income",
      description:
        "Click here to add a new income source. You can track salary, freelance work, investments, and more.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="income-frequency-filter"]',
    popover: {
      title: "Filter by Frequency",
      description:
        "Quickly filter your incomes by how often they occur - monthly, yearly, or custom schedules.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="income-summary-card"]',
    popover: {
      title: "Annual Income Summary",
      description:
        "See your total annual income at a glance. Click to view detailed breakdowns by category and source.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="cpf-summary-card"]',
    popover: {
      title: "CPF Contributions",
      description:
        "Track your monthly CPF contributions. This shows both employee and employer portions.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-tour="income-table"]',
    popover: {
      title: "Income List",
      description:
        "Your full list of incomes. Click the arrow to expand and see CPF breakdowns, timelines, and future milestones.",
      side: "left",
      align: "start",
    },
  },
];

// Expenses Tour - 5 steps (ordered top to bottom for natural flow)
const expensesSteps: DriveStep[] = [
  {
    element: '[data-tour="expected-expenses-card"]',
    popover: {
      title: "Expected Expenses",
      description:
        "Your total expected spending for the selected month. Use the arrows to navigate months. Click for full breakdown.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="expense-filters"]',
    popover: {
      title: "Filter Expenses",
      description:
        "Use these dropdowns to filter by category (Housing, Food, etc.) or frequency.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="manage-categories-btn"]',
    popover: {
      title: "Manage Categories",
      description: "Customize expense categories to match your budgeting style.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="add-expense-btn"]',
    popover: {
      title: "Add New Expense",
      description:
        "Add recurring expenses, one-time purchases, or custom payment schedules.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="expense-table"]',
    popover: {
      title: "Expense List",
      description:
        "All your tracked expenses. Edit, delete, or view details from the action menu.",
      side: "left",
      align: "start",
    },
  },
];

export const TOUR_CONFIGS: Record<TourName, TourConfig> = {
  dashboard: {
    name: "dashboard",
    title: "Dashboard Tour",
    description: "Learn how to navigate your financial dashboard",
    steps: dashboardSteps,
  },
  incomes: {
    name: "incomes",
    title: "Incomes Tour",
    description: "Learn how to manage your income sources",
    steps: incomesSteps,
  },
  expenses: {
    name: "expenses",
    title: "Expenses Tour",
    description: "Learn how to track your expenses",
    steps: expensesSteps,
  },
};

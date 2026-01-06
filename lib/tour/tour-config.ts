import type { DriveStep } from "driver.js";

export type TourName = "overall" | "dashboard" | "incomes" | "expenses";

export interface TourConfig {
  name: TourName;
  title: string;
  description: string;
  steps: DriveStep[];
}

// Overall Tour - 3 steps (app navigation overview)
const overallSteps: DriveStep[] = [
  {
    element: '[data-tour="sidebar-nav"]',
    popover: {
      title: "Navigation Sidebar",
      description:
        "Access all sections of Foracle from here. Hover to expand and see labels. Navigate to Dashboard, User Profile, Expenses, Assets, Insurance, and Goals.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="header-quick-links"]',
    popover: {
      title: "Quick Links",
      description:
        "Pin your most-used pages here for instant access. Click the settings icon to customize which pages appear.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: '[data-tour="mobile-guide-btn"]',
    popover: {
      title: "Add to Home Screen",
      description:
        "Install Foracle as an app on your phone! Tap here for step-by-step instructions to add it to your home screen.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: "Guided Tours",
      description:
        "Need help anytime? Click this button to access guided tours for different sections of the app.",
      side: "top",
      align: "end",
    },
  },
];

// Dashboard Tour - 6 steps
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
    element: '[data-tour="primary-metrics"]',
    popover: {
      title: "Income, Expenses & Savings",
      description:
        "Your monthly financial snapshot: take-home income after CPF, total expenses, and net savings. Click any card for detailed breakdowns.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: '[data-tour="secondary-metrics"]',
    popover: {
      title: "Assets, Goals & Family",
      description:
        "Track your total assets (property and vehicle equity), active financial goals, and family members in your household.",
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
    onDeselected: () => {
      // Switch to projection tab before the next step using exposed function
      if ((window as any).switchDashboardTab) {
        (window as any).switchDashboardTab('projection');
      }
    },
  },
  {
    element: '[data-tour="dashboard-tabs"]',
    popover: {
      title: "Monthly Balance Projection",
      description:
        "Switch between Overview and Monthly Balance Projection tabs. The projection shows a 12-month forecast of your cash balance based on income and expenses.",
      side: "bottom",
      align: "start",
    },
    onHighlightStarted: () => {
      // Ensure we're on the projection tab
      if ((window as any).switchDashboardTab && !window.location.search.includes('tab=projection')) {
        (window as any).switchDashboardTab('projection');
      }
    },
  },
  {
    element: '[data-tour="graph-controls"]',
    popover: {
      title: "View Mode & Time Range",
      description:
        "Toggle between Cumulative (running balance) and Non-Cumulative (monthly breakdown) views. Adjust the time range from 12 months up to 10 years.",
      side: "bottom",
      align: "end",
    },
    onHighlightStarted: () => {
      // Ensure we're on the projection tab
      if ((window as any).switchDashboardTab && !window.location.search.includes('tab=projection')) {
        (window as any).switchDashboardTab('projection');
      }
      // Wait for content to render then scroll
      setTimeout(() => {
        const graphControls = document.querySelector('[data-tour="graph-controls"]');
        if (graphControls) {
          graphControls.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
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
  overall: {
    name: "overall",
    title: "App Overview",
    description: "Get familiar with Foracle's navigation and key features",
    steps: overallSteps,
  },
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

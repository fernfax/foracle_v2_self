import type { DriveStep } from "driver.js";

export type TourName = "overall" | "dashboard" | "incomes" | "expenses";

export interface TourConfig {
  name: TourName;
  title: string;
  description: string;
  steps: DriveStep[];
}

// Overall Tour - app navigation overview
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

// Dashboard Tour
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
    element: '[data-tour="projection-tab"]',
    popover: {
      title: "Monthly Balance Projection",
      description:
        "View a 12-month projection of your cash balance. See how your income and expenses will affect your savings over time.",
      side: "bottom",
      align: "start",
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

// Incomes Tour — the redesigned "Projected Income River" timeline studio
const incomesSteps: DriveStep[] = [
  {
    element: '[data-tour="income-river-chart"]',
    popover: {
      title: "Projected Income River",
      description:
        "This is your income over time. The curve rises and falls as streams start, change, and end — so you can see your earning shape at a glance.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: '[data-tour="income-display-toggle"]',
    popover: {
      title: "Gross or Take-Home",
      description:
        "Switch between Gross (before CPF) and Nett (your actual take-home) to see whichever number matters to you right now.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[aria-label="Timeline range in years"]',
    popover: {
      title: "Zoom the Timeline",
      description:
        "Drag the Scale slider to widen the window from 2 up to 10 years — handy for planning raises, career breaks, or retirement.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-tour="income-member-lane"]',
    popover: {
      title: "Streams by Family Member",
      description:
        "Each person has their own lane, with their name and age at the month in view. Their income bars stack neatly beneath the river.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="income-month-axis"]',
    popover: {
      title: "The Now Line",
      description:
        "Everything left of the Now line is past, everything right is projected. Scroll sideways to travel through time — the centred chip shows everyone's age at that month.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: '[data-tour="add-income-stream-btn"]',
    popover: {
      title: "Add an Income Stream",
      description:
        "Add a new salary, side gig, rental, or bonus here. Assign it to a family member and set whether it's permanent or temporary.",
      side: "top",
      align: "center",
    },
  },
  {
    element: '[aria-label="Enter edit mode"]',
    popover: {
      title: "Edit Mode",
      description:
        "Tap Edit to reshape your income river directly — draw new bars on a lane, drag them to new months, or resize them to change start and end dates.",
      side: "left",
      align: "end",
    },
  },
];

// Expenses Tour
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

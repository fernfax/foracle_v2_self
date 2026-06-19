import type { DriveStep } from "driver.js"

export type TourName =
  | "overall"
  | "dashboard"
  | "incomes"
  | "expenses"
  | "cpf"
  | "holdings"
  | "goals"
  | "budget"

export interface TourConfig {
  name: TourName
  title: string
  description: string
  steps: DriveStep[]
}

// ---------------------------------------------------------------------------
// A note on how these tours stay correct across viewports and states:
//
// The tour engine (components/tour/tour-provider.tsx) filters every step down
// to those whose target is actually VISIBLE on the current screen before it
// runs. That means a single step list can safely contain BOTH the desktop and
// mobile variant of a region — only the one rendered for the current viewport
// survives. The same mechanism quietly drops steps whose data isn't present
// yet (e.g. an empty Goals page), so we can author the "full" tour and trust
// it to degrade gracefully. Keep that in mind when adding steps: prefer adding
// the real anchor for each layout over trying to branch here.
// ---------------------------------------------------------------------------

// App Overview — orientation to navigation. Works on the /overview page.
const overallSteps: DriveStep[] = [
  {
    // Desktop: the left navigation rail. Absent from the DOM on phones.
    element: '[data-tour="sidebar-nav"]',
    popover: {
      title: "Your navigation",
      description:
        "Move between sections from here — Overview, your profile and incomes, Expenses, Investments, Goals, and Budget. Hover to expand the labels.",
      side: "right",
      align: "start"
    }
  },
  {
    // Mobile: the bottom tab bar. display:none on desktop.
    element: '[data-tour="mobile-nav"]',
    popover: {
      title: "Your navigation",
      description:
        "Tap these tabs to move between sections. Swipe the bar sideways to reach every page.",
      side: "top",
      align: "center"
    }
  },
  {
    element: '[data-tour="overview-nav-bridge"]',
    popover: {
      title: "Quick jumps",
      description:
        "Shortcuts straight to the parts of your profile you visit most — Family, Incomes, Expenses, CPF, and Holdings.",
      side: "bottom",
      align: "start"
    }
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: "Tours anytime",
      description:
        "Lost? Tap this button on any page to replay these guided tours or jump to a specific section.",
      side: "top",
      align: "end"
    }
  }
]

// Dashboard — the /overview page. Defaults to the Cashflow view; the classic
// metrics layout (under ?view=classic) is covered by the trailing steps, which
// the visibility filter drops when the Sankey is showing.
const dashboardSteps: DriveStep[] = [
  {
    element: '[data-tour="overview-nav-bridge"]',
    popover: {
      title: "Start here",
      description:
        "Your Overview pulls everything together. These chips jump you to any part of your profile.",
      side: "bottom",
      align: "start"
    }
  },
  {
    element: '[data-tour="cashflow-diagram"]',
    popover: {
      title: "Where your money flows",
      description:
        "This Sankey traces every dollar: income on the left flows through CPF, your expense categories, and into savings. Tap a category to break it down.",
      side: "top",
      align: "center"
    }
  },
  {
    element: '[data-tour="cashflow-controls"]',
    popover: {
      title: "Switch the view",
      description:
        "Flip between the Sankey flow and a 12-month balance Projection, and step through months to see how each one looks.",
      side: "left",
      align: "start"
    }
  },
  {
    // Classic view only (?view=classic) — filtered out on the default Sankey.
    element: '[data-tour="secondary-metrics"]',
    popover: {
      title: "Assets, goals & family",
      description:
        "Your total assets, the goals you're working toward, and everyone in your household — at a glance.",
      side: "top",
      align: "center"
    }
  }
]

// Incomes — the "Projected Income River" timeline on /user/incomes.
const incomesSteps: DriveStep[] = [
  {
    element: '[data-tour="income-stat-band"]',
    popover: {
      title: "Income at a glance",
      description:
        "Your gross and take-home totals, how many streams are active, and your largest source — summarised up top.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: '[data-tour="income-river-chart"]',
    popover: {
      title: "Projected Income River",
      description:
        "This curve is your income over time. It rises and falls as streams start, change, and end — so you can read your earning shape at a glance.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: '[data-tour="income-display-toggle"]',
    popover: {
      title: "Gross or take-home",
      description:
        "Switch between Gross (before CPF) and Nett (your actual take-home), whichever number you're planning around.",
      side: "left",
      align: "start"
    }
  },
  {
    // Desktop-only control — the scale slider is hidden on phones.
    element: '[aria-label="Timeline range in years"]',
    popover: {
      title: "Zoom the timeline",
      description:
        "Drag the Scale slider to widen the window up to 10 years — handy for planning raises, breaks, or retirement.",
      side: "left",
      align: "start"
    }
  },
  {
    element: '[data-tour="income-member-lane"]',
    popover: {
      title: "Streams by family member",
      description:
        "Each person gets their own lane, labelled with their name and age at the month in view. Their income bars stack beneath the river.",
      side: "top",
      align: "center"
    }
  },
  {
    element: '[data-tour="income-month-axis"]',
    popover: {
      title: "The now line",
      description:
        "Everything left of now is history; everything right is projected. Scroll sideways to travel through time.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: '[data-tour="add-income-stream-btn"]',
    popover: {
      title: "Add an income stream",
      description:
        "Add a salary, side gig, rental, or bonus. Assign it to a family member and set whether it's permanent or temporary.",
      side: "top",
      align: "center"
    }
  },
  {
    // "Enter edit mode" label is only present when not already editing.
    element: '[aria-label="Enter edit mode"]',
    popover: {
      title: "Edit mode",
      description:
        "Tap Edit to reshape the river directly — draw new bars on a lane, drag them to other months, or resize them to change start and end dates.",
      side: "left",
      align: "end"
    }
  }
]

// Expenses — /user/expenses (the standalone /expenses route redirects here).
const expensesSteps: DriveStep[] = [
  {
    element: '[data-tour="expected-expenses-card"]',
    popover: {
      title: "Expected expenses",
      description:
        "Your total expected spending for the selected month, with your top category and daily average alongside it.",
      side: "bottom",
      align: "start"
    }
  },
  {
    element: '[data-tour="expense-filters"]',
    popover: {
      title: "Filter your list",
      description:
        "Narrow the table by category or frequency to focus on the spending you care about.",
      side: "bottom",
      align: "start"
    }
  },
  {
    element: '[data-tour="manage-categories-btn"]',
    popover: {
      title: "Manage categories",
      description:
        "Create and rename categories so your budget matches how you actually spend.",
      side: "bottom",
      align: "end"
    }
  },
  {
    element: '[data-tour="add-expense-btn"]',
    popover: {
      title: "Add an expense",
      description:
        "Add recurring bills, one-off purchases, or custom payment schedules — they flow into your projections automatically.",
      side: "bottom",
      align: "end"
    }
  },
  {
    element: '[data-tour="expense-table"]',
    popover: {
      title: "Your expenses",
      description:
        "Every expense you track. Edit, delete, or open details from the menu on each row.",
      side: "top",
      align: "center"
    }
  }
]

// CPF — /user/cpf
const cpfSteps: DriveStep[] = [
  {
    element: '[data-tour="cpf-stat-band"]',
    popover: {
      title: "Your CPF at a glance",
      description:
        "Total household CPF balance, monthly contributions, and the Full Retirement Sum you're tracking toward.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: '[data-tour="cpf-member-cards"]',
    popover: {
      title: "Per-member breakdown",
      description:
        "Each member's OA, SA, and MA balances, and how far they are toward the Full Retirement Sum.",
      side: "top",
      align: "center"
    }
  },
  {
    element: '[data-tour="cpf-projection-controls"]',
    popover: {
      title: "Shape the projection",
      description:
        "Switch between cumulative balance and monthly contributions, change the breakdown, and pick a time range.",
      side: "bottom",
      align: "end"
    }
  },
  {
    element: '[data-tour="cpf-projection-chart"]',
    popover: {
      title: "Balance projection",
      description:
        "How your CPF grows over time, with contribution rates adjusting automatically as members age through CPF brackets.",
      side: "top",
      align: "center"
    }
  }
]

// Holdings / Net Worth — /user/holdings
const holdingsSteps: DriveStep[] = [
  {
    element: '[data-tour="net-worth-hero"]',
    popover: {
      title: "Your net worth",
      description:
        "Everything you own minus what you owe, with the split between assets and liabilities just below.",
      side: "bottom",
      align: "start"
    }
  },
  {
    element: '[data-tour="asset-class-chips"]',
    popover: {
      title: "By asset class",
      description:
        "Cash, property, vehicles, investments, insurance, and CPF — each summarised so you can see what makes up your wealth.",
      side: "top",
      align: "center"
    }
  },
  {
    element: '[data-tour="add-holding-btn"]',
    popover: {
      title: "Add a holding",
      description:
        "Record a bank balance or other asset here. Property, vehicles, and investments flow in from their own pages.",
      side: "left",
      align: "end"
    }
  }
]

// Goals — /goals
const goalsSteps: DriveStep[] = [
  {
    element: '[data-tour="goals-toolbar"]',
    popover: {
      title: "Your goals",
      description:
        "See how many goals you're working toward, and add a new one — a home deposit, a trip, an emergency fund.",
      side: "bottom",
      align: "start"
    }
  },
  {
    element: '[data-tour="goals-list"]',
    popover: {
      title: "Track your progress",
      description:
        "Each card shows how close you are to a goal. Tap one to update what you've saved or adjust the target.",
      side: "top",
      align: "center"
    }
  }
]

// Budget — /budget. Mobile and desktop render different layouts; both sets of
// anchors live here and the visibility filter shows whichever is on screen.
const budgetSteps: DriveStep[] = [
  // --- Mobile layout ---
  {
    element: '[data-tour="budget-overview"]',
    popover: {
      title: "This month's spending",
      description:
        "How much you've spent against your budget, what's left, and whether you're pacing ahead or behind for the month.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: '[data-tour="budget-categories"]',
    popover: {
      title: "Spending by category",
      description:
        "A quick read on each category's budget and how much of it you've used. Tap one to see its expenses.",
      side: "top",
      align: "center"
    }
  },
  {
    element: '[data-tour="budget-manage-categories-btn"]',
    popover: {
      title: "Set your limits",
      description:
        "Add categories and set monthly limits so your budget reflects how you really spend.",
      side: "top",
      align: "center"
    }
  },
  // --- Desktop layout ---
  {
    element: '[data-tour="budget-stat-band"]',
    popover: {
      title: "This month at a glance",
      description:
        "Spent, remaining, daily pacing, and today's spend — the four numbers that tell you if you're on track.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: '[data-tour="budget-breakdown"]',
    popover: {
      title: "Budget vs actual",
      description:
        "Every category's limit against what you've actually spent, plus your daily spending trend for the month.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-tour="budget-recent"]',
    popover: {
      title: "Recent activity",
      description:
        "Your latest expenses and any budget adjustments you've made this month.",
      side: "left",
      align: "start"
    }
  }
]

export const TOUR_CONFIGS: Record<TourName, TourConfig> = {
  overall: {
    name: "overall",
    title: "App Overview",
    description: "Get familiar with Foracle's navigation and key features",
    steps: overallSteps
  },
  dashboard: {
    name: "dashboard",
    title: "Dashboard Tour",
    description: "Read your money at a glance on the Overview page",
    steps: dashboardSteps
  },
  incomes: {
    name: "incomes",
    title: "Incomes Tour",
    description: "Map your income streams on the Projected Income River",
    steps: incomesSteps
  },
  expenses: {
    name: "expenses",
    title: "Expenses Tour",
    description: "Track and categorise your spending",
    steps: expensesSteps
  },
  cpf: {
    name: "cpf",
    title: "CPF Tour",
    description: "Understand your CPF balances and projection",
    steps: cpfSteps
  },
  holdings: {
    name: "holdings",
    title: "Net Worth Tour",
    description: "See everything you own and owe in one place",
    steps: holdingsSteps
  },
  goals: {
    name: "goals",
    title: "Goals Tour",
    description: "Set financial goals and track your progress",
    steps: goalsSteps
  },
  budget: {
    name: "budget",
    title: "Budget Tour",
    description: "Stay on top of your monthly spending",
    steps: budgetSteps
  }
}

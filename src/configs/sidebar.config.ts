import {
  Briefcase,
  Building2,
  Calculator,
  Car,
  DollarSign,
  Home,
  LineChart,
  Package,
  Receipt,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
  type LucideIcon
} from "lucide-react"

/**
 * Single source of truth for primary navigation.
 *
 * Consumed by the desktop sidebar (`components/sidebar/*`, which renders the full
 * label + submenus) and the mobile bottom bar (`components/mobile-nav.tsx`, which
 * renders top-level items only, using `shortLabel`). Add or reorder destinations
 * here — never in the consumers.
 */
export interface NavSubItem {
  href: string
  label: string
  icon: LucideIcon
}

export interface NavItem {
  href: string
  /** Full label for the desktop sidebar. */
  label: string
  /** Shorter label for the mobile bottom bar; falls back to `label`. */
  shortLabel?: string
  icon: LucideIcon
  /** Sub-destinations; render as a submenu on desktop, omitted on mobile. */
  subItems?: NavSubItem[]
  /** Renders a muted "Soon" badge and (by convention) a non-navigating item. */
  comingSoon?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/user",
    label: "User Homepage",
    shortLabel: "User",
    icon: User,
    subItems: [
      { href: "/user/overview", label: "Overview", icon: Home },
      { href: "/user/family", label: "Family", icon: Users },
      { href: "/user/incomes", label: "Incomes", icon: DollarSign },
      { href: "/user/expenses", label: "Expenses", icon: Receipt },
      { href: "/user/cpf", label: "CPF", icon: Building2 },
      { href: "/user/holdings", label: "Holdings", icon: Briefcase }
    ]
  },
  {
    href: "/assets",
    label: "Assets",
    icon: TrendingUp,
    subItems: [
      { href: "/assets/property", label: "Property", icon: Home },
      { href: "/assets/vehicle", label: "Vehicle", icon: Car },
      { href: "/assets/others", label: "Others", icon: Package }
    ]
  },
  { href: "/policies", label: "Insurance", icon: Shield },
  {
    href: "/investments",
    label: "Investments",
    shortLabel: "Invest",
    icon: LineChart
  },
  {
    href: "/goals",
    label: "Goals",
    icon: Target,
    subItems: [
      { href: "/goals/active", label: "Active Goals", icon: Target },
      { href: "/goals/achieved", label: "Achieved", icon: Trophy }
    ]
  },
  { href: "/budget", label: "Budget", icon: Calculator }
  // Hidden for now — AI Assistant feature paused.
  // { href: "/assistant", label: "AI Assistant", shortLabel: "Assistant", icon: Sparkles },
]

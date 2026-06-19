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
      { href: "/user?tab=overview", label: "Overview", icon: Home },
      { href: "/user?tab=family", label: "Family", icon: Users },
      { href: "/user?tab=incomes", label: "Incomes", icon: DollarSign },
      { href: "/user?tab=expenses", label: "Expenses", icon: Receipt },
      { href: "/user?tab=cpf", label: "CPF", icon: Building2 },
      { href: "/user?tab=current", label: "Holdings", icon: Briefcase }
    ]
  },
  {
    href: "/assets",
    label: "Assets",
    icon: TrendingUp,
    subItems: [
      { href: "/assets?tab=property", label: "Property", icon: Home },
      { href: "/assets?tab=vehicle", label: "Vehicle", icon: Car },
      { href: "/assets?tab=others", label: "Others", icon: Package }
    ]
  },
  { href: "/policies", label: "Insurance", icon: Shield },
  {
    href: "/investments",
    label: "Investments",
    shortLabel: "Invest",
    icon: LineChart
  },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/budget", label: "Budget", icon: Calculator }
  // Hidden for now — AI Assistant feature paused.
  // { href: "/assistant", label: "AI Assistant", shortLabel: "Assistant", icon: Sparkles },
]

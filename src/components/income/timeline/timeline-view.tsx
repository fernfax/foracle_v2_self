"use client"

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { createIncome, deleteIncome, updateIncome } from "@/actions/incomes"
import {
  addMonths,
  differenceInCalendarMonths,
  format,
  parseISO,
  startOfMonth
} from "date-fns"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gift,
  Infinity as InfinityIcon,
  LocateFixed,
  Pencil,
  Plus,
  Settings2,
  Target,
  Trash2,
  TrendingUp
} from "lucide-react"
import { createPortal } from "react-dom"

import { CHART_PALETTE } from "@/lib/charts/chart-palette"
import { cn } from "@/lib/cn"
import { computeAnnualBonusCpf } from "@/lib/cpf/cpf-calculator"
import { bonusForMonth, grossForMonth } from "@/lib/finance/income-month"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Fab } from "@/components/ui/fab-stack"
import { MonthYearPicker } from "@/components/ui/month-year-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import {
  activeMilestoneAt,
  priorEffectiveAmount,
  resolveEffectiveAmount,
  TimelineFutureChangeDialog,
  type FutureMilestone
} from "@/components/income/timeline/timeline-future-change-dialog"
import { TimelineIncomeDetailDrawer } from "@/components/income/timeline/timeline-income-detail-drawer"
import { IncomeBarPopup } from "@/components/income/timeline/timeline-quick-adjust-pad"
import { useOptimisticIncomes } from "@/components/income/timeline/timeline-use-optimistic-incomes"

type Income = {
  id: string
  userId: string
  name: string
  category: string
  incomeCategory: string | null
  amount: string
  frequency: string
  customMonths: string | null
  subjectToCpf: boolean | null
  accountForBonus: boolean | null
  bonusGroups: string | null
  employeeCpfContribution: string | null
  employerCpfContribution: string | null
  netTakeHome: string | null
  cpfOrdinaryAccount: string | null
  cpfSpecialAccount: string | null
  cpfMedisaveAccount: string | null
  description: string | null
  startDate: string
  endDate: string | null
  pastIncomeHistory: string | null
  futureMilestones: string | null
  accountForFutureChange: boolean | null
  isActive: boolean | null
  familyMemberId: string | null
  familyMember: {
    id: string
    name: string
    relationship: string | null
    dateOfBirth: string | null
    isContributing: boolean | null
  } | null
  createdAt: Date
  updatedAt: Date
}

type FamilyMember = {
  id: string
  name: string
  relationship: string | null
  dateOfBirth: string | null
  isContributing: boolean | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

type Archetype = "recurring" | "one-off" | "temporary" | "future"

interface FutureMilestoneRaw {
  id: string
  targetMonth: string
  amount: number
  endMonth?: string | null
  reason?: string
  notes?: string
}

const TIMELINE_MONTHS = 24
const TIMELINE_START_OFFSET = -6

const MOBILE_TIMELINE_MONTHS = 8
const MOBILE_TIMELINE_START_OFFSET = -2
const MOBILE_HEADER_PX = 100
const DESKTOP_HEADER_PX = 180
const MOBILE_BREAKPOINT_PX = 640

interface TimelineConfig {
  monthCount: number
  startOffset: number
  headerPx: number
  isMobile: boolean
}

function useTimelineConfig(): TimelineConfig {
  const [config, setConfig] = useState<TimelineConfig>({
    monthCount: TIMELINE_MONTHS,
    startOffset: TIMELINE_START_OFFSET,
    headerPx: DESKTOP_HEADER_PX,
    isMobile: false
  })

  useEffect(() => {
    const apply = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT_PX
      setConfig({
        monthCount: isMobile ? MOBILE_TIMELINE_MONTHS : TIMELINE_MONTHS,
        startOffset: isMobile
          ? MOBILE_TIMELINE_START_OFFSET
          : TIMELINE_START_OFFSET,
        headerPx: isMobile ? MOBILE_HEADER_PX : DESKTOP_HEADER_PX,
        isMobile
      })
    }
    apply()
    window.addEventListener("resize", apply)
    return () => window.removeEventListener("resize", apply)
  }, [])

  return config
}

// Soft fade at the left/right edges of each timeline viewport so bars and
// the river chart slide in/out of view smoothly instead of hard-clipping
// against the container edge.
const TIMELINE_EDGE_FADE =
  "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)"
const EDGE_FADE_STYLE: React.CSSProperties = {
  maskImage: TIMELINE_EDGE_FADE,
  WebkitMaskImage: TIMELINE_EDGE_FADE
}

const ARCHETYPE_META: Record<
  Archetype,
  {
    label: string
    icon: typeof InfinityIcon
    tone: string
    bar: string
    pill: string
    rail: string
  }
> = {
  recurring: {
    label: "RECURRING",
    icon: InfinityIcon,
    tone: "text-positive",
    bar: "bg-gradient-to-r from-brand-jungle to-brand-sage",
    pill: "bg-brand-jungle/10 text-[#1F4A33] border-brand-jungle/30",
    rail: "bg-brand-jungle"
  },
  "one-off": {
    label: "ONE-OFF",
    icon: Target,
    tone: "text-brand-terracotta",
    bar: "bg-gradient-to-r from-brand-terracotta to-brand-coral",
    pill: "bg-brand-terracotta/10 text-on-brand border-brand-terracotta/30",
    rail: "bg-brand-terracotta"
  },
  temporary: {
    label: "TEMPORARY",
    icon: Clock,
    tone: "text-on-warning",
    bar: "bg-gradient-to-r from-brand-gold to-[#E0BD5C]",
    pill: "bg-brand-gold/15 text-on-warning border-brand-gold/40",
    rail: "bg-brand-gold"
  },
  // Future incomes — start date hasn't arrived yet. Brand-deep-forest into
  // brand-jungle so it reads as "projected, not yet in flight" while staying
  // distinct from current (recurring).
  future: {
    label: "FUTURE",
    icon: InfinityIcon,
    tone: "text-brand-deep-forest",
    bar: "bg-gradient-to-r from-brand-deep-forest to-brand-jungle",
    pill: "bg-brand-deep-forest/10 text-brand-deep-forest border-brand-deep-forest/30",
    rail: "bg-brand-deep-forest"
  }
}

// Bar fill for a segment changed by a future adjustment. An increment (income
// raised above base) reads brighter green; a decrement (lowered below base)
// reads amber/gold — signed but not alarming (no red for a planned change).
// "base" segments keep the income's archetype color (returned as null here).
const DIRECTION_BAR: Record<"up" | "down", string> = {
  up: "bg-gradient-to-r from-[#2E8B57] to-[#4FB477]",
  down: "bg-gradient-to-r from-[#C68A1E] to-[#E0BD5C]"
}

function segmentBarClass(
  direction: SegmentDirection,
  archetypeBar: string
): string {
  if (direction === "up") return DIRECTION_BAR.up
  if (direction === "down") return DIRECTION_BAR.down
  return archetypeBar
}

function getArchetype(income: Income): Archetype {
  if (income.incomeCategory === "one-off" || income.frequency === "one-time") {
    return "one-off"
  }
  // Future takes precedence over the end-date check so a future-recurring or
  // future-with-end income reads as "future" (deep forest), not as
  // recurring/temporary.
  if (income.incomeCategory === "future") return "future"
  if (income.endDate) return "temporary"
  return "recurring"
}

function safeParseMilestones(json: string | null): FutureMilestoneRaw[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((m) => m && typeof m.targetMonth === "string")
      .map((m) => ({
        id: String(m.id ?? m.targetMonth),
        targetMonth: m.targetMonth,
        amount: Number(m.amount) || 0,
        endMonth:
          typeof m.endMonth === "string" && m.endMonth ? m.endMonth : null,
        reason: m.reason,
        notes: m.notes
      }))
      .sort((a, b) => a.targetMonth.localeCompare(b.targetMonth))
  } catch {
    return []
  }
}

function formatCurrency(value: number) {
  if (value === 0) return "$0"
  return `$${Math.round(value).toLocaleString()}`
}

interface MonthCell {
  date: Date
  key: string
  label: string
  yearLabel: string
}

function buildMonthCells(
  windowOffsetMonths: number = 0,
  monthCount: number = TIMELINE_MONTHS,
  startOffset: number = TIMELINE_START_OFFSET
): MonthCell[] {
  const base = startOfMonth(new Date())
  return Array.from({ length: monthCount }, (_, i) => {
    const date = addMonths(base, startOffset + windowOffsetMonths + i)
    return {
      date,
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM"),
      yearLabel: format(date, "yy")
    }
  })
}

// Gross income for a month. Delegates to the shared lib/income-month so the
// timeline bars and the dashboard Sankey compute identical numbers.
function getAmountForMonth(income: Income, cell: MonthCell): number {
  return grossForMonth(income, cell.key)
}

// Whole-year age from a DOB string (null when unknown).
function ageFromDobIso(dob: string | null | undefined): number | null {
  if (!dob) return null
  const d = parseISO(dob)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age >= 0 && age < 130 ? age : null
}

// Age a person of birthdate `dob` would be on the calendar date `at`. Unlike
// ageFromDobIso (which is always "today"), this is evaluated at an arbitrary
// point on the timeline — it backs the scroll-driven age indicators: each
// member's name-box age (#16) and the centred age chip (#17), both read off
// the month sitting at the centre of the viewport.
function ageAtDate(
  dob: string | null | undefined,
  at: Date | null
): number | null {
  if (!dob || !at) return null
  const d = parseISO(dob)
  if (Number.isNaN(d.getTime())) return null
  let age = at.getFullYear() - d.getFullYear()
  const m = at.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && at.getDate() < d.getDate())) age -= 1
  return age >= 0 && age < 130 ? age : null
}

// Ratio of take-home (net) to gross for an income — derived from the stored
// monthly net over the base monthly amount. 1 when CPF doesn't apply or the
// data is missing. Used by the Gross/Nett bar toggle: net = gross × factor.
function netFactor(income: Income): number {
  if (!income.subjectToCpf) return 1
  const base = Number(income.amount) || 0
  const net = Number(income.netTakeHome)
  if (!Number.isFinite(net) || base <= 0) return 1
  return Math.max(0, Math.min(1, net / base))
}

// Direction of a bar segment relative to the income's base amount. Drives the
// increment/decrement coloring: a future change that raises the income reads
// "up" (green), one that lowers it reads "down" (amber). "base" = unchanged.
type SegmentDirection = "base" | "up" | "down"

interface BarSegment {
  startIndex: number
  spanCount: number
  amount: number
  direction: SegmentDirection
  // The future change driving this segment, or null when it's the income's
  // base (no change in effect). Lets the popup show the segment's own period
  // and label it CURRENT vs FUTURE CHANGE, and edit the right value.
  milestoneId: string | null
  // The segment's own month range ("YYYY-MM"), independent of the income's
  // overall start/end. startKey is the first month, endKey the last.
  startKey: string
  endKey: string
}

// Direction at a month, computed from the milestone-resolved monthly base vs
// the income's stored base — BEFORE any frequency multiplier. Because the same
// frequency factor scales both, this comparison is frequency-independent, so it
// stays correct for yearly/weekly/custom incomes too.
function directionForMonth(
  income: Income,
  baseAmount: number,
  milestones: FutureMilestoneRaw[],
  monthKey: string
): SegmentDirection {
  const effective = resolveEffectiveAmount(baseAmount, milestones, monthKey)
  if (effective > baseAmount + 0.5) return "up"
  if (effective < baseAmount - 0.5) return "down"
  return "base"
}

// The effective amount a change starts from — what the dialog shows as the
// "current" amount and what a temporary change reverts to. For an EXISTING
// milestone being edited, it's the effective amount ignoring that milestone in
// the month before its start. For a NEW change at `defaultStartMonth`, it's the
// current effective amount at that month.
function priorAmountForChange(
  income: Income,
  milestone: FutureMilestone | undefined,
  defaultStartMonth: string | undefined
): number {
  const base = Number(income.amount) || 0
  const milestones = safeParseMilestones(income.futureMilestones)
  if (milestone) return priorEffectiveAmount(base, milestones, milestone)
  const monthKey =
    defaultStartMonth ?? format(startOfMonth(new Date()), "yyyy-MM")
  return resolveEffectiveAmount(base, milestones, monthKey)
}

// Human label for a segment's own month range, e.g. "Mar 2026 → May 2026" or
// "Jun 2026 → ongoing" (a permanent change / base with no income end date that
// runs to the end of the window).
function segmentPeriodLabel(seg: BarSegment, income: Income): string {
  const start = format(parseISO(`${seg.startKey}-01`), "MMM yyyy")
  // The segment is "ongoing" when it's driven by the base or a permanent change
  // (no milestone end) AND the income itself has no end date. A temporary
  // change always shows its concrete end month.
  const milestones = safeParseMilestones(income.futureMilestones)
  const m = seg.milestoneId
    ? milestones.find((x) => x.id === seg.milestoneId)
    : null
  const isTemporary = !!m?.endMonth
  const runsOpen = !isTemporary && !income.endDate
  if (runsOpen) return `${start} → ongoing`
  const end = format(parseISO(`${seg.endKey}-01`), "MMM yyyy")
  return seg.startKey === seg.endKey ? start : `${start} → ${end}`
}

function buildBarSegments(income: Income, cells: MonthCell[]): BarSegment[] {
  const segments: BarSegment[] = []
  const baseAmount = Number(income.amount) || 0
  const milestones = income.accountForFutureChange
    ? safeParseMilestones(income.futureMilestones)
    : []

  let current: BarSegment | null = null
  cells.forEach((cell, i) => {
    const amount = getAmountForMonth(income, cell)
    if (amount > 0) {
      const direction = directionForMonth(
        income,
        baseAmount,
        milestones,
        cell.key
      )
      const milestoneId = activeMilestoneAt(milestones, cell.key)?.id ?? null
      if (
        current &&
        current.amount === amount &&
        current.direction === direction &&
        current.milestoneId === milestoneId &&
        current.startIndex + current.spanCount === i
      ) {
        current.spanCount += 1
        current.endKey = cell.key
      } else {
        if (current) segments.push(current)
        current = {
          startIndex: i,
          spanCount: 1,
          amount,
          direction,
          milestoneId,
          startKey: cell.key,
          endKey: cell.key
        }
      }
    } else {
      if (current) {
        segments.push(current)
        current = null
      }
    }
  })
  if (current) segments.push(current)
  return segments
}

// ─── Bonus ────────────────────────────────────────────────────────────────
// Gross bonus payable in a given month (0 when none). Delegates to the shared
// lib/income-month so the timeline bonus bars and the dashboard Sankey bonus
// node compute identical numbers.
function getBonusForMonth(income: Income, cell: MonthCell): number {
  return bonusForMonth(income, cell.key)
}

interface BonusBar {
  index: number
  amount: number
}

function buildBonusBars(income: Income, cells: MonthCell[]): BonusBar[] {
  const out: BonusBar[] = []
  cells.forEach((cell, i) => {
    const amount = getBonusForMonth(income, cell)
    if (amount > 0) out.push({ index: i, amount })
  })
  return out
}

interface YearSegment {
  year: string
  startIndex: number
  spanCount: number
}

// Synthetic income rows used purely as decoration behind the empty state. The
// goal is to give first-time users a glimpse of the timeline studio so they
// understand what creating their first income unlocks. Never persisted; never
// exposed via interactive surfaces (the backdrop is always pointer-events:none).
function buildPlaceholderIncomes(): Income[] {
  const today = new Date()
  const monthIso = (offset: number) =>
    format(addMonths(startOfMonth(today), offset), "yyyy-MM-dd")
  const make = (
    id: string,
    name: string,
    category: string,
    amount: number,
    startOffset: number,
    endOffset: number | null
  ): Income => ({
    id,
    userId: "_placeholder",
    name,
    category,
    incomeCategory: "current",
    amount: amount.toString(),
    frequency: "monthly",
    customMonths: null,
    subjectToCpf: false,
    accountForBonus: false,
    bonusGroups: null,
    employeeCpfContribution: null,
    employerCpfContribution: null,
    netTakeHome: null,
    cpfOrdinaryAccount: null,
    cpfSpecialAccount: null,
    cpfMedisaveAccount: null,
    description: null,
    startDate: monthIso(startOffset),
    endDate: endOffset !== null ? monthIso(endOffset) : null,
    pastIncomeHistory: null,
    futureMilestones: null,
    accountForFutureChange: false,
    isActive: true,
    familyMemberId: null,
    familyMember: null,
    createdAt: today,
    updatedAt: today
  })
  return [
    make("_p1", "Primary salary", "salary", 5000, -3, null),
    make("_p2", "Rental income", "investment", 2200, -5, null),
    make("_p3", "Side gig", "freelance", 1500, -1, 6),
    make("_p4", "Year-end bonus", "salary", 8000, 5, 5)
  ]
}

// Synthetic income placeholder used to render an empty family-member row in
// edit mode so the user can draw their first income on the lane. The ghost
// has amount=0 (so buildBarSegments returns an empty array — nothing renders
// visually) but carries the familyMemberId so handleDrawSave wires the
// freshly-drawn income to the correct member.
// Classify a drawn/edited range against the source row as past / current /
// future, or "unknown" when it straddles today on a row with no current income
// (the popup then asks the user). Shared by the initial pointer-up detection
// and by live month-picker edits in the commit popup so the category, the
// "Will save as X" label, and the saved record never drift apart.
// Keys are "yyyy-MM".
function detectDrawCategory(
  income: Income,
  startKey: string,
  endKey: string
): "past" | "current" | "future" | "unknown" {
  const todayKey = format(startOfMonth(new Date()), "yyyy-MM")
  const sourceArchetype = getArchetype(income)
  const sourceIsCurrent =
    sourceArchetype === "recurring" ||
    (income.endDate
      ? format(startOfMonth(parseISO(income.endDate)), "yyyy-MM") >= todayKey
      : false)
  if (sourceIsCurrent) {
    const sourceStartKey = format(
      startOfMonth(parseISO(income.startDate)),
      "yyyy-MM"
    )
    if (endKey < sourceStartKey) return "past"
    if (startKey > todayKey) return "future"
    return "current"
  }
  if (startKey > todayKey) return "future"
  if (endKey < todayKey) return "past"
  return "unknown"
}

function buildGhostIncome(
  familyMember: FamilyMember | null,
  todayIso: string
): Income {
  return {
    id: `__ghost_${familyMember?.id ?? "unassigned"}`,
    userId: "_ghost",
    name: "",
    category: "salary",
    incomeCategory: "past",
    amount: "0",
    frequency: "monthly",
    customMonths: null,
    subjectToCpf: false,
    accountForBonus: false,
    bonusGroups: null,
    employeeCpfContribution: null,
    employerCpfContribution: null,
    netTakeHome: null,
    cpfOrdinaryAccount: null,
    cpfSpecialAccount: null,
    cpfMedisaveAccount: null,
    description: null,
    startDate: todayIso,
    endDate: todayIso,
    pastIncomeHistory: null,
    futureMilestones: null,
    accountForFutureChange: false,
    isActive: true,
    familyMemberId: familyMember?.id ?? null,
    familyMember: familyMember
      ? {
          id: familyMember.id,
          name: familyMember.name,
          relationship: familyMember.relationship,
          dateOfBirth: familyMember.dateOfBirth ?? null,
          isContributing: familyMember.isContributing ?? null
        }
      : null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

// Pack a family member's incomes into rows ("tracks"). Two ideas in play:
//
//   1. Main track. The current/recurring income anchors track 0. Any other
//      income that doesn't overlap it joins the same row (so e.g. a Past
//      Salary that ended before the Current Salary started lands on the
//      main track instead of starting a parallel row). This matches the
//      product spec: "the main track is where the current income bar
//      exists; any other bar that doesn't overlap shares that row."
//
//   2. First-fit packing for the rest. Anything that overlaps an existing
//      track tries the next track; if none fits, a new track opens. The
//      check is full-interval overlap (not just the last item's end) so
//      that incomes preceding the recurring anchor on the main track are
//      handled correctly.
//
// If there's no recurring income, we fall back to chronological first-fit
// across the whole set — equivalent to the prior implementation.
function packIntoTracks(incomes: Income[]): Income[][] {
  if (incomes.length === 0) return []
  const recurring = incomes.find((i) => getArchetype(i) === "recurring")
  const tracks: Income[][] = []
  if (recurring) tracks.push([recurring])
  const remaining = incomes
    .filter((i) => i !== recurring)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
  const overlaps = (a: Income, b: Income) => {
    const aStart = a.startDate
    const aEnd = a.endDate ?? "9999-99-99"
    const bStart = b.startDate
    const bEnd = b.endDate ?? "9999-99-99"
    return aStart <= bEnd && bStart <= aEnd
  }
  for (const inc of remaining) {
    let placed = false
    for (const track of tracks) {
      if (track.every((t) => !overlaps(t, inc))) {
        track.push(inc)
        placed = true
        break
      }
    }
    if (!placed) tracks.push([inc])
  }
  // Stable visual ordering: sort each track left-to-right by start date so
  // bars render predictably regardless of which one anchored the track.
  return tracks.map((track) =>
    [...track].sort((a, b) => a.startDate.localeCompare(b.startDate))
  )
}

// Group consecutive cells by calendar year so the timeline header can render
// one year label per contiguous year span. With a 24-month window this is
// usually 2-3 segments.
function buildYearSegments(cells: MonthCell[]): YearSegment[] {
  const segments: YearSegment[] = []
  let current: YearSegment | null = null
  cells.forEach((cell, i) => {
    const year = format(cell.date, "yyyy")
    if (current && current.year === year) {
      current.spanCount += 1
    } else {
      if (current) segments.push(current)
      current = { year, startIndex: i, spanCount: 1 }
    }
  })
  if (current) segments.push(current)
  return segments
}

interface TimelineViewProps {
  incomes: Income[]
  familyMembers: FamilyMember[]
}

// Two-step dialog for the timeline "Add Income Stream" CTA: first assign the
// income to a family member (or leave it Unassigned), then fill in the
// new-income form (with the same Permanent/Temporary choice as a drawn bar).
function AddIncomeStreamDialog({
  open,
  familyMembers,
  onClose,
  onCreate
}: {
  open: boolean
  familyMembers: { id: string; name: string; relationship?: string | null }[]
  onClose: () => void
  onCreate: (data: {
    familyMemberId: string | null
    name: string
    amount: number
    startMonth: string // yyyy-MM
    endMonth: string | null // yyyy-MM, null when permanent
    isPermanent: boolean
  }) => Promise<void>
}) {
  const nowMonth = format(startOfMonth(new Date()), "yyyy-MM")
  const [step, setStep] = useState<"pickUser" | "form">("pickUser")
  const [member, setMember] = useState<{ id: string | null; name: string }>({
    id: null,
    name: "Unassigned"
  })
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [startMonth, setStartMonth] = useState(nowMonth)
  const [endMonth, setEndMonth] = useState(nowMonth)
  const [isPermanent, setIsPermanent] = useState(true)
  const [saving, setSaving] = useState(false)
  const [startCalOpen, setStartCalOpen] = useState(false)
  const [endCalOpen, setEndCalOpen] = useState(false)

  // Reset to the picker each time the dialog opens.
  useEffect(() => {
    if (open) {
      setStep("pickUser")
      setMember({ id: null, name: "Unassigned" })
      setName("")
      setAmount("")
      setStartMonth(nowMonth)
      setEndMonth(nowMonth)
      setIsPermanent(true)
      setSaving(false)
    }
  }, [open, nowMonth])

  const pickMember = (m: { id: string | null; name: string }) => {
    setMember(m)
    setName(m.id ? `${m.name}'s income` : "")
    setStep("form")
  }

  const startDate = parseISO(`${startMonth}-01`)
  const endDate = parseISO(`${endMonth}-01`)
  const canSave =
    !!name.trim() &&
    parseFloat(amount) > 0 &&
    (isPermanent || endMonth >= startMonth)

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      await onCreate({
        familyMemberId: member.id,
        name: name.trim(),
        amount: parseFloat(amount),
        startMonth,
        endMonth: isPermanent ? null : endMonth,
        isPermanent
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}>
      <DialogContent className="sm:max-w-sm">
        {step === "pickUser" ? (
          <>
            <DialogHeader>
              <DialogTitle>Assign income to</DialogTitle>
              <DialogDescription>
                Who earns this income? You can leave it unassigned.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-1 space-y-1.5">
              {familyMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickMember({ id: m.id, name: m.name })}
                  className="border-border/40 bg-card text-foreground hover:border-brand-terracotta/50 hover:bg-brand-terracotta/5 flex w-full items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors">
                  <span>{m.name}</span>
                  {m.relationship && (
                    <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      {m.relationship}
                    </span>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => pickMember({ id: null, name: "Unassigned" })}
                className="border-border/50 text-muted-foreground hover:border-brand-terracotta/50 hover:text-foreground flex w-full items-center rounded-lg border border-dashed px-4 py-3 text-left text-sm font-medium transition-colors">
                Unassigned
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New income</DialogTitle>
              <DialogDescription>
                For{" "}
                <span className="text-foreground font-medium">
                  {member.name}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="mt-1 flex items-center gap-1.5">
              <Popover open={startCalOpen} onOpenChange={setStartCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-display h-8 justify-start gap-1.5 px-2 text-xs"
                    aria-label="Start month">
                    <CalendarDays className="text-muted-foreground h-3.5 w-3.5" />
                    {format(startDate, "MMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <MonthYearPicker
                    value={startDate}
                    onChange={(d) => {
                      const m = format(d, "yyyy-MM")
                      setStartMonth(m)
                      if (m > endMonth) setEndMonth(m)
                      setStartCalOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground" aria-hidden>
                →
              </span>
              {isPermanent ? (
                <span className="border-border/40 bg-muted/40 font-display text-muted-foreground inline-flex h-8 items-center rounded-md border px-2 text-xs">
                  Ongoing
                </span>
              ) : (
                <Popover open={endCalOpen} onOpenChange={setEndCalOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-display h-8 justify-start gap-1.5 px-2 text-xs"
                      aria-label="End month">
                      <CalendarDays className="text-muted-foreground h-3.5 w-3.5" />
                      {format(endDate, "MMM yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <MonthYearPicker
                      value={endDate}
                      onChange={(d) => {
                        const m = format(d, "yyyy-MM")
                        setEndMonth(m < startMonth ? startMonth : m)
                        setEndCalOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div
              role="group"
              aria-label="Income duration"
              className="bg-muted/50 mt-2 grid grid-cols-2 gap-1 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setIsPermanent(true)}
                aria-pressed={isPermanent}
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-semibold transition-colors",
                  isPermanent
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}>
                Permanent
              </button>
              <button
                type="button"
                onClick={() => setIsPermanent(false)}
                aria-pressed={!isPermanent}
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-semibold transition-colors",
                  !isPermanent
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}>
                Temporary
              </button>
            </div>

            <label className="text-foreground mt-3 block text-xs font-semibold">
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Income name"
                className="border-border/40 bg-background text-foreground focus:ring-brand-terracotta/40 mt-1 w-full rounded-md border px-2 py-1.5 text-sm font-normal focus:ring-2 focus:outline-none"
              />
            </label>
            <label className="text-foreground mt-3 block text-xs font-semibold">
              Amount (monthly)
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="border-border/40 bg-background text-foreground focus:ring-brand-terracotta/40 mt-1 w-full rounded-md border px-2 py-1.5 text-sm font-normal focus:ring-2 focus:outline-none"
              />
            </label>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep("pickUser")}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-3 py-1.5 text-xs font-medium">
                ← Back
              </button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!canSave || saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function TimelineView({
  incomes: rawIncomes,
  familyMembers
}: TimelineViewProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  // Clearing hover is deferred by a tick so the pointer can travel from an axis
  // cell into the (interactive, edit-mode) tooltip without the tooltip blinking
  // out first. Re-hovering a column (axis cell or the tooltip's own
  // mouseenter) cancels the pending clear. Setting a number is immediate.
  const hoverClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setHoverIndexDeferred = useCallback((i: number | null) => {
    if (hoverClearTimer.current) {
      clearTimeout(hoverClearTimer.current)
      hoverClearTimer.current = null
    }
    if (i === null) {
      hoverClearTimer.current = setTimeout(() => setHoverIndex(null), 80)
    } else {
      setHoverIndex(i)
    }
  }, [])
  useEffect(
    () => () => {
      if (hoverClearTimer.current) clearTimeout(hoverClearTimer.current)
    },
    []
  )

  const activeRaw = useMemo(
    () => rawIncomes.filter((i) => i.isActive !== false),
    [rawIncomes]
  )

  const { incomes, mutate, error, clearError } = useOptimisticIncomes(activeRaw)

  // Live preview while dragging a bar — applies a patch to one income so the
  // chart and bars update together without spamming the server. Cleared on
  // pointerup; the actual mutate happens then.
  const [dragPreview, setDragPreview] = useState<{
    id: string
    patch: Partial<Income>
  } | null>(null)

  const effectiveIncomes = useMemo(() => {
    if (!dragPreview) return incomes
    return incomes.map((i) =>
      i.id === dragPreview.id ? ({ ...i, ...dragPreview.patch } as Income) : i
    )
  }, [incomes, dragPreview])

  // Responsive timeline window — narrower on mobile so each month is readable.
  const baseTlConfig = useTimelineConfig()

  // User-controlled time-range slider. 2 years (24 months) through 10 years
  // (120 months) in 1-year steps, on BOTH mobile and desktop — previously the
  // slider rendered on mobile but a short-circuit here ignored its value, so it
  // looked broken. Start offset stays at ~25% of the window in the past so
  // "today" sits about a quarter in from the left.
  const [windowYears, setWindowYears] = useState(2)
  const tlConfig = useMemo(() => {
    const monthCount = windowYears * 12
    const startOffset = -Math.floor(monthCount / 4)
    return { ...baseTlConfig, monthCount, startOffset }
  }, [baseTlConfig, windowYears])

  // Timeline scroll state — fractional months shifted from the default window.
  // Integer part drives cell construction; fractional part drives a CSS
  // translateX so the view glides between month boundaries.
  const [windowOffset, setWindowOffset] = useState(0)
  const windowOffsetMonths = Math.floor(windowOffset)
  const subMonthFraction = windowOffset - windowOffsetMonths

  // Modal/drawer state

  // Inline draft for the cards-view "Add Income" flow. Non-null while the
  // user is filling out a DraftSentenceCard on the page. Timeline view uses
  // editMode instead, so this stays null there.
  // Timeline "Add Income Stream" flow: pick an assigned member (or Unassigned)
  // then fill in the new-income form. Self-contained two-step dialog.
  const [addOpen, setAddOpen] = useState(false)
  const [detailIncomeId, setDetailIncomeId] = useState<string | null>(null)
  const [futureChangeContext, setFutureChangeContext] = useState<{
    incomeId: string
    milestone?: FutureMilestone
    // Pre-fill the dialog's start month (e.g. the month the user clicked on the
    // timeline). Editable in the dialog.
    defaultStartMonth?: string
  } | null>(null)
  const [deleteContext, setDeleteContext] = useState<Income | null>(null)
  // When the user clicks a month on the timeline in edit mode, we collect the
  // incomes active that month and let them pick which one to adjust before
  // opening the change dialog. null when the chooser is closed.
  const [monthAdjustContext, setMonthAdjustContext] = useState<{
    monthKey: string
    monthLabel: string
    choices: { income: Income; amount: number }[]
  } | null>(null)
  // When a just-saved future change has the SAME amount as the segment before
  // it, the change is a no-op (the bar would look split for no reason). Prompt
  // to merge — i.e. delete the redundant milestone so it's one continuous bar.
  const [mergeContext, setMergeContext] = useState<{
    incomeId: string
    milestoneId: string
    amount: number
  } | null>(null)

  // Edit mode — the umbrella state for any modification of bars. When true,
  // bars accept drag/resize/click-popover, lane areas accept pointerdown to
  // draw a new bar, and the bottom-rack and empty-state "Add Income" CTAs
  // route here. When false the timeline is read-only (hover tooltips still
  // work; everything else is inert). drawState tracks an in-progress draw,
  // drawCommit is the post-pointerup popup the user fills in to save.
  //
  // Anchoring by *date key* (yyyy-MM) instead of cells-index means the
  // dashed bar stays at the same calendar month when the user scrolls the
  // timeline horizontally — the indices are recomputed from the keys against
  // whatever `cells` currently holds.
  const [editMode, setEditMode] = useState(false)
  const [drawState, setDrawState] = useState<{
    rowIncomeId: string
    anchorKey: string
    endKey: string
  } | null>(null)
  const [drawCommit, setDrawCommit] = useState<{
    rowIncome: Income
    startKey: string
    endKey: string
    // Detected via the row-relative rule:
    // if the source row has a current income and the new bar ends before
    // it → 'past'; if start is after today → 'future'; else 'current'.
    // 'unknown' means we couldn't pin it down (no current income on the
    // row) and the popup must show a current/not-current toggle.
    detectedCategory: "past" | "current" | "future" | "unknown"
    // Position of the bar's center in viewport-X for popup placement.
    viewportX: number
    viewportY: number
  } | null>(null)

  const handleToggleEditMode = useCallback(() => {
    setEditMode((p) => {
      const next = !p
      if (!next) {
        setDrawState(null)
      }
      return next
    })
  }, [])

  const detailIncome = detailIncomeId
    ? (effectiveIncomes.find((i) => i.id === detailIncomeId) ?? null)
    : null
  const futureChangeIncome = futureChangeContext
    ? (effectiveIncomes.find((i) => i.id === futureChangeContext.incomeId) ??
      null)
    : null

  const cells = useMemo(
    () =>
      buildMonthCells(
        windowOffsetMonths,
        tlConfig.monthCount,
        tlConfig.startOffset
      ),
    [windowOffsetMonths, tlConfig.monthCount, tlConfig.startOffset]
  )

  // The range of cell indices the dragged bar will occupy on release. Drives a
  // vertical column-highlight overlay in the timeline so the user can see the
  // exact months the bar will snap to. Clamped to the visible window — bars
  // that extend past either edge get a flush-clamp on that side.
  const dragHighlight = useMemo(() => {
    if (!dragPreview || cells.length === 0) return null
    const target = incomes.find((i) => i.id === dragPreview.id)
    if (!target) return null
    const merged = { ...target, ...dragPreview.patch } as Income

    const firstWindowKey = cells[0].key
    const lastWindowKey = cells[cells.length - 1].key
    const startKey = format(startOfMonth(parseISO(merged.startDate)), "yyyy-MM")
    const endKey = merged.endDate
      ? format(startOfMonth(parseISO(merged.endDate)), "yyyy-MM")
      : lastWindowKey
    if (endKey < firstWindowKey || startKey > lastWindowKey) return null

    const clampedStartKey =
      startKey < firstWindowKey ? firstWindowKey : startKey
    const clampedEndKey = endKey > lastWindowKey ? lastWindowKey : endKey
    const firstIdx = cells.findIndex((c) => c.key === clampedStartKey)
    const lastIdx = cells.findIndex((c) => c.key === clampedEndKey)
    if (firstIdx === -1 || lastIdx === -1) return null
    return { firstIdx, lastIdx }
  }, [dragPreview, cells, incomes])

  // RAF-driven animation for button-triggered jumps. Wheel scrolling does NOT
  // use this — wheel events already provide their own continuous motion.
  const animationRef = useRef<number | null>(null)
  const animateTo = (target: number) => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
    }
    const start = performance.now()
    setWindowOffset((startOffset) => {
      const from = startOffset
      const distance = target - from
      const duration = Math.min(550, 220 + Math.abs(distance) * 28)
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        // ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3)
        setWindowOffset(from + distance * eased)
        if (t < 1) {
          animationRef.current = requestAnimationFrame(tick)
        } else {
          animationRef.current = null
        }
      }
      animationRef.current = requestAnimationFrame(tick)
      return startOffset
    })
  }

  const scrollPrev = () => animateTo(Math.round(windowOffset) - 6)
  const scrollNext = () => animateTo(Math.round(windowOffset) + 6)
  const scrollToToday = () => animateTo(0)
  const shiftWindowMonths = (delta: number) => {
    // Cancel any running button animation when the user touches the trackpad.
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setWindowOffset((o) => o + delta)
  }

  const monthlyTotals = useMemo(() => {
    return cells.map((cell) => {
      const breakdown = effectiveIncomes
        .map((income) => ({ income, amount: getAmountForMonth(income, cell) }))
        .filter((b) => b.amount > 0)
      // Bonus months spike the river: add each income's gross bonus as its own
      // breakdown entry so the tooltip reads "<name> Bonus" and the total lifts.
      const bonuses = effectiveIncomes
        .map((income) => ({ income, amount: getBonusForMonth(income, cell) }))
        .filter((b) => b.amount > 0)
        .map((b) => ({
          // Distinct id so a bonus entry never collides with its parent income
          // in keyed lists (e.g. the hover tooltip breakdown).
          income: {
            ...b.income,
            id: `${b.income.id}__bonus`,
            name: `${b.income.name} Bonus`
          },
          amount: b.amount
        }))
      const entries = [...breakdown, ...bonuses]
      const total = entries.reduce((sum, b) => sum + b.amount, 0)
      return { cell, breakdown: entries, total }
    })
  }, [cells, effectiveIncomes])

  const peakTotal = useMemo(
    () => monthlyTotals.reduce((max, m) => Math.max(max, m.total), 0),
    [monthlyTotals]
  )

  // Placeholder data for the empty-state backdrop. Computed only when there
  // are no real incomes — for users who already have streams these never
  // build. The backdrop reuses the real TimelineStudio so the preview is
  // pixel-accurate; only the surrounding wrapper makes it non-interactive.
  const showEmptyBackdrop = incomes.length === 0
  const placeholderIncomes = useMemo(
    () => (showEmptyBackdrop ? buildPlaceholderIncomes() : []),
    [showEmptyBackdrop]
  )
  const placeholderMonthlyTotals = useMemo(() => {
    if (!showEmptyBackdrop) return monthlyTotals
    return cells.map((cell) => {
      const breakdown = placeholderIncomes.map((income) => ({
        income,
        amount: getAmountForMonth(income, cell)
      }))
      const total = breakdown.reduce((sum, b) => sum + b.amount, 0)
      return { cell, breakdown: breakdown.filter((b) => b.amount > 0), total }
    })
  }, [showEmptyBackdrop, cells, placeholderIncomes, monthlyTotals])
  const placeholderPeak = useMemo(
    () =>
      placeholderMonthlyTotals.reduce((max, m) => Math.max(max, m.total), 0),
    [placeholderMonthlyTotals]
  )

  // ─── handlers (useCallback so React.memo'd children don't re-render) ──────

  const handleAmountChange = useCallback(
    (
      income: Income,
      nextAmount: number,
      extra?: {
        accountForBonus?: boolean
        bonusGroups?: string | null
        subjectToCpf?: boolean
        familyMemberAge?: number
      }
    ) => {
      const patch: Partial<Income> = { amount: nextAmount.toString() }
      const update: {
        amount: number
        accountForBonus?: boolean
        bonusGroups?: string | null
        subjectToCpf?: boolean
        familyMemberAge?: number
      } = { amount: nextAmount }
      if (extra) {
        if (extra.accountForBonus !== undefined) {
          patch.accountForBonus = extra.accountForBonus
          update.accountForBonus = extra.accountForBonus
        }
        if (extra.bonusGroups !== undefined) {
          patch.bonusGroups = extra.bonusGroups
          update.bonusGroups = extra.bonusGroups
        }
        if (extra.subjectToCpf !== undefined) {
          patch.subjectToCpf = extra.subjectToCpf
          update.subjectToCpf = extra.subjectToCpf
        }
        if (extra.familyMemberAge !== undefined) {
          update.familyMemberAge = extra.familyMemberAge
        }
      }
      mutate({ kind: "update", id: income.id, patch }, () =>
        updateIncome(income.id, update)
      )
    },
    [mutate]
  )

  // Editing a specific bar segment's amount. A "future change" segment edits
  // that milestone's amount in the futureMilestones JSON; a base/current
  // segment falls through to the income's base amount (handleAmountChange).
  const handleSegmentAmountChange = useCallback(
    (
      income: Income,
      seg: BarSegment,
      nextAmount: number,
      extra?: {
        accountForBonus?: boolean
        bonusGroups?: string | null
        subjectToCpf?: boolean
        familyMemberAge?: number
      }
    ) => {
      if (!seg.milestoneId) {
        handleAmountChange(income, nextAmount, extra)
        return
      }
      const existing = safeParseMilestones(income.futureMilestones)
      const next = existing.map((m) =>
        m.id === seg.milestoneId ? { ...m, amount: nextAmount } : m
      )
      const json = JSON.stringify(next)
      mutate(
        {
          kind: "update",
          id: income.id,
          patch: { futureMilestones: json, accountForFutureChange: true }
        },
        () =>
          updateIncome(income.id, {
            futureMilestones: json,
            accountForFutureChange: true
          })
      )

      // Editing this change to match the segment before it makes it a no-op —
      // offer to merge (delete it) so the bar reads as one continuous segment.
      const edited = next.find((m) => m.id === seg.milestoneId)
      if (edited) {
        const base = Number(income.amount) || 0
        const prior = priorEffectiveAmount(base, next, edited)
        if (Math.abs(prior - nextAmount) < 0.5) {
          setMergeContext({
            incomeId: income.id,
            milestoneId: seg.milestoneId,
            amount: nextAmount
          })
        }
      }
    },
    [mutate, handleAmountChange]
  )

  // Bar drag commit handlers — fired on pointerup, after the live preview
  // has already shown the user where the bar is moving. Each shifts dates
  // (and milestones, where appropriate) by integer-month deltas.
  const handleMoveBar = useCallback(
    (income: Income, deltaMonths: number) => {
      if (deltaMonths === 0) return
      const newStart = format(
        addMonths(parseISO(income.startDate), deltaMonths),
        "yyyy-MM-dd"
      )
      const newEnd = income.endDate
        ? format(addMonths(parseISO(income.endDate), deltaMonths), "yyyy-MM-dd")
        : null
      // Shift any milestone targetMonths by the same delta
      const milestones = safeParseMilestones(income.futureMilestones)
      const shifted = milestones.map((m) => ({
        ...m,
        targetMonth: format(
          addMonths(parseISO(`${m.targetMonth}-01`), deltaMonths),
          "yyyy-MM"
        )
      }))
      const newMilestonesJson =
        shifted.length > 0 ? JSON.stringify(shifted) : null
      mutate(
        {
          kind: "update",
          id: income.id,
          patch: {
            startDate: newStart,
            endDate: newEnd,
            futureMilestones: newMilestonesJson
          }
        },
        () =>
          updateIncome(income.id, {
            startDate: newStart,
            endDate: newEnd,
            futureMilestones: newMilestonesJson
          })
      )
    },
    [mutate]
  )

  const handleResizeStart = useCallback(
    (income: Income, deltaMonths: number) => {
      if (deltaMonths === 0) return
      let newStart = addMonths(parseISO(income.startDate), deltaMonths)
      // Don't let the new start cross the end date.
      if (income.endDate) {
        const end = parseISO(income.endDate)
        if (newStart >= end) newStart = end
      }
      const iso = format(newStart, "yyyy-MM-dd")
      mutate({ kind: "update", id: income.id, patch: { startDate: iso } }, () =>
        updateIncome(income.id, { startDate: iso })
      )
    },
    [mutate]
  )

  const handleResizeEnd = useCallback(
    (income: Income, deltaMonths: number) => {
      if (deltaMonths === 0) return
      const baseEnd = income.endDate
        ? parseISO(income.endDate)
        : parseISO(income.startDate)
      let newEnd = addMonths(baseEnd, deltaMonths)
      const start = parseISO(income.startDate)
      if (newEnd < start) newEnd = start
      const iso = format(newEnd, "yyyy-MM-dd")
      mutate({ kind: "update", id: income.id, patch: { endDate: iso } }, () =>
        updateIncome(income.id, { endDate: iso })
      )
    },
    [mutate]
  )

  const handleSaveMilestone = (income: Income, milestone: FutureMilestone) => {
    const existing = safeParseMilestones(income.futureMilestones)
    const filtered = existing.filter((m) => m.id !== milestone.id)
    const next = [...filtered, milestone].sort((a, b) =>
      a.targetMonth.localeCompare(b.targetMonth)
    )
    const json = JSON.stringify(next)
    mutate(
      {
        kind: "update",
        id: income.id,
        patch: { futureMilestones: json, accountForFutureChange: true }
      },
      () =>
        updateIncome(income.id, {
          futureMilestones: json,
          accountForFutureChange: true
        })
    )

    // If the change sets the same amount as the segment immediately before it,
    // it's a no-op that just splits the bar. Offer to merge (delete it).
    const base = Number(income.amount) || 0
    const prior = priorEffectiveAmount(base, next, milestone)
    if (Math.abs(prior - milestone.amount) < 0.5) {
      setMergeContext({
        incomeId: income.id,
        milestoneId: milestone.id,
        amount: milestone.amount
      })
    }
  }

  // User accepted the merge: drop the redundant milestone so the bar is one
  // continuous segment again.
  const handleMergeRedundant = () => {
    if (!mergeContext) return
    const income = effectiveIncomes.find((i) => i.id === mergeContext.incomeId)
    if (income) handleDeleteMilestone(income, mergeContext.milestoneId)
    setMergeContext(null)
  }

  // Edit-mode: the user clicked month `cellIndex` on the timeline (not on a
  // bar). Gather the incomes that pay in that month and open the chooser so
  // they can pick which one to adjust from then on. If only one income is
  // active, skip the chooser and open the change dialog directly.
  const handleMonthClick = (cellIndex: number) => {
    // A tap routes here instead of the draw flow — clear any in-progress draft.
    setDrawState(null)
    setDrawCommit(null)
    const cell = cells[cellIndex]
    if (!cell) return
    const choices = effectiveIncomes
      .map((income) => ({ income, amount: getAmountForMonth(income, cell) }))
      .filter((c) => c.amount > 0)
    if (choices.length === 0) return
    if (choices.length === 1) {
      openChangeForIncome(choices[0].income, cell.key)
      return
    }
    setMonthAdjustContext({
      monthKey: cell.key,
      monthLabel: format(cell.date, "MMMM yyyy"),
      choices
    })
  }

  // Open the change dialog for one income, defaulting the start to `monthKey`.
  // The dialog's "prior amount" (for the increment/decrement hint + temporary
  // revert target) is derived at render via priorAmountForChange().
  const openChangeForIncome = (income: Income, monthKey: string) => {
    setMonthAdjustContext(null)
    setFutureChangeContext({ incomeId: income.id, defaultStartMonth: monthKey })
  }

  // Pencil button in the hover tooltip: edit a specific income from this month.
  const handleEditIncomeFromMonth = (incomeId: string, monthKey: string) => {
    const income = effectiveIncomes.find((i) => i.id === incomeId)
    if (income) openChangeForIncome(income, monthKey)
  }

  // Pencil next to "Period" in a bar segment's popup → edit that segment's
  // start/end. A future-change segment opens the dialog editing its milestone
  // (so the start/end pickers are pre-filled); a base segment opens a new
  // change starting at the segment's first month.
  const handleEditSegmentPeriod = (income: Income, seg: BarSegment) => {
    if (seg.milestoneId) {
      const milestone = safeParseMilestones(income.futureMilestones).find(
        (m) => m.id === seg.milestoneId
      )
      setFutureChangeContext({ incomeId: income.id, milestone })
    } else {
      openChangeForIncome(income, seg.startKey)
    }
  }

  const handleDeleteMilestone = (income: Income, milestoneId: string) => {
    const existing = safeParseMilestones(income.futureMilestones)
    const next = existing.filter((m) => m.id !== milestoneId)
    const json = next.length === 0 ? null : JSON.stringify(next)
    const accountForFutureChange = next.length > 0
    mutate(
      {
        kind: "update",
        id: income.id,
        patch: { futureMilestones: json, accountForFutureChange }
      },
      () =>
        updateIncome(income.id, {
          futureMilestones: json,
          accountForFutureChange
        })
    )
  }

  const handleConfirmDelete = (income: Income) => {
    mutate({ kind: "delete", id: income.id }, () => deleteIncome(income.id))
    setDeleteContext(null)
  }

  // ─── draw-mode handlers ──────────────────────────────────────────────────
  // Per-row callbacks. The row reports its income identity + the cells index
  // under the cursor; the parent owns the drag state so commit + popup can
  // be coordinated globally.
  const handleDrawStart = useCallback(
    (income: Income, cellIdx: number) => {
      if (!editMode) return
      // The previous bar's commit popup is still open — don't let a click on
      // another lane wipe out the user's in-flight draft.
      if (drawCommit) return
      const clamped = Math.max(0, Math.min(cells.length - 1, cellIdx))
      const k = cells[clamped].key
      setDrawState({
        rowIncomeId: income.id,
        anchorKey: k,
        endKey: k
      })
    },
    [editMode, cells, drawCommit]
  )

  const handleDrawMove = useCallback(
    (income: Income, cellIdx: number) => {
      // Once the popup is open the drag is done — don't let stray pointermove
      // events reshape the dashed bar.
      if (drawCommit) return
      setDrawState((prev) => {
        if (!prev || prev.rowIncomeId !== income.id) return prev
        const clamped = Math.max(0, Math.min(cells.length - 1, cellIdx))
        const k = cells[clamped].key
        return k === prev.endKey ? prev : { ...prev, endKey: k }
      })
    },
    [cells, drawCommit]
  )

  const handleDrawEnd = useCallback(
    (
      income: Income,
      finalCellIdx: number,
      viewportX: number,
      viewportY: number
    ) => {
      setDrawState((prev) => {
        if (!prev || prev.rowIncomeId !== income.id) return prev
        const clamped = Math.max(0, Math.min(cells.length - 1, finalCellIdx))
        const finalKey = cells[clamped].key
        const startKey = finalKey < prev.anchorKey ? finalKey : prev.anchorKey
        const endKey = finalKey > prev.anchorKey ? finalKey : prev.anchorKey

        // Detect past / current / future per the user's rule.
        const detected = detectDrawCategory(income, startKey, endKey)

        setDrawCommit({
          rowIncome: income,
          startKey,
          endKey,
          detectedCategory: detected,
          viewportX,
          viewportY
        })
        // Keep the dashed bar visible while the popup is open — user reads
        // the date range from the bar; clearing it would yank away the
        // visual reference. Normalize the keys (anchor = start) so any
        // post-pointerup logic (e.g. live re-render through scroll) sees a
        // consistent ordering.
        return { ...prev, anchorKey: startKey, endKey }
      })
    },
    [cells]
  )

  const handleDrawSave = useCallback(
    async (data: {
      name: string
      amount: number
      isCurrent: boolean | null
      isPermanent: boolean
    }) => {
      if (!drawCommit) return
      const { startKey, endKey } = drawCommit
      // If the popup forced a toggle (detectedCategory === 'unknown') the
      // user's pick wins; otherwise the auto-detected category sticks.
      let category: "past" | "current" | "future"
      if (drawCommit.detectedCategory === "unknown") {
        category = data.isCurrent ? "current" : "past"
      } else {
        category = drawCommit.detectedCategory
      }
      // A permanent income runs from its start forever, so if it has already
      // started it's ongoing/current — it can't be "past" (no end reaches
      // today). A future start stays future until it arrives.
      if (data.isPermanent && category === "past") category = "current"
      // Permanent → no end date, the bar runs into perpetuity. Temporary →
      // bounded by the drawn end month.
      const endDate = data.isPermanent ? null : `${endKey}-01`
      await createIncome({
        name: data.name,
        category: drawCommit.rowIncome.category,
        incomeCategory: category,
        amount: data.amount,
        subjectToCpf: false,
        accountForBonus: false,
        startDate: `${startKey}-01`,
        endDate: endDate ?? undefined,
        familyMemberId: drawCommit.rowIncome.familyMemberId ?? undefined
      })
      setDrawCommit(null)
      setDrawState(null)
      // Stay in edit mode so the user can keep adding bars without
      // re-clicking the pencil — matches Figma/Photoshop tool behaviour.
    },
    [drawCommit]
  )

  const handleDrawDiscard = useCallback(() => {
    setDrawCommit(null)
    setDrawState(null)
  }, [])

  // Every "Add Income" CTA on the page routes through here. Cards view opens
  // an inline DraftSentenceCard; Timeline view flips into draw/edit mode so
  // the user can sketch a bar. Either way, no modal.
  const handleOpenAddIncome = useCallback(() => {
    setAddOpen(true)
  }, [])

  // "Add Income Stream" dialog → create. Mirrors the draw-save category rules:
  // permanent → no end (current/future by start); temporary → bounded, category
  // derived from where the [start,end] window sits relative to today.
  const handleCreateAddIncome = useCallback(
    async (data: {
      familyMemberId: string | null
      name: string
      amount: number
      startMonth: string // yyyy-MM
      endMonth: string | null // yyyy-MM, null when permanent
      isPermanent: boolean
    }) => {
      const nowMonth = format(startOfMonth(new Date()), "yyyy-MM")
      let category: "past" | "current" | "future"
      if (data.isPermanent) {
        category = data.startMonth > nowMonth ? "future" : "current"
      } else {
        const end = data.endMonth ?? data.startMonth
        category =
          end < nowMonth
            ? "past"
            : data.startMonth > nowMonth
              ? "future"
              : "current"
      }
      await createIncome({
        name: data.name,
        category: "salary",
        incomeCategory: category,
        amount: data.amount,
        subjectToCpf: false,
        accountForBonus: false,
        startDate: `${data.startMonth}-01`,
        endDate:
          data.isPermanent || !data.endMonth
            ? undefined
            : `${data.endMonth}-01`,
        familyMemberId: data.familyMemberId ?? undefined
      })
    },
    []
  )

  // Called by the dashed bar's drag handles (lateral move + resize-left +
  // resize-right). The row computes the new keys from the cursor; we just
  // mirror them into both drawState (so the bar re-renders at the new
  // position) and drawCommit (so the popup, whose rAF loop reads from the
  // bar's current rect, follows along).
  const handleDraftReshape = useCallback(
    (newAnchorKey: string, newEndKey: string) => {
      const lo = newAnchorKey < newEndKey ? newAnchorKey : newEndKey
      const hi = newAnchorKey > newEndKey ? newAnchorKey : newEndKey

      setDrawState((prev) =>
        prev ? { ...prev, anchorKey: newAnchorKey, endKey: newEndKey } : prev
      )
      setDrawCommit((prev) => {
        if (!prev) return prev
        // Re-detect the category against the new range so the popup's "Will
        // save as X" label and the eventual save classification stay correct
        // when the user edits the months (e.g. drags a past bar into the
        // future). A range that was auto-detected ('past'/'current'/'future')
        // can re-resolve to another concrete category; one that needs the
        // user's choice stays 'unknown'.
        const redetected = detectDrawCategory(prev.rowIncome, lo, hi)
        return {
          ...prev,
          startKey: lo,
          endKey: hi,
          detectedCategory: redetected
        }
      })

      // The dashed bar only renders within the visible window (`cells`), so a
      // picked month outside it would strand the bar (and its commit popup)
      // off-screen. If either end falls outside the window — minus a 1-month
      // padding so the bar isn't flush against the edge — scroll the window to
      // bring the range into view. `windowOffset` is the source of truth via
      // `animateTo`. Offset of a month from today's `base` = its
      // calendar-month difference; a month is visible at column index
      // `diff - startOffset - windowOffsetMonths`, valid in [0, monthCount-1].
      const base = startOfMonth(new Date())
      const loDiff = differenceInCalendarMonths(parseISO(`${lo}-01`), base)
      const hiDiff = differenceInCalendarMonths(parseISO(`${hi}-01`), base)
      const firstVisible = tlConfig.startOffset + windowOffsetMonths
      const lastVisible = firstVisible + tlConfig.monthCount - 1
      const PAD = 1
      let nextOffsetMonths = windowOffsetMonths
      if (loDiff - PAD < firstVisible) {
        // Range starts before the window — scroll back so `lo` sits PAD in.
        nextOffsetMonths = loDiff - PAD - tlConfig.startOffset
      } else if (hiDiff + PAD > lastVisible) {
        // Range ends after the window — scroll forward so `hi` sits PAD in.
        nextOffsetMonths =
          hiDiff + PAD - tlConfig.startOffset - (tlConfig.monthCount - 1)
      }
      if (nextOffsetMonths !== windowOffsetMonths) {
        animateTo(nextOffsetMonths)
      }
    },
    [tlConfig.startOffset, tlConfig.monthCount, windowOffsetMonths]
  )

  return (
    <div className="space-y-6">
      {/* Action Cards view is hidden for now — Timeline Studio is the only view.
          Re-add a ViewToggle wired to `effectiveView` / `_setView` to bring the
          toggle back. */}

      {error && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-center justify-between rounded-lg border px-4 py-2 text-sm">
          <span>{error}</span>
          <Button
            variant="link"
            size="sm"
            onClick={clearError}
            className="text-destructive h-auto p-0 text-xs font-semibold tracking-wider uppercase">
            Dismiss
          </Button>
        </div>
      )}

      {incomes.length === 0 && !editMode ? (
        <div className="relative">
          {/* Backdrop: a faded, non-interactive preview of whichever view the
              user has selected, populated with placeholder incomes.
              Communicates "this is what you'll unlock once you add your
              first stream." */}
          <div
            aria-hidden
            className="pointer-events-none opacity-40 blur-[1.5px] select-none">
            <TimelineStudio
              cells={cells}
              incomes={placeholderIncomes}
              monthlyTotals={placeholderMonthlyTotals}
              peakTotal={placeholderPeak}
              hoverIndex={null}
              onHover={() => {}}
              windowOffsetMonths={windowOffsetMonths}
              subMonthFraction={subMonthFraction}
              tlConfig={tlConfig}
              onScrollPrev={() => {}}
              onScrollNext={() => {}}
              onScrollToToday={() => {}}
              onShiftWindow={() => {}}
              onAmountChange={() => {}}
              onRequestDelete={() => {}}
              onOpenCreator={() => {}}
              onOpenDetail={() => {}}
              onDragPreview={() => {}}
              dragHighlight={null}
              onMoveBar={() => {}}
              onResizeStart={() => {}}
              onResizeEnd={() => {}}
            />
          </div>
          {/* Foreground: the real empty-state CTA, centered over the backdrop. */}
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <EmptyState onCreate={handleOpenAddIncome} />
          </div>
        </div>
      ) : (
        <TimelineStudio
          cells={cells}
          incomes={effectiveIncomes}
          familyMembers={familyMembers}
          monthlyTotals={monthlyTotals}
          peakTotal={peakTotal}
          hoverIndex={hoverIndex}
          onHover={setHoverIndexDeferred}
          windowOffsetMonths={windowOffsetMonths}
          subMonthFraction={subMonthFraction}
          tlConfig={tlConfig}
          onScrollPrev={scrollPrev}
          onScrollNext={scrollNext}
          onScrollToToday={scrollToToday}
          onShiftWindow={shiftWindowMonths}
          onAmountChange={handleAmountChange}
          onSegmentAmountChange={handleSegmentAmountChange}
          onEditSegmentPeriod={handleEditSegmentPeriod}
          onRequestDelete={setDeleteContext}
          onOpenCreator={() => setAddOpen(true)}
          onOpenDetail={setDetailIncomeId}
          onDragPreview={setDragPreview}
          dragHighlight={dragHighlight}
          onMoveBar={handleMoveBar}
          onResizeStart={handleResizeStart}
          onResizeEnd={handleResizeEnd}
          editMode={editMode}
          onToggleEditMode={handleToggleEditMode}
          drawState={drawState}
          drawCommit={drawCommit}
          onDrawStart={handleDrawStart}
          onDrawMove={handleDrawMove}
          onDrawEnd={handleDrawEnd}
          onDrawSave={handleDrawSave}
          onDrawDiscard={handleDrawDiscard}
          onDraftReshape={handleDraftReshape}
          onMonthClick={handleMonthClick}
          onMonthEditIncome={handleEditIncomeFromMonth}
          windowYears={windowYears}
          onWindowYearsChange={setWindowYears}
        />
      )}

      <TimelineFooter
        familyMembers={familyMembers}
        incomeCount={incomes.length}
      />

      <TimelineIncomeDetailDrawer
        open={detailIncome !== null}
        onOpenChange={(o) => !o && setDetailIncomeId(null)}
        income={detailIncome}
        familyMembers={familyMembers.map((m) => ({
          id: m.id,
          name: m.name,
          dateOfBirth: m.dateOfBirth
        }))}
      />

      {/* Income chooser — shown when a clicked month has more than one active
          income. Pick which stream to adjust from that month. */}
      <Dialog
        open={monthAdjustContext !== null}
        onOpenChange={(o) => !o && setMonthAdjustContext(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust income</DialogTitle>
            <DialogDescription>
              Which income changes from{" "}
              <span className="font-semibold">
                {monthAdjustContext?.monthLabel}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            {monthAdjustContext?.choices.map(({ income, amount }) => (
              <button
                key={income.id}
                type="button"
                onClick={() =>
                  openChangeForIncome(income, monthAdjustContext.monthKey)
                }
                className="border-border/40 hover:bg-muted flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors">
                <span className="text-foreground text-sm font-medium">
                  {income.name}
                </span>
                <span className="font-display text-muted-foreground text-sm font-semibold tabular-nums">
                  ${Math.round(amount).toLocaleString()}/mo
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AddIncomeStreamDialog
        open={addOpen}
        familyMembers={familyMembers.map((m) => ({
          id: m.id,
          name: m.name,
          relationship: m.relationship
        }))}
        onClose={() => setAddOpen(false)}
        onCreate={handleCreateAddIncome}
      />

      <TimelineFutureChangeDialog
        open={futureChangeContext !== null}
        onOpenChange={(o) => !o && setFutureChangeContext(null)}
        incomeName={futureChangeIncome?.name ?? ""}
        defaultStartMonth={futureChangeContext?.defaultStartMonth}
        priorAmount={
          futureChangeIncome
            ? priorAmountForChange(
                futureChangeIncome,
                futureChangeContext?.milestone,
                futureChangeContext?.defaultStartMonth
              )
            : undefined
        }
        initial={futureChangeContext?.milestone}
        onSave={(m) =>
          futureChangeIncome && handleSaveMilestone(futureChangeIncome, m)
        }
        onDelete={
          futureChangeContext?.milestone && futureChangeIncome
            ? () =>
                handleDeleteMilestone(
                  futureChangeIncome,
                  futureChangeContext.milestone!.id
                )
            : undefined
        }
      />

      <AlertDialog
        open={deleteContext !== null}
        onOpenChange={(o) => !o && setDeleteContext(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete <span className="italic">{deleteContext?.name}</span>?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This income stream will be removed from your projections. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteContext && handleConfirmDelete(deleteContext)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge prompt — a future change ended up at the same amount as the
          period before it, so it's a no-op that just splits the bar. */}
      <AlertDialog
        open={mergeContext !== null}
        onOpenChange={(o) => !o && setMergeContext(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge into one bar?</AlertDialogTitle>
            <AlertDialogDescription>
              This change keeps the income at{" "}
              <span className="font-semibold">
                ${Math.round(mergeContext?.amount ?? 0).toLocaleString()}
              </span>{" "}
              — the same as before it. Merge them so the timeline shows one
              continuous bar instead of a split?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep separate</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMergeRedundant}
              className="bg-brand-jungle hover:bg-brand-jungle/90 text-white">
              Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/**
 * Trackpad-friendly horizontal wheel-scroll hook.
 *
 * Wheel events fire at ~120Hz on Mac trackpads — running React renders on
 * each one wastes work, since the screen repaints at 60Hz at most. We
 * accumulate horizontal deltas and flush them once per animation frame.
 * Only intercepts events where horizontal intent dominates vertical, so
 * vertical page scrolling still works. Uses a non-passive listener so
 * preventDefault works.
 */
function useHorizontalWheelScroll(
  ref: React.RefObject<HTMLElement | null>,
  onShiftMonths: (deltaMonths: number) => void,
  headerPx: number = 180,
  monthCount: number = TIMELINE_MONTHS
) {
  const onShiftRef = useRef(onShiftMonths)
  useEffect(() => {
    onShiftRef.current = onShiftMonths
  }, [onShiftMonths])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let pendingDelta = 0
    let rafId: number | null = null

    const flush = () => {
      rafId = null
      const d = pendingDelta
      pendingDelta = 0
      if (d !== 0) onShiftRef.current(d)
    }

    const handler = (e: WheelEvent) => {
      const ax = Math.abs(e.deltaX)
      const ay = Math.abs(e.deltaY)
      // Trackpad horizontal swipe → deltaX dominant.
      // Mouse-wheel + Shift → deltaY dominant but treated as horizontal.
      const useDelta = ax > ay ? e.deltaX : e.shiftKey && ay > 0 ? e.deltaY : 0
      if (useDelta === 0) return
      e.preventDefault()
      const monthWidthPx = Math.max(1, (el.clientWidth - headerPx) / monthCount)
      pendingDelta += useDelta / monthWidthPx
      if (rafId === null) {
        rafId = requestAnimationFrame(flush)
      }
    }

    el.addEventListener("wheel", handler, { passive: false })
    return () => {
      el.removeEventListener("wheel", handler)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [ref, headerPx, monthCount])
}

// Touch drag-to-pan — lets phone/tablet users swipe the timeline horizontally
// (the wheel hook only covers trackpad/mouse). `enabled` is false in edit mode,
// where a one-finger touch drives drawing/dragging bars instead. Vertical
// gestures fall through to the page (the host element uses touch-action:pan-y).
function useTouchPanScroll(
  ref: React.RefObject<HTMLElement | null>,
  onShiftMonths: (deltaMonths: number) => void,
  headerPx: number,
  monthCount: number,
  enabled: boolean
) {
  const onShiftRef = useRef(onShiftMonths)
  useEffect(() => {
    onShiftRef.current = onShiftMonths
  }, [onShiftMonths])

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    let lastX = 0
    let lastY = 0
    let active = false
    let horizontal = false
    const monthWidth = () =>
      Math.max(1, (el.clientWidth - headerPx) / monthCount)

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        active = false
        return
      }
      active = true
      horizontal = false
      lastX = e.touches[0].clientX
      lastY = e.touches[0].clientY
    }
    const onMove = (e: TouchEvent) => {
      if (!active || e.touches.length !== 1) return
      const x = e.touches[0].clientX
      const y = e.touches[0].clientY
      const dx = x - lastX
      // Lock to horizontal once the gesture is clearly sideways; otherwise let
      // a vertical swipe scroll the page.
      if (!horizontal) {
        if (Math.abs(dx) < 6 && Math.abs(y - lastY) < 6) return
        if (Math.abs(y - lastY) > Math.abs(dx)) {
          active = false
          return
        }
        horizontal = true
      }
      lastX = x
      lastY = y
      if (dx !== 0) {
        e.preventDefault()
        // Dragging right (dx > 0) reveals earlier months → shift negative.
        onShiftRef.current(-dx / monthWidth())
      }
    }
    const onEnd = () => {
      active = false
      horizontal = false
    }

    el.addEventListener("touchstart", onStart, { passive: true })
    el.addEventListener("touchmove", onMove, { passive: false })
    el.addEventListener("touchend", onEnd, { passive: true })
    el.addEventListener("touchcancel", onEnd, { passive: true })
    return () => {
      el.removeEventListener("touchstart", onStart)
      el.removeEventListener("touchmove", onMove)
      el.removeEventListener("touchend", onEnd)
      el.removeEventListener("touchcancel", onEnd)
    }
  }, [ref, headerPx, monthCount, enabled])
}

function TimelineStudio({
  cells,
  incomes,
  familyMembers = [],
  monthlyTotals,
  peakTotal,
  hoverIndex,
  onHover,
  windowOffsetMonths,
  subMonthFraction,
  tlConfig,
  onScrollPrev,
  onScrollNext,
  onScrollToToday,
  onShiftWindow,
  onAmountChange,
  onSegmentAmountChange,
  onEditSegmentPeriod,
  onRequestDelete,
  onOpenCreator,
  onOpenDetail,
  onDragPreview,
  dragHighlight,
  onMoveBar,
  onResizeStart,
  onResizeEnd,
  editMode = false,
  onToggleEditMode,
  drawState,
  drawCommit,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  onDrawSave,
  onDrawDiscard,
  onDraftReshape,
  onMonthClick,
  onMonthEditIncome,
  windowYears,
  onWindowYearsChange
}: {
  cells: MonthCell[]
  incomes: Income[]
  familyMembers?: FamilyMember[]
  monthlyTotals: ReturnType<typeof Object>
  peakTotal: number
  hoverIndex: number | null
  onHover: (i: number | null) => void
  windowOffsetMonths: number
  subMonthFraction: number
  tlConfig: TimelineConfig
  onScrollPrev: () => void
  onScrollNext: () => void
  onScrollToToday: () => void
  onShiftWindow: (delta: number) => void
  onAmountChange: (
    income: Income,
    amount: number,
    extra?: {
      accountForBonus?: boolean
      bonusGroups?: string | null
      subjectToCpf?: boolean
      familyMemberAge?: number
    }
  ) => void
  // Edit one bar segment's amount (base or a specific future change).
  onSegmentAmountChange?: (
    income: Income,
    seg: BarSegment,
    amount: number,
    extra?: {
      accountForBonus?: boolean
      bonusGroups?: string | null
      subjectToCpf?: boolean
      familyMemberAge?: number
    }
  ) => void
  // Edit a segment's period (start/end) — opens the change dialog.
  onEditSegmentPeriod?: (income: Income, seg: BarSegment) => void
  onRequestDelete: (income: Income) => void
  onOpenCreator: () => void
  onOpenDetail: (id: string) => void
  onDragPreview: (
    preview: { id: string; patch: Partial<Income> } | null
  ) => void
  dragHighlight: { firstIdx: number; lastIdx: number } | null
  onMoveBar: (income: Income, deltaMonths: number) => void
  onResizeStart: (income: Income, deltaMonths: number) => void
  onResizeEnd: (income: Income, deltaMonths: number) => void
  editMode?: boolean
  onToggleEditMode?: () => void
  drawState?: {
    rowIncomeId: string
    anchorKey: string
    endKey: string
  } | null
  drawCommit?: {
    rowIncome: Income
    startKey: string
    endKey: string
    detectedCategory: "past" | "current" | "future" | "unknown"
    viewportX: number
    viewportY: number
  } | null
  onDrawStart?: (income: Income, cellIdx: number) => void
  onDrawMove?: (income: Income, cellIdx: number) => void
  onDrawEnd?: (
    income: Income,
    cellIdx: number,
    viewportX: number,
    viewportY: number
  ) => void
  onDrawSave?: (data: {
    name: string
    amount: number
    isCurrent: boolean | null
    isPermanent: boolean
  }) => void
  onDrawDiscard?: () => void
  onDraftReshape?: (newAnchorKey: string, newEndKey: string) => void
  onMonthClick?: (cellIndex: number) => void
  // Edit one income from a month, triggered by the per-income pencil button in
  // the hover tooltip (edit mode only).
  onMonthEditIncome?: (incomeId: string, monthKey: string) => void
  windowYears?: number
  onWindowYearsChange?: (years: number) => void
}) {
  const totals = monthlyTotals as Array<{
    cell: MonthCell
    breakdown: Array<{ income: Income; amount: number }>
    total: number
  }>

  // Find "now" column index for the playhead
  const nowKey = format(startOfMonth(new Date()), "yyyy-MM")
  const nowIndex = cells.findIndex((c) => c.key === nowKey)
  const nowLeftPct = nowIndex >= 0 ? (nowIndex + 0.5) / cells.length : null
  // The river chart plots months as POINTS (cell i at i/(N-1)), not slots, so
  // its "now" column sits at a different fraction than the slot-based lanes.
  // Use the point fraction for the river overlay so the line meets the curve.
  const riverNowPct =
    nowIndex >= 0 && cells.length > 1
      ? nowIndex / (cells.length - 1)
      : nowLeftPct

  // Fraction of the visible window that is in the PAST (left of "now"), used to
  // shade the past so it reads differently from the future. Handles the cases
  // where "now" has scrolled off either edge: off the right → all past; off the
  // left → all future. The 1.2 overshoot guarantees full coverage despite the
  // sub-month translate when the whole window is in the past.
  const pastShadeFraction =
    cells.length === 0
      ? null
      : nowIndex >= 0
        ? (nowIndex + 0.5) / cells.length
        : nowKey > cells[cells.length - 1].key
          ? 1.2
          : nowKey < cells[0].key
            ? 0
            : null

  // Group incomes by family member for the rack rendering. Each family
  // member row gets one header + one or more bars (their incomes). Sort:
  // Self first (relationship === "Self"), then alphabetical by name.
  // Unassigned incomes (familyMemberId === null) collapse into a single
  // "Unassigned" row at the bottom. Family members with zero incomes still
  // get a row so the user can draw on them.
  const groupedRows = useMemo(() => {
    const byMember = new Map<string | null, Income[]>()
    for (const inc of incomes) {
      const key = inc.familyMemberId ?? null
      const list = byMember.get(key)
      if (list) list.push(inc)
      else byMember.set(key, [inc])
    }
    const sortedMembers = [...familyMembers].sort((a, b) => {
      const aSelf = a.relationship === "Self"
      const bSelf = b.relationship === "Self"
      if (aSelf && !bSelf) return -1
      if (!aSelf && bSelf) return 1
      return a.name.localeCompare(b.name)
    })
    const rows: Array<{
      key: string
      familyMember: FamilyMember | null
      incomes: Income[]
      tracks: Income[][]
    }> = []
    for (const fm of sortedMembers) {
      const memberIncomes = byMember.get(fm.id) ?? []
      rows.push({
        key: fm.id,
        familyMember: fm,
        incomes: memberIncomes,
        tracks: packIntoTracks(memberIncomes)
      })
    }
    // Bottom: unassigned incomes, only if any exist.
    const unassigned = byMember.get(null) ?? []
    if (unassigned.length > 0) {
      rows.push({
        key: "_unassigned",
        familyMember: null,
        incomes: unassigned,
        tracks: packIntoTracks(unassigned)
      })
    }
    return rows
  }, [incomes, familyMembers])

  // Focal month — the calendar month sitting at the horizontal centre of the
  // viewport. `cells` and `subMonthFraction` both change as the window scrolls,
  // so this (and every age derived from it) updates live. Backs the centred age
  // chip (#17) and each member's name-box age (#16).
  const focalIndex =
    cells.length === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            cells.length - 1,
            Math.round((cells.length - 1) / 2 + subMonthFraction)
          )
        )
  const focalDate = cells.length > 0 ? cells[focalIndex].date : null

  // Gross vs net (take-home) display for the bars.
  const [amountMode, setAmountMode] = useState<"gross" | "nett">("gross")

  // Total monthly income at the focal month — the live figure for the river's
  // centred callout (#D). In NETT mode, applies each income's net factor so
  // the chip matches the bar labels (both use the same salary-based ratio).
  const focalMonthData =
    cells.length > 0
      ? (
          monthlyTotals as Array<{
            total: number
            breakdown: Array<{ income: Income; amount: number }>
          }>
        )[focalIndex]
      : null
  const focalTotal = focalMonthData
    ? amountMode === "nett"
      ? focalMonthData.breakdown.reduce(
          (sum, b) => sum + b.amount * netFactor(b.income),
          0
        )
      : focalMonthData.total
    : null

  // Centred age readout (#17): "<year> · Alex 47 · Jamie 42 · …" for every
  // contributing member who has a birthdate, evaluated at the focal month.
  const focalAgeChip = useMemo(() => {
    if (!focalDate) return null
    const parts: string[] = []
    for (const fm of familyMembers ?? []) {
      if (fm.isContributing === false) continue
      const a = ageAtDate(fm.dateOfBirth, focalDate)
      if (a == null) continue
      parts.push(`${fm.name.split(" ")[0]} ${a}`)
    }
    if (parts.length === 0) return null
    return `${focalDate.getFullYear()} · ${parts.join(" · ")}`
  }, [familyMembers, focalDate])

  // Range label + "at today" flag for the in-card title bar (the standalone
  // header row was folded into the card — #N).
  const rangeLabel =
    cells.length > 0
      ? `${format(cells[0].date, "MMM yy")} – ${format(cells[cells.length - 1].date, "MMM yy")}`
      : ""
  const atToday = windowOffsetMonths === 0

  const dawRef = useRef<HTMLDivElement | null>(null)
  useHorizontalWheelScroll(
    dawRef,
    onShiftWindow,
    tlConfig.headerPx,
    tlConfig.monthCount
  )
  // Finger-pan the timeline (view mode only — edit mode uses touch for draw/drag).
  useTouchPanScroll(
    dawRef,
    onShiftWindow,
    tlConfig.headerPx,
    tlConfig.monthCount,
    !editMode
  )

  // CSS variable used by every translated child (river chart, month axis,
  // gridlines/now overlay, each lane's bars area). Expressed as a percentage
  // of the child's own width — each child fills the 1fr right column.
  const translatePct = -(subMonthFraction / cells.length) * 100
  const tsStyle = {
    "--ts-x": `${translatePct}%`,
    "--ts-header-px": `${tlConfig.headerPx}px`
  } as React.CSSProperties
  const gridColsStyle = {
    gridTemplateColumns: `${tlConfig.headerPx}px 1fr`
  } as React.CSSProperties
  const cellGridStyle = {
    gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`
  } as React.CSSProperties

  return (
    <div className="space-y-4">
      {/* The standalone "Projected Income River" header row was folded into the
          card's top bar (#N), so the card sits flush under the page tabs. */}
      <div className="relative">
        <div
          ref={dawRef}
          data-timeline-studio="true"
          style={tsStyle}
          className={cn(
            // bg-card stays opaque in BOTH states — the card must never go
            // translucent (the app-shell wallpaper would show through). The
            // edit-mode difference is expressed only via the border/shadow + the
            // pulsing ring overlay below.
            // touch-pan-y lets vertical page scroll pass through while the
            // timeline owns horizontal panning.
            "bg-card relative touch-pan-y overflow-hidden overscroll-x-contain rounded-2xl border transition-[box-shadow,border-color] duration-200",
            editMode
              ? "border-brand-terracotta shadow-brand-terracotta/10 shadow-lg"
              : "shadow-card border-brand-deep-forest/[0.06] dark:border-brand-cream/[0.08] dark:shadow-none"
          )}>
          {/* Edit-mode pulsing ring — a dedicated inset-ring overlay so only the
            border glows in and out (the card's content opacity is untouched).
            Signals at a glance that edit mode is active (#F). */}
          {editMode && (
            <div className="ring-brand-terracotta pointer-events-none absolute inset-0 z-30 animate-pulse rounded-2xl ring-2 ring-inset" />
          )}

          {/* In-card title bar — the "Projected Income River" heading lives in the
            top-left corner here (#N), with the display/scale/scroll controls on
            the right. Folding the old standalone header row in here lets the
            card sit flush under the page tabs. */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3 pb-1 sm:px-6 sm:pt-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="text-brand-jungle size-4 shrink-0 sm:h-5 sm:w-5" />
              <h2 className="font-display text-foreground text-sm font-semibold tracking-tight sm:text-base">
                Projected Income River
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              <span className="font-display text-muted-foreground hidden text-right text-[11px] font-semibold tracking-[0.14em] uppercase lg:inline-block">
                {rangeLabel}
              </span>
              {/* Gross / Nett — Nett shows take-home (after employee CPF) on
                CPF-applicable income bars. */}
              <div
                data-tour="income-display-toggle"
                className="border-border/40 bg-card/90 flex items-center rounded-full border p-0.5 shadow-sm backdrop-blur-sm">
                {(["gross", "nett"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setAmountMode(m)}
                    aria-pressed={amountMode === m}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase transition-colors sm:px-2.5 sm:py-1",
                      amountMode === m
                        ? "bg-brand-jungle text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}>
                    {m === "gross" ? "Gross" : "Nett"}
                  </button>
                ))}
              </div>
              {onWindowYearsChange && windowYears !== undefined && (
                <div className="border-border/40 bg-card/90 flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-sm backdrop-blur-sm sm:gap-2 sm:px-3">
                  <span className="text-muted-foreground hidden text-[9px] font-bold tracking-[0.2em] uppercase sm:inline">
                    Scale
                  </span>
                  <Slider
                    value={[windowYears]}
                    onValueChange={(v) => onWindowYearsChange(v[0])}
                    min={2}
                    max={10}
                    step={1}
                    className="w-16 sm:w-24"
                    aria-label="Timeline range in years"
                  />
                  <span className="font-display text-foreground min-w-[2rem] text-right text-[11px] font-semibold tabular-nums sm:min-w-[2.5rem]">
                    {windowYears}y
                  </span>
                </div>
              )}
              {/* Scroll nav (prev / today / next) */}
              <div className="border-border/40 bg-card inline-flex items-center rounded-full border p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={onScrollPrev}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-full transition-colors"
                  aria-label="Scroll timeline 6 months earlier">
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={onScrollToToday}
                  disabled={atToday}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold tracking-wider uppercase transition-colors",
                    atToday
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "text-brand-terracotta hover:bg-brand-terracotta/10"
                  )}
                  aria-label="Reset timeline to today">
                  <LocateFixed className="h-3.5 w-3.5" />
                  Today
                </button>
                <button
                  type="button"
                  onClick={onScrollNext}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-full transition-colors"
                  aria-label="Scroll timeline 6 months later">
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
          {/* Master river chart */}
          <div
            data-tour="income-river-chart"
            className="grid gap-0 px-3 pt-1 pb-2 sm:px-6 sm:pt-2"
            style={gridColsStyle}>
            <div className="flex items-end pb-1">
              <span className="text-muted-foreground text-[10px] font-bold tracking-[0.18em] uppercase">
                Master
              </span>
            </div>
            <div className="relative overflow-hidden" style={EDGE_FADE_STYLE}>
              {/* Focal total callout (#D): a static, centred pill showing the
                total monthly income at the month in the middle of the view. The
                figure updates as the timeline scrolls; the pill itself does not
                translate, so it stays parked dead-centre over the curve. */}
              {focalTotal !== null && (
                <div className="border-border/40 bg-card/90 pointer-events-none absolute top-0 left-1/2 z-10 flex -translate-x-1/2 items-baseline gap-1 rounded-full border px-2.5 py-0.5 shadow-sm backdrop-blur-sm">
                  <span className="text-muted-foreground text-[8px] font-bold tracking-[0.16em] uppercase">
                    Total
                  </span>
                  <span className="font-display text-foreground text-[11px] font-semibold tabular-nums">
                    {formatCurrency(focalTotal)}
                  </span>
                  <span className="text-muted-foreground text-[9px] font-medium">
                    /mo
                  </span>
                </div>
              )}
              <div
                className="relative will-change-transform"
                style={{ transform: "translateX(var(--ts-x, 0))" }}>
                <RiverChart
                  cells={cells}
                  totals={totals}
                  peakTotal={peakTotal}
                  hoverIndex={hoverIndex}
                  incomes={incomes}
                  isMobile={tlConfig.isMobile}
                />
                {/* "Now" line through the river — past sits to its left, present
                  to its right. Uses the river's point-based x so it meets the
                  curve at the current month. */}
                {riverNowPct !== null && (
                  <div
                    className="bg-brand-terracotta/70 pointer-events-none absolute top-0 bottom-0 w-[3px] -translate-x-1/2 animate-pulse rounded-full [animation-duration:1s]"
                    style={{
                      left: `${riverNowPct * 100}%`,
                      // Thicker line whose top + bottom ends fade out gradually
                      // rather than stopping with a hard cap, and a gentle pulse
                      // so the "now" marker subtly breathes (#C).
                      maskImage:
                        "linear-gradient(to bottom, transparent, #000 26%, #000 74%, transparent)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, transparent, #000 26%, #000 74%, transparent)"
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Month axis — aligned with the timeline grid below */}
          <div
            data-tour="income-month-axis"
            className="border-border/30 grid gap-0 border-b"
            style={gridColsStyle}>
            <div className="border-border/30 border-r" />
            <div className="overflow-hidden" style={EDGE_FADE_STYLE}>
              <div
                className="px-0 will-change-transform"
                style={{ transform: "translateX(var(--ts-x, 0))" }}>
                <MonthAxis
                  cells={cells}
                  hoverIndex={hoverIndex}
                  onHover={onHover}
                  totals={totals}
                />
              </div>
            </div>
          </div>

          {/* Track lanes — DAW-style stacked tracks sharing one continuous timeline */}
          <div data-tour="income-member-lane" className="relative">
            {/* Overlay viewport — clips translated content and applies edge fade */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 overflow-hidden"
              style={{ left: `${tlConfig.headerPx}px`, ...EDGE_FADE_STYLE }}>
              <div
                className="absolute inset-0 will-change-transform"
                style={{ transform: "translateX(var(--ts-x, 0))" }}>
                {/* Past shade — greys the region left of "now" so past months read
                  distinctly from the future. Sits behind the gridlines/bars. */}
                {pastShadeFraction !== null && pastShadeFraction > 0 && (
                  <div
                    className="bg-foreground/[0.05] pointer-events-none absolute inset-y-0 left-0"
                    style={{ width: `${pastShadeFraction * 100}%` }}
                  />
                )}
                {/* Vertical month gridlines spanning every track */}
                <div className="absolute inset-0 grid" style={cellGridStyle}>
                  {cells.map((cell) => {
                    // Subtle alternating per-year shading so each calendar year
                    // reads as its own block: even years a touch darker, odd years
                    // the base card (lighter). Sits behind the gridlines + bars.
                    const evenYear = cell.date.getFullYear() % 2 === 0
                    return (
                      <div
                        key={cell.key}
                        className={cn(
                          "border-border/15 border-l first:border-l-0",
                          evenYear && "bg-foreground/[0.035]"
                        )}
                      />
                    )
                  })}
                </div>
                {/* Drag-target column highlight — vertical strip across every
                  lane covering the months the dragged bar will snap to.
                  Renders only while a drag is active. */}
                {dragHighlight && (
                  <div
                    className="bg-brand-terracotta/10 ring-brand-terracotta/40 pointer-events-none absolute inset-y-0 ring-1 transition-[left,width] duration-75 ring-inset"
                    style={{
                      left: `${(dragHighlight.firstIdx / cells.length) * 100}%`,
                      width: `${((dragHighlight.lastIdx - dragHighlight.firstIdx + 1) / cells.length) * 100}%`
                    }}
                  />
                )}
                {/* Now playhead line (chip lives in a separate overlay so it's not clipped) */}
                {nowLeftPct !== null && (
                  <div
                    className="bg-brand-terracotta/50 absolute top-0 bottom-0 z-10 w-px"
                    style={{ left: `${nowLeftPct * 100}%` }}
                  />
                )}
              </div>
            </div>

            {/* Now chip overlay — sibling of the gridlines overlay so it can
              extend above the lanes wrapper without being clipped. Uses the
              same --ts-x translate so the chip stays anchored to the line. */}
            {nowLeftPct !== null && (
              <div
                className="pointer-events-none absolute right-0 z-20 overflow-hidden"
                style={{
                  left: `${tlConfig.headerPx}px`,
                  top: "-12px",
                  height: "26px",
                  ...EDGE_FADE_STYLE
                }}>
                <div
                  className="absolute inset-0 will-change-transform"
                  style={{ transform: "translateX(var(--ts-x, 0))" }}>
                  <span
                    className="bg-brand-terracotta absolute top-1 -translate-x-1/2 rounded-sm px-1 py-0.5 text-[8px] font-bold tracking-wider text-white uppercase shadow-sm"
                    style={{ left: `${nowLeftPct * 100}%` }}>
                    Now
                  </span>
                </div>
              </div>
            )}

            {/* Centred age readout (#17). Static in position — it sits at the
              horizontal centre of the lanes and does NOT translate with the
              scroll — while the figure is dynamic: it shows everyone's age at
              the month currently centred in the viewport. */}
            {focalAgeChip && (
              <div
                className="pointer-events-none absolute z-20 flex justify-center"
                style={{
                  left: `${tlConfig.headerPx}px`,
                  right: 0,
                  top: "-11px"
                }}>
                <span className="border-border/40 bg-card/95 text-muted-foreground max-w-full truncate rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tabular-nums shadow-sm backdrop-blur-sm">
                  {focalAgeChip}
                </span>
              </div>
            )}

            {(() => {
              // Render one family-member group at a time. Each group's first
              // row shows the family member name in the header column; the
              // remaining rows in the same group render with no header and
              // no top border, so the group visually reads as a single
              // expanded row containing stacked bars.
              //
              // Empty family-member rows render a single "ghost" row when edit
              // mode is on so the user can draw their first income on the lane.
              // The ghost has amount=0 (renders nothing) but carries the
              // familyMemberId so handleDrawSave wires the new income to the
              // right member. In view mode, empty rows are skipped — they'd
              // just show a blank lane with no purpose.
              const todayIso = format(startOfMonth(new Date()), "yyyy-MM-dd")
              let globalRowIdx = 0
              return groupedRows.flatMap((group, groupIdx) => {
                const alternate = groupIdx % 2 === 1
                if (group.incomes.length === 0) {
                  if (!editMode) return []
                  const ghost = buildGhostIncome(group.familyMember, todayIso)
                  const isFirst = globalRowIdx === 0
                  globalRowIdx += 1
                  const familyHeader = group.familyMember
                    ? {
                        name: group.familyMember.name,
                        relationship: group.familyMember.relationship,
                        age: ageAtDate(
                          group.familyMember.dateOfBirth,
                          focalDate
                        ),
                        focalMonthLabel: focalDate
                          ? format(focalDate, "MMM yyyy")
                          : null
                      }
                    : { name: "Unassigned", relationship: null, age: null }
                  return [
                    <IncomeStreamRow
                      key={ghost.id}
                      incomes={[ghost]}
                      familyMemberHeader={familyHeader}
                      cells={cells}
                      amountMode={amountMode}
                      subMonthFraction={subMonthFraction}
                      isFirst={isFirst}
                      isFirstInGroup={true}
                      alternate={alternate}
                      tlConfig={tlConfig}
                      onAmountChange={onAmountChange}
                      onSegmentAmountChange={onSegmentAmountChange}
                      onEditSegmentPeriod={onEditSegmentPeriod}
                      onRequestDelete={onRequestDelete}
                      onOpenDetail={onOpenDetail}
                      onDragPreview={onDragPreview}
                      onMoveBar={onMoveBar}
                      onResizeStart={onResizeStart}
                      onResizeEnd={onResizeEnd}
                      editMode={editMode}
                      drawState={
                        drawState && drawState.rowIncomeId === ghost.id
                          ? drawState
                          : null
                      }
                      onDrawStart={onDrawStart}
                      onDrawMove={onDrawMove}
                      onDrawEnd={onDrawEnd}
                      onDraftReshape={onDraftReshape}
                      onMonthClick={onMonthClick}
                      rowFamilyMemberId={group.familyMember?.id ?? null}
                    />
                  ]
                }
                const familyHeader = group.familyMember
                  ? {
                      name: group.familyMember.name,
                      relationship: group.familyMember.relationship,
                      age: ageAtDate(group.familyMember.dateOfBirth, focalDate),
                      focalMonthLabel: focalDate
                        ? format(focalDate, "MMM yyyy")
                        : null
                    }
                  : {
                      name: "Unassigned",
                      relationship: null,
                      age: null,
                      focalMonthLabel: null
                    }
                // One row per packed track (non-overlapping incomes share a
                // lane). The track's first income drives the React key + the
                // draw context (via the row's `primary` lookup).
                return group.tracks.map((track, i) => {
                  const isFirst = globalRowIdx === 0
                  const isFirstInGroup = i === 0
                  globalRowIdx += 1
                  const trackKey = `${group.key}__${track.map((t) => t.id).join("_")}`
                  const drawTargetIncome =
                    track.find((t) => getArchetype(t) === "recurring") ??
                    track[0]
                  return (
                    <IncomeStreamRow
                      key={trackKey}
                      incomes={track}
                      familyMemberHeader={isFirstInGroup ? familyHeader : null}
                      cells={cells}
                      amountMode={amountMode}
                      subMonthFraction={subMonthFraction}
                      isFirst={isFirst}
                      isFirstInGroup={isFirstInGroup}
                      alternate={alternate}
                      tlConfig={tlConfig}
                      onAmountChange={onAmountChange}
                      onSegmentAmountChange={onSegmentAmountChange}
                      onEditSegmentPeriod={onEditSegmentPeriod}
                      onRequestDelete={onRequestDelete}
                      onOpenDetail={onOpenDetail}
                      onDragPreview={onDragPreview}
                      onMoveBar={onMoveBar}
                      onResizeStart={onResizeStart}
                      onResizeEnd={onResizeEnd}
                      editMode={editMode}
                      drawState={
                        drawState &&
                        drawState.rowIncomeId === drawTargetIncome.id
                          ? drawState
                          : null
                      }
                      onDrawStart={onDrawStart}
                      onDrawMove={onDrawMove}
                      onDrawEnd={onDrawEnd}
                      onDraftReshape={onDraftReshape}
                      onMonthClick={onMonthClick}
                      rowFamilyMemberId={group.familyMember?.id ?? null}
                    />
                  )
                })
              })
            })()}
          </div>

          {/* Add track row — bottom of the rack */}
          <button
            type="button"
            data-tour="add-income-stream-btn"
            onClick={onOpenCreator}
            className="border-border/30 bg-muted/30 text-muted-foreground hover:bg-brand-terracotta/5 hover:text-brand-terracotta flex w-full items-center justify-center gap-2 border-t py-3 text-sm font-medium transition-colors">
            <Plus className="size-4" />
            Add Income Stream
          </button>
        </div>

        {/* Tooltip overlay — sibling of the DAW so it's not clipped by the
          DAW's overflow-hidden. Translates with --ts-x to track the
          hovered column. */}
        {hoverIndex !== null && totals[hoverIndex] && (
          <div
            className="pointer-events-none absolute z-30"
            style={{
              left: `${tlConfig.headerPx}px`,
              right: 0,
              top: 0,
              bottom: 0
            }}>
            <div
              className="absolute inset-0 will-change-transform"
              style={{ transform: "translateX(var(--ts-x, 0))" }}>
              <HoverTooltip
                index={hoverIndex}
                cell={cells[hoverIndex]}
                breakdown={totals[hoverIndex].breakdown}
                total={totals[hoverIndex].total}
                totalCount={cells.length}
                editMode={editMode}
                onEditIncome={onMonthEditIncome}
                onKeepAlive={onHover}
              />
            </div>
          </div>
        )}
      </div>
      {/* Pencil-tool commit popup — fixed-position, lives outside the DAW so
          it can extend beyond the rack edge without being clipped. */}
      {drawCommit &&
        onDrawSave &&
        onDrawDiscard &&
        cells.length > 0 &&
        (() => {
          // Cell offsets for the popup, measured in months from the first visible
          // cell. These feed the popup's rAF position loop ONLY as effect deps so
          // it re-runs as the window scrolls — the actual anchor comes from the
          // draft bar's live DOM rect. We compute them from the date keys (not
          // findIndex) so they stay defined even when the drawn bar scrolls
          // outside the visible window; the popup then clamps itself to the
          // viewport edge instead of unmounting and vanishing (#18).
          const cell0 = cells[0].date
          const sIdx = differenceInCalendarMonths(
            parseISO(`${drawCommit.startKey}-01`),
            cell0
          )
          const eIdx = differenceInCalendarMonths(
            parseISO(`${drawCommit.endKey}-01`),
            cell0
          )
          return (
            <DrawCommitCard
              rowIncome={drawCommit.rowIncome}
              startKey={drawCommit.startKey}
              endKey={drawCommit.endKey}
              detectedCategory={drawCommit.detectedCategory}
              startIdx={sIdx}
              endIdx={eIdx}
              cellsLength={cells.length}
              subMonthFraction={subMonthFraction}
              onReshape={onDraftReshape}
              onSave={onDrawSave}
              onDiscard={onDrawDiscard}
            />
          )
        })()}

      {/* Floating edit toggle — portaled to document.body so it's anchored to
          the viewport (the page content sits inside a `contain: layout paint`
          wrapper that would otherwise capture `position: fixed`). Stacks just
          above the global "?" help button (bottom-24 / md:bottom-6). */}
      {onToggleEditMode && (
        <FloatingEditButton editMode={editMode} onToggle={onToggleEditMode} />
      )}
    </div>
  )
}

// Edit-mode toggle for the Timeline Studio. Joins the shared bottom-right FAB
// stack at order 20, so it sits above the help button (and the add FAB when
// that's visible) without any hand-tuned offsets. Brighter/filled when edit
// mode is on so the on/off state reads at a glance, matching the canvas's
// edit-mode highlight.
function FloatingEditButton({
  editMode,
  onToggle
}: {
  editMode: boolean
  onToggle: () => void
}) {
  return (
    <Fab order={20}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={editMode}
        aria-label={editMode ? "Exit edit mode" : "Enter edit mode"}
        className={cn(
          "inline-flex h-12 items-center gap-2 rounded-full px-5 text-xs font-semibold tracking-wider uppercase shadow-lg backdrop-blur-sm transition-colors",
          editMode
            ? "bg-brand-terracotta hover:bg-brand-terracotta/90 ring-brand-terracotta/40 text-white ring-2"
            : "border-border/40 bg-background/95 text-foreground hover:bg-accent border"
        )}>
        <Pencil className="size-4" />
        {editMode ? "Editing…" : "Edit"}
      </button>
    </Fab>
  )
}

const RIVER_BUFFER_MONTHS = 3

/**
 * Monotone cubic spline (Fritsch-Carlson) — same curve type Recharts uses
 * with `type="monotone"`. Produces smooth curves through the points without
 * overshoot, so flat segments stay flat and step transitions ease in/out.
 */
function buildMonotonePath(points: Array<{ x: number; y: number }>): string {
  const n = points.length
  if (n === 0) return ""
  if (n === 1) return `M ${points[0].x} ${points[0].y}`

  // Secant slopes
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x
    const dy = points[i + 1].y - points[i].y
    m.push(dx === 0 ? 0 : dy / dx)
  }

  // Tangents (Fritsch-Carlson)
  const t: number[] = new Array(n)
  t[0] = m[0]
  t[n - 1] = m[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0
    } else {
      t[i] = (m[i - 1] + m[i]) / 2
    }
  }
  // Enforce monotonicity
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0
      t[i + 1] = 0
    } else {
      const alpha = t[i] / m[i]
      const beta = t[i + 1] / m[i]
      const sum = alpha * alpha + beta * beta
      if (sum > 9) {
        const tau = 3 / Math.sqrt(sum)
        t[i] = tau * alpha * m[i]
        t[i + 1] = tau * beta * m[i]
      }
    }
  }

  // Cubic Bezier segments
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x
    const cp1x = points[i].x + dx / 3
    const cp1y = points[i].y + (t[i] * dx) / 3
    const cp2x = points[i + 1].x - dx / 3
    const cp2y = points[i + 1].y - (t[i + 1] * dx) / 3
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i + 1].x} ${points[i + 1].y}`
  }
  return d
}

// Eases a scalar toward its target over a few frames so values that otherwise
// change in discrete steps (the river's peak as spikes scroll in/out, the
// month-count as the SCALE slider moves) animate smoothly instead of snapping.
function useEasedValue(
  target: number,
  factor: number = 0.2,
  epsilon: number = 0.5
): number {
  const [value, setValue] = useState(target)
  const current = useRef(target)
  const rafRef = useRef(0)
  useEffect(() => {
    const tick = () => {
      const delta = target - current.current
      if (Math.abs(delta) < epsilon) {
        current.current = target
        setValue(target)
        return
      }
      current.current += delta * factor
      setValue(current.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, factor, epsilon])
  return value
}

interface RiverChartProps {
  cells: MonthCell[]
  totals: Array<{
    cell: MonthCell
    total: number
    breakdown: Array<{ income: Income; amount: number }>
  }>
  peakTotal: number
  hoverIndex: number | null
  incomes: Income[]
  isMobile?: boolean
}

const RiverChart = memo(function RiverChart({
  cells,
  totals,
  peakTotal,
  hoverIndex,
  incomes,
  isMobile = false
}: RiverChartProps) {
  const width = 1080
  const height = 160

  // Ease the month-count (driven by the SCALE slider) so the curve morphs/
  // recompresses smoothly instead of snapping when the duration changes.
  const displayCellCount = useEasedValue(cells.length, 0.22, 0.03)
  const stepX = width / Math.max(1, displayCellCount - 1)

  // Ease the peak so the vertical scale glides as tall months (e.g. bonus
  // spikes) scroll into and out of the visible window, rather than jumping.
  const displayPeak = useEasedValue(
    peakTotal,
    0.18,
    Math.max(peakTotal * 0.002, 1)
  )

  const yFor = (val: number) => {
    if (displayPeak <= 0) return height - 4
    return height - 4 - (val / displayPeak) * (height - 24)
  }

  // Extend the path with buffer months on each side so the visible portion
  // never reaches a hard endpoint as the timeline scrolls. The SVG sets
  // overflow:visible so the buffer renders beyond the viewBox; the parent's
  // overflow-hidden + edge-fade mask handles the actual visual cropping.
  const buffer = RIVER_BUFFER_MONTHS
  const extendedTotals = useMemo(() => {
    if (cells.length === 0) return [] as Array<{ x: number; y: number }>
    const beforeCells = Array.from({ length: buffer }, (_, k) => {
      const d = addMonths(cells[0].date, -(buffer - k))
      return {
        date: d,
        key: format(d, "yyyy-MM"),
        label: format(d, "MMM"),
        yearLabel: format(d, "yy")
      } satisfies MonthCell
    })
    const afterCells = Array.from({ length: buffer }, (_, k) => {
      const d = addMonths(cells[cells.length - 1].date, k + 1)
      return {
        date: d,
        key: format(d, "yyyy-MM"),
        label: format(d, "MMM"),
        yearLabel: format(d, "yy")
      } satisfies MonthCell
    })
    const allCells = [...beforeCells, ...cells, ...afterCells]
    return allCells.map((c, idx) => {
      const isVisible = idx >= buffer && idx < buffer + cells.length
      const total = isVisible
        ? totals[idx - buffer].total
        : incomes.reduce((sum, inc) => sum + getAmountForMonth(inc, c), 0)
      const x = (idx - buffer) * stepX
      return { x, y: yFor(total) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, totals, displayPeak, displayCellCount, incomes])

  if (extendedTotals.length === 0) return null

  const path = buildMonotonePath(extendedTotals)
  const fillStartX = extendedTotals[0].x
  const fillEndX = extendedTotals[extendedTotals.length - 1].x
  const fill = `${path} L ${fillEndX} ${height} L ${fillStartX} ${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
      className={cn("w-full", isMobile ? "h-20" : "h-40")}
      aria-hidden>
      <defs>
        <linearGradient id="river-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3A6B52" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#3A6B52" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#river-fill)" />
      <path
        d={path}
        fill="none"
        stroke="#3A6B52"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {hoverIndex !== null && totals[hoverIndex] && (
        <>
          <line
            x1={hoverIndex * stepX}
            x2={hoverIndex * stepX}
            y1={0}
            y2={height}
            stroke="hsl(var(--foreground) / 0.20)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <circle
            cx={hoverIndex * stepX}
            cy={yFor(totals[hoverIndex].total)}
            r={5}
            fill="#FFFFFF"
            stroke="#3A6B52"
            strokeWidth={2}
          />
        </>
      )}
    </svg>
  )
})

interface MonthAxisProps {
  cells: MonthCell[]
  hoverIndex: number | null
  onHover: (i: number | null) => void
  totals: Array<{
    cell: MonthCell
    total: number
    breakdown: Array<{ income: Income; amount: number }>
  }>
}

const MonthAxis = memo(function MonthAxis({
  cells,
  hoverIndex,
  onHover,
  totals: _totals
}: MonthAxisProps) {
  const yearSegments = useMemo(() => buildYearSegments(cells), [cells])
  const gridCols = {
    gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`
  } as React.CSSProperties
  // The timeline only spans ~250-360px on a phone, so each month cell is far
  // narrower than a "MMM" label and the month row collapses into a smear. Detect
  // the narrow viewport and drop to a coarser label stride much earlier.
  const isNarrow = useMediaQuery("(max-width: 640px)")
  // Density throttle: at higher zoom-out (or any width on mobile) the per-cell
  // width shrinks below the label width, so we drop labels on a stride. Cells
  // still render to keep the grid + tick alignment intact; only the text is
  // hidden. Stride is anchored to month-of-year (cell.month % stride === 0)
  // instead of array index so the visible months don't shift as the user pans.
  const labelStride = (() => {
    if (isNarrow) {
      if (cells.length <= 12) return 1 // ≤1y: every month still fits
      if (cells.length <= 30) return 3 // ≤2.5y: quarterly (Jan/Apr/Jul/Oct)
      if (cells.length <= 60) return 6 // ≤5y: half-yearly (Jan/Jul)
      return 12 // year markers only (Jan)
    }
    if (cells.length <= 30) return 1 // ≤ ~2.5y: every month
    if (cells.length <= 60) return 3 // ≤ 5y: quarterly (Jan/Apr/Jul/Oct)
    if (cells.length <= 90) return 6 // ≤ 7.5y: half-yearly (Jan/Jul)
    return 12 // 10y: year markers only (Jan)
  })()
  return (
    <div className="relative mt-2">
      {/* Year strip — one label per contiguous calendar-year span, sized to
          its month range via grid-column. Same column template as the month
          row below so labels stay aligned with their months. */}
      <div
        className="text-muted-foreground/70 mb-0.5 grid text-[9px] font-bold tracking-[0.22em] uppercase"
        style={gridCols}>
        {yearSegments.map((seg) => (
          <div
            key={`${seg.year}-${seg.startIndex}`}
            className="flex items-center justify-center py-1"
            style={{
              gridColumn: `${seg.startIndex + 1} / span ${seg.spanCount}`
            }}>
            {seg.year}
          </div>
        ))}
      </div>
      <div
        className="text-muted-foreground grid gap-px text-[10px] font-semibold tracking-wider uppercase"
        style={gridCols}>
        {cells.map((cell, i) => {
          const showLabel =
            labelStride === 1 || cell.date.getMonth() % labelStride === 0
          return (
            <div
              key={cell.key}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
              className={cn(
                "relative flex cursor-default flex-col items-center gap-1 rounded py-1.5 transition-colors",
                hoverIndex === i && "bg-muted text-foreground"
              )}>
              <div className="via-brand-jungle/50 h-px w-full bg-gradient-to-r from-transparent to-transparent" />
              <span className={cn(!showLabel && "invisible")}>
                {cell.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

function HoverTooltip({
  index,
  cell,
  breakdown,
  total,
  totalCount,
  editMode = false,
  onEditIncome,
  onKeepAlive
}: {
  index: number
  cell: MonthCell
  breakdown: Array<{ income: Income; amount: number }>
  total: number
  totalCount: number
  editMode?: boolean
  onEditIncome?: (incomeId: string, monthKey: string) => void
  // Re-assert / clear the hovered column so the tooltip stays open while the
  // pointer is over it (otherwise leaving the axis cell would hide it before
  // the user can click an edit button).
  onKeepAlive?: (i: number | null) => void
}) {
  // Center the tooltip on the hovered column. At the edges, snap to the
  // visible side so the card doesn't get clipped by the rack edge.
  const centerPct = ((index + 0.5) / totalCount) * 100
  const align =
    centerPct < 15
      ? "translate-x-0"
      : centerPct > 85
        ? "-translate-x-full"
        : "-translate-x-1/2"

  // Pencil edit buttons are interactive, so in edit mode the card must accept
  // pointer events (the overlay wrapper is pointer-events-none). We keep the
  // tooltip alive while hovered so the user can reach the buttons.
  const interactive = editMode && Boolean(onEditIncome)

  return (
    <div
      className={cn(
        "border-border/40 bg-popover text-popover-foreground absolute z-30 w-56 rounded-xl border px-4 py-3 shadow-xl",
        interactive ? "pointer-events-auto" : "pointer-events-none",
        align
      )}
      style={{ left: `${centerPct}%`, top: "12px" }}
      onMouseEnter={interactive ? () => onKeepAlive?.(index) : undefined}
      onMouseLeave={interactive ? () => onKeepAlive?.(null) : undefined}>
      <p className="font-display text-sm font-semibold">
        {format(cell.date, "MMM yy")}
      </p>
      <div className="border-border/40 mt-2 space-y-1.5 border-t pt-2">
        {breakdown.length === 0 ? (
          <p className="text-muted-foreground text-xs">No income this month</p>
        ) : (
          breakdown.map(({ income, amount }, i) => {
            // Bonus rows are synthetic (id suffixed with "__bonus") — they
            // aren't directly editable, so no pencil for them.
            const isBonusRow = income.id.endsWith("__bonus")
            return (
              <div
                key={`${income.id}-${i}`}
                className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{
                      backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length]
                    }}
                  />
                  {income.name}
                </span>
                <span className="flex items-center gap-1">
                  <span className="font-display font-medium">
                    {formatCurrency(amount)}
                  </span>
                  {interactive && !isBonusRow && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEditIncome?.(income.id, cell.key)}
                      className="text-muted-foreground hover:bg-muted hover:text-brand-jungle"
                      aria-label={`Adjust ${income.name} from ${format(cell.date, "MMMM yyyy")}`}>
                      <Pencil className="size-3" />
                    </Button>
                  )}
                </span>
              </div>
            )
          })
        )}
      </div>
      <div className="border-border/40 mt-2 flex items-center justify-between border-t pt-2">
        <span className="text-brand-jungle text-xs font-semibold tracking-wider uppercase">
          Total
        </span>
        <span className="font-display text-brand-jungle text-sm font-semibold">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  )
}

// Floating popup card that appears after the user finishes drawing a new
// bar with the pencil tool. Positioned absolutely near the cursor's
// pointerup location (offset above the bar so it doesn't block the bar
// itself). Form is intentionally minimal — name + amount only — with
// optional current/past toggle when the detection rule couldn't decide.
function DrawCommitCard({
  rowIncome,
  startKey,
  endKey,
  detectedCategory,
  startIdx,
  endIdx,
  cellsLength,
  subMonthFraction,
  onReshape,
  onSave,
  onDiscard
}: {
  rowIncome: Income
  startKey: string
  endKey: string
  detectedCategory: "past" | "current" | "future" | "unknown"
  // The bar's exact viewport coords are derived live from the lane DOM and
  // these cell-index inputs, so the popup tracks the bar through scroll +
  // resize instead of getting stranded at its pointerup-time snapshot.
  startIdx: number
  endIdx: number
  cellsLength: number
  subMonthFraction: number
  // Reshapes the draft: updates BOTH the dashed bar and this popup live, so
  // changing a month picker moves the bar before save (same path the bar's
  // drag-resize handles use).
  onReshape?: (startKey: string, endKey: string) => void
  onSave: (data: {
    name: string
    amount: number
    isCurrent: boolean | null
    isPermanent: boolean
  }) => void
  onDiscard: () => void
}) {
  const [name, setName] = useState(rowIncome.name)
  const [amount, setAmount] = useState<string>(rowIncome.amount ?? "")
  const [isCurrent, setIsCurrent] = useState(false)
  // Permanent → no end date (the bar runs into perpetuity). Temporary → keep
  // the drawn start/end. Default mirrors the prior behaviour: an ongoing
  // ("current") draw was already end-less, everything else was bounded.
  const [isPermanent, setIsPermanent] = useState(detectedCategory === "current")
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [startCalOpen, setStartCalOpen] = useState(false)
  const [endCalOpen, setEndCalOpen] = useState(false)

  // Imperative position loop. The popup is a fixed-position element that
  // must stay glued to the drawn bar through every kind of motion:
  //   - browser window scroll (vertical or horizontal)
  //   - the timeline's *internal* horizontal-shift state (no scroll event
  //     fires for those — the bar reflows via React state)
  //   - window resize, card height change
  // We bypass React state for the position math because state updates can
  // be batched, dropped, or short-circuited by referential-equality bail-
  // outs. Direct DOM writes on every animation frame are the simplest
  // bulletproof approach. The loop runs only while the popup is mounted.
  const cardRef = useRef<HTMLDivElement | null>(null)
  const tailRef = useRef<HTMLSpanElement | null>(null)
  useLayoutEffect(() => {
    let rafId = 0
    const TAIL_H = 10
    const SAFE_PAD = 12
    const tick = () => {
      const card = cardRef.current
      const tail = tailRef.current
      // Query the dashed draft bar directly. Its rect IS the source of
      // truth for "where the bar is right now" — much more reliable than
      // computing from the lane's center, which is wrong when the lane is
      // expanded for vertical stacking (the bar lives at 75% of the lane,
      // not 50%).
      const bar = document.querySelector(
        '[data-draft-bar="true"]'
      ) as HTMLElement | null
      if (card && tail && bar) {
        const br = bar.getBoundingClientRect()
        if (br.width > 0) {
          const cr = card.getBoundingClientRect()
          const barCenterX = br.left + br.width / 2
          const barTopY = br.top
          const barBottomY = br.bottom
          const cardW = cr.width
          const cardH = cr.height
          const winW = window.innerWidth
          const winH = window.innerHeight
          // Above-the-bar preferred: card bottom = bar top − TAIL_H, so the
          // tail tip lands exactly on the bar's top edge. Flip below if
          // there's no room above.
          const aboveTop = barTopY - TAIL_H - cardH
          const placeAbove = aboveTop >= SAFE_PAD
          const top = placeAbove
            ? aboveTop
            : Math.min(winH - cardH - SAFE_PAD, barBottomY + TAIL_H)
          const idealLeft = barCenterX - cardW / 2
          // Keep the card horizontally within the timeline studio card, not the
          // whole viewport — so it can never slide left over the app's left
          // navigation (#B). Fall back to the viewport if the studio is somehow
          // narrower than the card (e.g. very small screens).
          const studio = document.querySelector(
            '[data-timeline-studio="true"]'
          ) as HTMLElement | null
          const sr = studio?.getBoundingClientRect()
          let minLeft = SAFE_PAD
          let maxLeft = winW - cardW - SAFE_PAD
          if (sr && sr.right - sr.left - 2 * SAFE_PAD >= cardW) {
            minLeft = sr.left + SAFE_PAD
            maxLeft = sr.right - cardW - SAFE_PAD
          }
          const left = Math.max(minLeft, Math.min(maxLeft, idealLeft))
          // Clamp the tail well inside the card's flat edge — past the rounded
          // corners (radius ~16px + the tail's 10px half-width) — so it always
          // reads as attached to the body instead of floating off a corner (#A).
          const TAIL_INSET = 26
          const tailX = Math.max(
            TAIL_INSET,
            Math.min(cardW - TAIL_INSET, barCenterX - left)
          )

          // Card placement.
          card.style.left = `${left}px`
          card.style.top = `${top}px`
          card.style.visibility = "visible"
          card.style.opacity = "1"
          card.style.pointerEvents = "auto"

          // Tail placement + direction. Mirror the CSS-triangle config we
          // had statically before, but keyed off live placeAbove.
          tail.style.left = `${tailX}px`
          if (placeAbove) {
            tail.style.top = ""
            tail.style.bottom = `${-TAIL_H}px`
            tail.style.borderTop = `${TAIL_H}px solid hsl(var(--card))`
            tail.style.borderBottom = ""
            tail.style.filter = "drop-shadow(0 1px 0 hsl(var(--border) / 0.4))"
          } else {
            tail.style.top = `${-TAIL_H}px`
            tail.style.bottom = ""
            tail.style.borderBottom = `${TAIL_H}px solid hsl(var(--card))`
            tail.style.borderTop = ""
            tail.style.filter = "drop-shadow(0 -1px 0 hsl(var(--border) / 0.4))"
          }
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [rowIncome.id, startIdx, endIdx, cellsLength, subMonthFraction])

  // Click-away detection. The dashed draft bar itself represents unsaved
  // work, so:
  //   - Clicks on the bar (or its drag handles) count as *inside* — they're
  //     the user repositioning, not abandoning. Without this exemption,
  //     starting any drag would fire click-outside → discard → bar vanishes
  //     mid-drag.
  //   - Clicks anywhere else always surface the save-or-discard prompt,
  //     regardless of whether the form fields are dirty. The bar is data;
  //     never discard silently.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const card = cardRef.current
      if (!card) return
      if (card.contains(e.target as Node)) return
      const target = e.target as HTMLElement | null
      if (target?.closest('[data-draft-bar="true"]')) return
      setConfirmDiscard(true)
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [onDiscard])

  const handleSave = () => {
    const parsedAmount = parseFloat(amount)
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return
    onSave({
      name: name.trim(),
      amount: parsedAmount,
      isCurrent: detectedCategory === "unknown" ? isCurrent : null,
      isPermanent
    })
  }

  // Month pickers use the app-standard Popover + Calendar (matching the income
  // creator drawer) rather than native <select>s, so the user can navigate to
  // any month — including far in the past — not just the visible window.
  // Changing a date clamps so start never passes end, then pushes through
  // onReshape, which moves the dashed bar live (auto-scrolling the timeline if
  // the pick lands off-window) and keeps this popup's keys in sync — no save
  // required to preview.
  const startDate = parseISO(`${startKey}-01`)
  const endDate = parseISO(`${endKey}-01`)
  const handleStartPick = (d: Date | undefined) => {
    if (!d || !onReshape) return
    const newStart = format(startOfMonth(d), "yyyy-MM")
    const clampedEnd = newStart > endKey ? newStart : endKey
    onReshape(newStart, clampedEnd)
    setStartCalOpen(false)
  }
  const handleEndPick = (d: Date | undefined) => {
    if (!d || !onReshape) return
    const newEnd = format(startOfMonth(d), "yyyy-MM")
    const clampedStart = newEnd < startKey ? newEnd : startKey
    onReshape(clampedStart, newEnd)
    setEndCalOpen(false)
  }

  // Portal to document.body so the fixed-positioned card escapes any
  // ancestor with `contain: layout paint` / `transform` / `will-change`,
  // which would otherwise become its containing block and offset the
  // viewport-relative coordinates we compute. Body is the only safe
  // mounting point that's guaranteed to be the viewport.
  if (typeof document === "undefined") return null
  return createPortal(
    <>
      <div
        ref={cardRef}
        role="dialog"
        aria-label="New income"
        className="border-border/40 bg-card fixed z-50 w-[280px] rounded-2xl border p-4 shadow-2xl ring-1 ring-black/5"
        // Initial styles — left/top/visibility/opacity/pointerEvents are
        // assigned imperatively by the rAF loop above, which sees both card
        // and bar dimensions live. We start hidden so the first frame
        // (before measurement) doesn't flash an unpositioned card.
        style={{
          left: 0,
          top: 0,
          visibility: "hidden",
          opacity: 0,
          pointerEvents: "none"
        }}
        onPointerDown={(e) => e.stopPropagation()}>
        {/* Speech-bubble tail. The rAF loop sets left/top/bottom and the
            triangle border-color/direction live based on placement so the
            tip stays glued to the bar's top (above) or bottom (below). */}
        <span
          ref={tailRef}
          aria-hidden
          className="absolute"
          style={{
            width: 0,
            height: 0,
            transform: "translateX(-50%)",
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent"
          }}
        />
        <p className="text-muted-foreground text-[10px] font-bold tracking-[0.18em] uppercase">
          New income
        </p>
        {onReshape ? (
          <>
            <div className="mt-2 flex items-center gap-1.5">
              <Popover open={startCalOpen} onOpenChange={setStartCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-display h-8 justify-start gap-1.5 px-2 text-xs"
                    aria-label="Start month">
                    <CalendarDays className="text-muted-foreground h-3.5 w-3.5" />
                    {format(startDate, "MMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <MonthYearPicker
                    value={startDate}
                    onChange={handleStartPick}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground" aria-hidden>
                →
              </span>
              {isPermanent ? (
                <span className="border-border/40 bg-muted/40 font-display text-muted-foreground inline-flex h-8 items-center rounded-md border px-2 text-xs">
                  Ongoing
                </span>
              ) : (
                <Popover open={endCalOpen} onOpenChange={setEndCalOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-display h-8 justify-start gap-1.5 px-2 text-xs"
                      aria-label="End month">
                      <CalendarDays className="text-muted-foreground h-3.5 w-3.5" />
                      {format(endDate, "MMM yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <MonthYearPicker value={endDate} onChange={handleEndPick} />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {/* Permanent (no end, runs forever) vs Temporary (bounded by end). */}
            <div
              role="group"
              aria-label="Income duration"
              className="bg-muted/50 mt-2 grid grid-cols-2 gap-1 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setIsPermanent(true)}
                aria-pressed={isPermanent}
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-semibold transition-colors",
                  isPermanent
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}>
                Permanent
              </button>
              <button
                type="button"
                onClick={() => setIsPermanent(false)}
                aria-pressed={!isPermanent}
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-semibold transition-colors",
                  !isPermanent
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}>
                Temporary
              </button>
            </div>
          </>
        ) : null}
        <label className="text-foreground mt-3 block text-xs font-semibold">
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-border/40 bg-background text-foreground focus:ring-brand-terracotta/40 mt-1 w-full rounded-md border px-2 py-1.5 text-sm font-normal focus:ring-2 focus:outline-none"
            placeholder="Income name"
          />
        </label>
        <label className="text-foreground mt-3 block text-xs font-semibold">
          Amount (monthly)
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border-border/40 bg-background text-foreground focus:ring-brand-terracotta/40 mt-1 w-full rounded-md border px-2 py-1.5 text-sm font-normal focus:ring-2 focus:outline-none"
            placeholder="0.00"
          />
        </label>
        {detectedCategory === "unknown" && (
          <label className="text-foreground mt-3 flex cursor-pointer items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="border-border/60 text-brand-terracotta focus:ring-brand-terracotta/40 h-3.5 w-3.5 rounded"
            />
            This is a current (ongoing) income
          </label>
        )}
        {detectedCategory !== "unknown" && (
          <p className="text-muted-foreground mt-2 text-[11px]">
            Will save as{" "}
            <em className="font-semibold capitalize not-italic">
              {isPermanent && detectedCategory === "past"
                ? "current"
                : detectedCategory}
            </em>{" "}
            income.
          </p>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            Discard
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={
              !name.trim() || !amount.trim() || parseFloat(amount) <= 0
            }>
            Save
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ve started filling in a new income but haven&apos;t saved
              yet. Save now or discard?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDiscard(false)}>
              Keep editing
            </AlertDialogCancel>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmDiscard(false)
                onDiscard()
              }}>
              Discard
            </Button>
            <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body
  )
}

interface IncomeStreamRowProps {
  // A "track" of one or more incomes belonging to the same family member that
  // do not overlap in time — packed by `packIntoTracks`. They share a single
  // visual lane: bars sit side-by-side at the same vertical level. When a
  // member's incomes don't overlap (e.g., past Salary Aug-Apr + Retainer
  // May-Dec), they all collapse into one row regardless of archetype.
  incomes: Income[]
  cells: MonthCell[]
  // Show gross amounts or net take-home (after employee CPF) on the bars.
  amountMode?: "gross" | "nett"
  // Sub-month scroll offset (0..1). Needed by the lane-level draw handlers
  // so they can map a viewport clientX → cells index across translateX.
  subMonthFraction?: number
  isFirst?: boolean
  // True if this row is the first within its family-member group. Drives
  // header rendering (only the first row in a group shows the family name)
  // and top-border suppression on subsequent rows in the same group.
  isFirstInGroup?: boolean
  // Header content for the left column. Null on subsequent rows in a
  // family-member group (the first row already drew the header above).
  familyMemberHeader?: {
    name: string
    relationship: string | null
    // Age at the focal (centre-of-viewport) month; null when unknown or for
    // the Unassigned row. Recomputed by the parent as the timeline scrolls.
    age?: number | null
    // Human-readable label for the focal month, e.g. "Dec 2026". Used as
    // a native tooltip on the age line so users know it's timeline-relative.
    focalMonthLabel?: string | null
  } | null
  // Family member this row belongs to (null = "Unassigned"). Used as the
  // draw context for the pencil tool and for popup name pre-fill.
  rowFamilyMemberId?: string | null
  alternate?: boolean
  tlConfig: TimelineConfig
  onAmountChange: (
    income: Income,
    amount: number,
    extra?: {
      accountForBonus?: boolean
      bonusGroups?: string | null
      subjectToCpf?: boolean
      familyMemberAge?: number
    }
  ) => void
  onSegmentAmountChange?: (
    income: Income,
    seg: BarSegment,
    amount: number,
    extra?: {
      accountForBonus?: boolean
      bonusGroups?: string | null
      subjectToCpf?: boolean
      familyMemberAge?: number
    }
  ) => void
  onEditSegmentPeriod?: (income: Income, seg: BarSegment) => void
  onRequestDelete: (income: Income) => void
  onOpenDetail: (id: string) => void
  onDragPreview: (
    preview: { id: string; patch: Partial<Income> } | null
  ) => void
  onMoveBar: (income: Income, deltaMonths: number) => void
  onResizeStart: (income: Income, deltaMonths: number) => void
  onResizeEnd: (income: Income, deltaMonths: number) => void
  // Edit mode — when true, the lane area accepts pointerdown-to-draw a new
  // bar AND existing bars become drag/resizable; otherwise the row is
  // read-only. drawState non-null means a draw is currently in progress for
  // this row.
  editMode?: boolean
  drawState?: { rowIncomeId: string; anchorKey: string; endKey: string } | null
  onDrawStart?: (income: Income, cellIdx: number) => void
  onDrawMove?: (income: Income, cellIdx: number) => void
  onDrawEnd?: (
    income: Income,
    cellIdx: number,
    viewportX: number,
    viewportY: number
  ) => void
  // Lateral drag of an existing draft bar. Called by the bar's resize-left,
  // resize-right, and body-move handles with the new keys to apply.
  onDraftReshape?: (newAnchorKey: string, newEndKey: string) => void
  // Tap (no drag) on the lane in edit mode → adjust an existing income from
  // that month. cellIndex is the clicked month within `cells`.
  onMonthClick?: (cellIndex: number) => void
}

type BarDragKind = "move" | "resize-left" | "resize-right"

// Captured at pointerdown and held constant for the entire drag. The drag
// math is anchored to the bar's *actual visible edge* (in viewport-X) — not
// to the cursor's click point — so snap-to-month fires when the cursor
// crosses the bar's half-month boundary regardless of where on the handle the
// user happened to click. This matches the resize behavior of every modern
// DAW (Logic, Ableton, Reaper, Pro Tools): the edge tracks the cursor, and
// the click offset within the handle is meaningless.
interface BarDragState {
  kind: BarDragKind
  monthWidthPx: number
  // Viewport-X of the bar's relevant edge at pointerdown. Left edge for
  // 'move' and 'resize-left'; right edge for 'resize-right'. Read from the
  // bar element's getBoundingClientRect, so it already accounts for the
  // timeline's translateX (sub-month scroll offset).
  edgeAnchorViewportX: number
  // For 'move' only: cursor offset from the bar's left edge at pointerdown,
  // in pixels. Preserved through the drag so the grab point stays under the
  // cursor (modulo snap). 0 for resize.
  grabOffsetPx: number
  // Snapshot of the income at pointerdown — *before* any drag preview is
  // applied. Critical: the row's `income` prop is the *previewed* income
  // during a drag (because the parent merges dragPreview into effectiveIncomes
  // and the row re-renders with the patched copy). If we passed that copy
  // through to the commit handler, the commit would apply the delta on top of
  // the preview's already-shifted dates, double-counting the move. Using
  // this snapshot keeps commit math anchored to where the bar actually was
  // when the user grabbed it.
  originalIncome: Income
  startStart: Date
  startEnd: Date | null
  // For the click-vs-drag threshold and the drag tooltip's screen position.
  startPointerX: number
  hasMoved: boolean
}

// While dragging, a small floating chip near the cursor shows the dates
// the bar will commit to. Same pattern as DAW clip-drag tooltips.
interface DragTooltip {
  x: number
  y: number
  text: string
}

const IncomeStreamRow = memo(function IncomeStreamRow({
  incomes,
  cells,
  amountMode = "gross",
  subMonthFraction = 0,
  isFirst = false,
  isFirstInGroup = true,
  familyMemberHeader = null,
  rowFamilyMemberId: _rowFamilyMemberId = null,
  alternate = false,
  tlConfig,
  onAmountChange,
  onSegmentAmountChange,
  onEditSegmentPeriod,
  onRequestDelete,
  onOpenDetail,
  onDragPreview,
  onMoveBar,
  onResizeStart,
  onResizeEnd,
  editMode = false,
  drawState = null,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  onDraftReshape,
  onMonthClick: _onMonthClick
}: IncomeStreamRowProps) {
  // Representative income for the draw context (drawing in this row carries
  // the row's familyMemberId). Prefer the current/recurring income if any —
  // its archetype drives the past/current/future detection in handleDrawEnd.
  // Otherwise the first income works; with zero incomes (a ghost row) the
  // single placeholder is the representative.
  const primary =
    incomes.find((i) => getArchetype(i) === "recurring") ?? incomes[0]

  // Bonus markers for this row. When any income here pays a bonus inside the
  // visible window the lane grows taller and stacks: parent bar on the upper
  // line, bonus pills on the lower line (with a connector linking them).
  const bonusBarsByIncome = useMemo(
    () =>
      incomes.map((inc) => ({ income: inc, bars: buildBonusBars(inc, cells) })),
    [incomes, cells]
  )
  const rowHasBonus = bonusBarsByIncome.some((b) => b.bars.length > 0)

  const lanesAreaRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<BarDragState | null>(null)
  const [dragTooltip, setDragTooltip] = useState<DragTooltip | null>(null)
  // Set on pointerup if drag occurred — used to suppress the synthetic click
  // event so the QuickAdjustPad popover doesn't open after a drag.
  const justDraggedRef = useRef(false)
  // Controlled open state for bar-segment and bonus popovers so onConfirm
  // can close the popup and let the optimistic update render immediately.
  const [openPopupKey, setOpenPopupKey] = useState<string | null>(null)

  // Does the in-progress draft bar's date range intersect ANY income on this
  // track? If yes, we expand the lane and stack the bars vertically (top
  // half = existing, bottom half = draft) so they don't visually collide.
  // Behaves like a video editor splitting a clip onto a second track.
  const draftStacked =
    !!drawState &&
    (() => {
      const lo =
        drawState.anchorKey < drawState.endKey
          ? drawState.anchorKey
          : drawState.endKey
      const hi =
        drawState.anchorKey > drawState.endKey
          ? drawState.anchorKey
          : drawState.endKey
      return incomes.some((income) => {
        const sKey = format(startOfMonth(parseISO(income.startDate)), "yyyy-MM")
        const eKey = income.endDate
          ? format(startOfMonth(parseISO(income.endDate)), "yyyy-MM")
          : "9999-99"
        return lo <= eKey && hi >= sKey
      })
    })()

  // Vertical placement inside an expanded (h-20) lane, which has two sub-lines
  // (~25% upper, ~75% lower). Three layouts:
  //   - mid-draft over an existing bar: existing bar upper, draft bar lower.
  //   - has bonuses (not drafting): bonus pills sit ABOVE the parent bar (#J) —
  //     pills upper, parent bar + its label lower.
  //   - neither: everything centered.
  const bonusAbove = rowHasBonus && !draftStacked
  const barTopClass = draftStacked
    ? "top-[25%]"
    : bonusAbove
      ? "top-[75%]"
      : "top-1/2"
  const bonusTopClass = bonusAbove ? "top-[25%]" : "top-[75%]"

  // Lateral drag of the dashed draft bar. The user can grab the body
  // (move) or either edge (resize-left / resize-right). All three call
  // onDraftReshape with new (anchorKey, endKey) keys; the parent updates
  // both drawState and drawCommit so the popup follows.
  type DraftDragKind = "move" | "resize-left" | "resize-right"
  const draftDragRef = useRef<{
    kind: DraftDragKind
    pointerStartCellIdx: number
    origAnchorKey: string
    origEndKey: string
    hasMoved: boolean
    startPointerX: number
  } | null>(null)

  const handleDraftPointerDown = (
    e: React.PointerEvent,
    kind: DraftDragKind
  ) => {
    if (!drawState || !onDraftReshape) return
    if (e.pointerType === "mouse" && e.button !== 0) return
    e.stopPropagation()
    const lane = lanesAreaRef.current
    if (!lane) return
    const rect = lane.getBoundingClientRect()
    const monthWidthPx = rect.width / cells.length
    const cursorIdx = Math.floor(
      (e.clientX - rect.left) / monthWidthPx + subMonthFraction
    )
    draftDragRef.current = {
      kind,
      pointerStartCellIdx: cursorIdx,
      origAnchorKey: drawState.anchorKey,
      origEndKey: drawState.endKey,
      hasMoved: false,
      startPointerX: e.clientX
    }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const handleDraftPointerMove = (e: React.PointerEvent) => {
    const drag = draftDragRef.current
    if (!drag || !onDraftReshape) return
    e.stopPropagation()
    const lane = lanesAreaRef.current
    if (!lane) return
    const rect = lane.getBoundingClientRect()
    const monthWidthPx = rect.width / cells.length
    const cursorIdx = Math.floor(
      (e.clientX - rect.left) / monthWidthPx + subMonthFraction
    )
    const deltaMonths = cursorIdx - drag.pointerStartCellIdx
    if (Math.abs(e.clientX - drag.startPointerX) > 4) drag.hasMoved = true
    const shift = (k: string, m: number) =>
      format(addMonths(parseISO(`${k}-01`), m), "yyyy-MM")
    const lo =
      drag.origAnchorKey < drag.origEndKey
        ? drag.origAnchorKey
        : drag.origEndKey
    const hi =
      drag.origAnchorKey > drag.origEndKey
        ? drag.origAnchorKey
        : drag.origEndKey
    let newAnchor = drag.origAnchorKey
    let newEnd = drag.origEndKey
    if (drag.kind === "move") {
      newAnchor = shift(drag.origAnchorKey, deltaMonths)
      newEnd = shift(drag.origEndKey, deltaMonths)
    } else if (drag.kind === "resize-left") {
      let next = shift(lo, deltaMonths)
      if (next > hi) next = hi
      newAnchor = next
      newEnd = hi
    } else {
      // resize-right
      let next = shift(hi, deltaMonths)
      if (next < lo) next = lo
      newAnchor = lo
      newEnd = next
    }
    onDraftReshape(newAnchor, newEnd)
  }

  const handleDraftPointerUp = (e: React.PointerEvent) => {
    if (!draftDragRef.current) return
    e.stopPropagation()
    draftDragRef.current = null
  }

  // Snap rule. Two rules in play because they're optimal for different
  // gestures:
  //   - 'move' uses Math.round (nearest-cell snap from the grab point). The
  //     grab offset preserves the user's pinch-point on the bar, so we want
  //     symmetric half-cell hysteresis around it. Floor here would cause
  //     1-pixel cursor jitter to flip the bar a full month whenever the grab
  //     point lands near a cell boundary.
  //   - 'resize-*' uses Math.floor (the cell containing the cursor wins).
  //     The user's mental model when dragging an edge is "cursor in March, so
  //     bar ends in March" — floor matches that. Round would require the
  //     cursor to cross half the cell past the bar's edge before snapping,
  //     which feels laggy and is the "jumps to a wrong month" complaint.
  // The +1 on resize-right is because the bar's right edge sits on gridline
  // (endIndex+1), one past the last included cell.
  const computeDeltaMonths = (clientX: number) => {
    const drag = dragRef.current
    if (!drag) return 0
    const distance =
      (clientX - drag.edgeAnchorViewportX - drag.grabOffsetPx) /
      drag.monthWidthPx
    if (drag.kind === "move") return Math.round(distance)
    if (drag.kind === "resize-right") return Math.floor(distance) + 1
    return Math.floor(distance)
  }

  const computePatch = (
    kind: BarDragKind,
    deltaMonths: number
  ): Partial<Income> => {
    const drag = dragRef.current
    if (!drag) return {}
    if (kind === "move") {
      const newStart = addMonths(drag.startStart, deltaMonths)
      const newEnd = drag.startEnd
        ? addMonths(drag.startEnd, deltaMonths)
        : null
      // Shift any milestone targetMonths by the same delta — otherwise the
      // amount-change boundary stays at its original calendar month while
      // the bar slides past, fragmenting the preview into wrong-colored
      // segments. Read milestones from the original snapshot, not the row's
      // current `income` prop (which has already been preview-shifted).
      const milestones = safeParseMilestones(
        drag.originalIncome.futureMilestones
      )
      const shifted = milestones.map((m) => ({
        ...m,
        targetMonth: format(
          addMonths(parseISO(`${m.targetMonth}-01`), deltaMonths),
          "yyyy-MM"
        )
      }))
      const futureMilestones =
        shifted.length > 0 ? JSON.stringify(shifted) : null
      return {
        startDate: format(newStart, "yyyy-MM-dd"),
        endDate: newEnd ? format(newEnd, "yyyy-MM-dd") : null,
        futureMilestones
      }
    }
    if (kind === "resize-left") {
      let newStart = addMonths(drag.startStart, deltaMonths)
      if (drag.startEnd && newStart > drag.startEnd) newStart = drag.startEnd
      return { startDate: format(newStart, "yyyy-MM-dd") }
    }
    // resize-right
    const baseEnd = drag.startEnd ?? drag.startStart
    let newEnd = addMonths(baseEnd, deltaMonths)
    if (newEnd < drag.startStart) newEnd = drag.startStart
    return { endDate: format(newEnd, "yyyy-MM-dd") }
  }

  const formatTooltip = (kind: BarDragKind, deltaMonths: number) => {
    const drag = dragRef.current
    if (!drag) return ""
    if (kind === "resize-left") {
      const newStart = addMonths(drag.startStart, deltaMonths)
      return format(newStart, "MMM yyyy")
    }
    if (kind === "resize-right") {
      const baseEnd = drag.startEnd ?? drag.startStart
      const newEnd = addMonths(baseEnd, deltaMonths)
      return format(newEnd, "MMM yyyy")
    }
    // move — show the date range
    const newStart = addMonths(drag.startStart, deltaMonths)
    if (!drag.startEnd) return format(newStart, "MMM yyyy")
    const newEnd = addMonths(drag.startEnd, deltaMonths)
    return `${format(newStart, "MMM yyyy")} → ${format(newEnd, "MMM yyyy")}`
  }

  const handlePointerDown = (
    e: React.PointerEvent,
    kind: BarDragKind,
    forIncome: Income
  ) => {
    // Only primary button / single touch
    if (e.pointerType === "mouse" && e.button !== 0) return
    // Edit mode gate — view mode is read-only, no drag/resize.
    if (!editMode) return
    e.stopPropagation()
    const lane = lanesAreaRef.current
    if (!lane) return
    // For 'move', currentTarget is the bar's segment <button>. For 'resize-*',
    // currentTarget is the handle <span>, whose parentElement is the segment
    // button. Either way, we want the segment button's rendered rect — that's
    // the source of truth for the bar's visible edge in viewport coordinates,
    // accounting for any translateX from sub-month scrolling.
    const target = e.currentTarget as HTMLElement
    const barEl = kind === "move" ? target : target.parentElement
    if (!barEl) return
    const barRect = barEl.getBoundingClientRect()
    const monthWidthPx = lane.clientWidth / cells.length
    const edgeAnchorViewportX =
      kind === "resize-right" ? barRect.right : barRect.left
    const grabOffsetPx = kind === "move" ? e.clientX - edgeAnchorViewportX : 0
    dragRef.current = {
      kind,
      monthWidthPx,
      edgeAnchorViewportX,
      grabOffsetPx,
      originalIncome: forIncome,
      startStart: parseISO(forIncome.startDate),
      startEnd: forIncome.endDate ? parseISO(forIncome.endDate) : null,
      startPointerX: e.clientX,
      hasMoved: false
    }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startPointerX
    // 8px is the standard click-vs-drag threshold (Apple HIG / Material).
    // We deliberately suppress the live preview, the drag tooltip, AND the
    // column highlight until the user has *intentionally* dragged. Otherwise
    // the floor-based resize snap would visibly fire a month on accidental
    // 1-2px jitter at the moment of click.
    if (Math.abs(dx) > 8) drag.hasMoved = true
    if (!drag.hasMoved) return
    const deltaMonths = computeDeltaMonths(e.clientX)
    onDragPreview({
      id: drag.originalIncome.id,
      patch: computePatch(drag.kind, deltaMonths)
    })
    setDragTooltip({
      x: e.clientX,
      y: e.clientY,
      text: formatTooltip(drag.kind, deltaMonths)
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const moved = drag.hasMoved
    const deltaMonths = moved ? computeDeltaMonths(e.clientX) : 0
    dragRef.current = null
    onDragPreview(null)
    setDragTooltip(null)
    if (moved && deltaMonths !== 0) {
      justDraggedRef.current = true
      // Pass the snapshot, not the closure's `income` (which is previewed).
      // See note on BarDragState.originalIncome.
      const original = drag.originalIncome
      if (drag.kind === "move") onMoveBar(original, deltaMonths)
      else if (drag.kind === "resize-left") onResizeStart(original, deltaMonths)
      else if (drag.kind === "resize-right") onResizeEnd(original, deltaMonths)
    }
  }

  const handlePointerCancel = () => {
    if (!dragRef.current) return
    dragRef.current = null
    onDragPreview(null)
    setDragTooltip(null)
  }

  // Suppress popover open when click is the tail of a drag.
  const handleClickCapture = (e: React.MouseEvent) => {
    if (justDraggedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      justDraggedRef.current = false
    }
  }

  return (
    <div
      style={{ gridTemplateColumns: `${tlConfig.headerPx}px 1fr` }}
      className={cn(
        "group relative grid items-stretch transition-colors",
        // Top border separates *family-member groups* — within a group the
        // rows visually merge into one expanded row with stacked bars.
        !isFirst && isFirstInGroup && "border-border/20 border-t",
        alternate ? "bg-muted/25" : "bg-transparent",
        "hover:bg-brand-jungle/[0.04]"
      )}>
      {/* Track header column. The family member name appears once per group
          (on the first row in the group). When the row carries a single
          income we also surface its archetype label + edit/delete shortcuts.
          When the row carries multiple non-overlapping incomes (a packed
          track), the per-income chip is dropped — bar colors carry the
          archetype info and per-bar popovers + the detail dialog cover edit
          actions, so duplicating them in the header would be noise. */}
      <div className="border-border/30 flex min-w-0 flex-col justify-center gap-0.5 border-r px-2 py-1 sm:px-4 sm:py-1.5">
        {familyMemberHeader && (
          <>
            <p className="font-display text-foreground truncate text-sm font-semibold">
              {familyMemberHeader.name}
              {familyMemberHeader.relationship && (
                <span className="text-muted-foreground ml-1 text-[10px] font-medium tracking-wider uppercase">
                  · {familyMemberHeader.relationship}
                </span>
              )}
            </p>
            {/* Age at the focal (centre-of-viewport) month — its own short line
                so it never clips the name/relationship line (#16). */}
            {typeof familyMemberHeader.age === "number" && (
              <p
                className="font-display text-muted-foreground/75 text-[10px] leading-none font-medium tabular-nums"
                title={
                  familyMemberHeader.focalMonthLabel
                    ? `Age as of ${familyMemberHeader.focalMonthLabel}`
                    : undefined
                }>
                Age {familyMemberHeader.age}
              </p>
            )}
          </>
        )}
        {/* Skip the archetype label + edit/delete shortcuts on ghost rows
            (empty member lanes that only exist so you can draw a first income).
            They have no real income, so a "TEMPORARY" tag and a delete button
            there are misleading (#H/#L). */}
        {incomes.length === 1 &&
          incomes[0].userId !== "_ghost" &&
          (() => {
            const income = incomes[0]
            const archetype = getArchetype(income)
            const meta = ARCHETYPE_META[archetype]
            const Icon = meta.icon
            return (
              <>
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-[9px] font-bold tracking-[0.16em] uppercase",
                    meta.tone
                  )}>
                  <Icon className="size-3" />
                  {meta.label}
                </div>
                <div className="mt-0.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onOpenDetail(income.id)}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Open details for ${income.name}`}>
                    <Settings2 className="size-3" />
                  </Button>
                  <Button
                    variant="destructiveGhost"
                    size="icon-sm"
                    onClick={() => onRequestDelete(income)}
                    aria-label={`Delete ${income.name}`}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </>
            )
          })()}
      </div>

      {/* Bars area — gridlines come from the parent overlay. When the draft
          bar overlaps with the existing bars in this row we double the lane
          height (h-28) and split it in half: existing bars at the 25% line,
          draft bar at the 75% line. Same approach video editors use to put
          a colliding clip on a second track. */}
      <div
        ref={lanesAreaRef}
        data-row-income-id={primary.id}
        className={cn(
          "relative overflow-hidden transition-[height]",
          draftStacked || rowHasBonus ? "h-20" : "h-11",
          editMode && "cursor-crosshair"
        )}
        style={EDGE_FADE_STYLE}
        onPointerDown={(e) => {
          if (!editMode || !onDrawStart) return
          // Only the lane background should start a draw — clicks on existing
          // bars/handles still go to their drag handlers via stopPropagation.
          if ((e.target as Element)?.closest("button")) return
          // Don't start a draw while an income bar popover is open. Its card
          // (carousel dots, etc.) is portaled over the lane, so a click that
          // lands just outside a control would otherwise punch through and
          // begin drawing a phantom income. The user must close the popover
          // first, then draw.
          if (
            typeof document !== "undefined" &&
            document.querySelector("[data-bar-popup]")
          ) {
            return
          }
          const lane = lanesAreaRef.current
          if (!lane) return
          const rect = lane.getBoundingClientRect()
          const monthWidthPx = rect.width / cells.length
          const cursorX = e.clientX - rect.left
          const idx = Math.max(
            0,
            Math.min(
              cells.length - 1,
              Math.floor(cursorX / monthWidthPx + subMonthFraction)
            )
          )
          ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
          onDrawStart(primary, idx)
        }}
        onPointerMove={(e) => {
          if (!editMode || !drawState || !onDrawMove) return
          const lane = lanesAreaRef.current
          if (!lane) return
          const rect = lane.getBoundingClientRect()
          const monthWidthPx = rect.width / cells.length
          const idx = Math.max(
            0,
            Math.min(
              cells.length - 1,
              Math.floor(
                (e.clientX - rect.left) / monthWidthPx + subMonthFraction
              )
            )
          )
          onDrawMove(primary, idx)
        }}
        onPointerUp={(e) => {
          if (!editMode || !drawState || !onDrawEnd) return
          const lane = lanesAreaRef.current
          if (!lane) return
          const rect = lane.getBoundingClientRect()
          const monthWidthPx = rect.width / cells.length
          const finalIdx = Math.max(
            0,
            Math.min(
              cells.length - 1,
              Math.floor(
                (e.clientX - rect.left) / monthWidthPx + subMonthFraction
              )
            )
          )
          // A draw on a single month creates a NEW income (one-month bar), the
          // same as dragging across a range — it just opens the New Income popup
          // with start == end. (Adjusting an existing income is done by clicking
          // its bar, not by drawing on the lane.)
          // Compute the bar's center in viewport coordinates so the popup's
          // speech-bubble tail can point at the actual bar (not at where the
          // cursor happened to be released).
          const anchorIdx = cells.findIndex(
            (c) => c.key === drawState.anchorKey
          )
          const startIdx = Math.min(anchorIdx, finalIdx)
          const endIdxLocal = Math.max(anchorIdx, finalIdx)
          const centerCell = (startIdx + endIdxLocal + 1) / 2
          const barCenterX =
            rect.left + (centerCell - subMonthFraction) * monthWidthPx
          const barCenterY = rect.top + rect.height / 2
          onDrawEnd(primary, finalIdx, barCenterX, barCenterY)
        }}>
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: "translateX(var(--ts-x, 0))" }}>
          {/* In-progress drawing bar overlay — rendered when this row is the
              draw target. Indices are derived from the date keys against the
              current cells, so when the timeline scrolls horizontally the
              bar stays glued to its calendar months instead of drifting.
              Pointer-events-none so it doesn't swallow the pointermove/up
              events fired against the lane wrapper. */}
          {drawState &&
            (() => {
              // True (possibly out-of-window) cell offsets for each edge,
              // measured in months from the first visible cell. We deliberately
              // do NOT clamp to [0, cells.length-1]: letting these run negative
              // or past the end keeps the bar's geometry continuous as the window
              // scrolls. The lane's overflow-hidden + edge-fade mask then clips
              // whatever spills past either edge, so BOTH ends melt into the edge
              // — the old clamp pinned the right edge to the last cell, which made
              // it snap shorter on scroll instead of fading away like the left (#18).
              const cell0 = cells[0].date
              const a = differenceInCalendarMonths(
                parseISO(`${drawState.anchorKey}-01`),
                cell0
              )
              const b = differenceInCalendarMonths(
                parseISO(`${drawState.endKey}-01`),
                cell0
              )
              const startIdx = Math.min(a, b)
              const endIdxLocal = Math.max(a, b)
              const leftPct = (startIdx / cells.length) * 100
              const widthPct =
                ((endIdxLocal - startIdx + 1) / cells.length) * 100
              return (
                <div
                  data-draft-bar="true"
                  onPointerDown={(e) => handleDraftPointerDown(e, "move")}
                  onPointerMove={handleDraftPointerMove}
                  onPointerUp={handleDraftPointerUp}
                  onPointerCancel={handleDraftPointerUp}
                  className={cn(
                    "border-brand-terracotta bg-brand-terracotta/15 ring-brand-terracotta/20 absolute h-8 -translate-y-1/2 cursor-grab touch-none rounded-md border-2 border-dashed ring-2 select-none active:cursor-grabbing",
                    // When stacked, the draft bar moves to the 75% line so
                    // it sits below the existing bars (which are at 25%).
                    draftStacked ? "top-[75%]" : "top-1/2"
                  )}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  aria-label="New income (drag to reposition)">
                  {/* Resize-left handle */}
                  <span
                    role="slider"
                    aria-label="Drag to change new income's start month"
                    aria-valuemin={0}
                    aria-valuemax={cells.length - 1}
                    aria-valuenow={startIdx}
                    onPointerDown={(e) =>
                      handleDraftPointerDown(e, "resize-left")
                    }
                    onPointerMove={handleDraftPointerMove}
                    onPointerUp={handleDraftPointerUp}
                    onPointerCancel={handleDraftPointerUp}
                    className="absolute top-0 bottom-0 left-0 flex w-2 cursor-ew-resize touch-none items-center justify-center">
                    <span className="bg-brand-terracotta h-5 w-px rounded-full" />
                  </span>
                  {/* Resize-right handle */}
                  <span
                    role="slider"
                    aria-label="Drag to change new income's end month"
                    aria-valuemin={0}
                    aria-valuemax={cells.length - 1}
                    aria-valuenow={endIdxLocal}
                    onPointerDown={(e) =>
                      handleDraftPointerDown(e, "resize-right")
                    }
                    onPointerMove={handleDraftPointerMove}
                    onPointerUp={handleDraftPointerUp}
                    onPointerCancel={handleDraftPointerUp}
                    className="absolute top-0 right-0 bottom-0 flex w-2 cursor-ew-resize touch-none items-center justify-center">
                    <span className="bg-brand-terracotta h-5 w-px rounded-full" />
                  </span>
                </div>
              )
            })()}
          {/* Bars from every income on this track. Tracks are pre-packed by
              `packIntoTracks` so two incomes never overlap horizontally —
              they share the lane at the same vertical level regardless of
              archetype. Per-income archetype/color/segments are computed
              inside the loop so a temporary + current pair on one row each
              keep their own theming. */}
          {incomes.flatMap((income) => {
            const archetype = getArchetype(income)
            const meta = ARCHETYPE_META[archetype]
            const segments = buildBarSegments(income, cells)
            const startKey = format(
              startOfMonth(parseISO(income.startDate)),
              "yyyy-MM"
            )
            const endKey = income.endDate
              ? format(startOfMonth(parseISO(income.endDate)), "yyyy-MM")
              : null
            const startInWindow = cells.length > 0 && startKey >= cells[0].key
            const endInWindow =
              cells.length > 0 &&
              endKey !== null &&
              endKey <= cells[cells.length - 1].key
            const rowNetFactor = netFactor(income)
            return segments.map((seg, i) => {
              const leftPct = (seg.startIndex / cells.length) * 100
              const widthPct = (seg.spanCount / cells.length) * 100
              const displayAmount =
                amountMode === "nett" ? seg.amount * rowNetFactor : seg.amount
              const isLastSegment = i === segments.length - 1
              const isFirstSegment = i === 0
              const reachesEnd = seg.startIndex + seg.spanCount >= cells.length
              const isOngoingTail =
                (archetype === "recurring" || archetype === "future") &&
                !income.endDate &&
                isLastSegment &&
                reachesEnd
              const showLeftHandle = editMode && isFirstSegment && startInWindow
              const showRightHandle =
                editMode && isLastSegment && !isOngoingTail && endInWindow
              return (
                <Popover
                  key={`${income.id}-${i}`}
                  open={openPopupKey === `${income.id}-${i}`}
                  onOpenChange={(o) =>
                    setOpenPopupKey(o ? `${income.id}-${i}` : null)
                  }>
                  {/* Opens in BOTH modes now: edit mode = editable, view mode =
                      read-only details (Overview / CPF / Bonus). */}
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onPointerDown={(e) =>
                        handlePointerDown(e, "move", income)
                      }
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerCancel}
                      onClickCapture={handleClickCapture}
                      className={cn(
                        // z-[5] keeps the bar above the bonus connector line (which
                        // renders later in the DOM at the default z) while staying
                        // below the bonus pill + the "today" marker, both z-10. So
                        // the connector emerges from under the bar and the bar stays
                        // on top when it scales up on hover.
                        "focus-visible:ring-ring absolute z-[5] flex -translate-y-1/2 touch-none items-center justify-center px-2 text-xs font-semibold text-white shadow-sm transition-transform select-none hover:scale-y-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                        editMode
                          ? "cursor-grab active:cursor-grabbing"
                          : "cursor-default",
                        barTopClass,
                        isOngoingTail
                          ? "rounded-l-md rounded-r-none"
                          : "rounded-md",
                        segmentBarClass(seg.direction, meta.bar)
                      )}
                      style={{
                        left: `${leftPct}%`,
                        height: "32px",
                        ...(isOngoingTail
                          ? {
                              right: "var(--ts-x, 0)",
                              clipPath:
                                "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)"
                            }
                          : {
                              width: `${widthPct}%`
                            })
                      }}
                      aria-label={`Adjust ${income.name} amount, currently ${formatCurrency(displayAmount)}${amountMode === "nett" ? " net" : ""}${isOngoingTail ? " (ongoing)" : ""}`}>
                      {/* Change marker — a small notch at the start of a
                          future-change segment so the change-point is obvious
                          on the bar (beyond the green/amber color). Not shown
                          for the income's first/base segment. */}
                      {seg.milestoneId && !isFirstSegment && (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute top-0 bottom-0 left-0 w-[3px] rounded-l-md",
                            seg.direction === "down"
                              ? "bg-[#7A5400]/70"
                              : "bg-[#1C4A33]/70"
                          )}
                        />
                      )}
                      {/* Label is rendered in a separate non-translated overlay
                          (see below) so it can stay centered/static while the
                          bar fills the viewport and glide only when an edge
                          scrolls into view — no sub-month sawtooth. */}
                      {showLeftHandle && (
                        <span
                          role="slider"
                          aria-label={`Drag to change ${income.name} start date`}
                          aria-valuemin={0}
                          aria-valuemax={cells.length - 1}
                          aria-valuenow={seg.startIndex}
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            handlePointerDown(e, "resize-left", income)
                          }}
                          onPointerMove={(e) => {
                            e.stopPropagation()
                            handlePointerMove(e)
                          }}
                          onPointerUp={(e) => {
                            e.stopPropagation()
                            handlePointerUp(e)
                          }}
                          onPointerCancel={(e) => {
                            e.stopPropagation()
                            handlePointerCancel()
                          }}
                          onClickCapture={(e) => {
                            e.stopPropagation()
                            handleClickCapture(e)
                          }}
                          className="absolute top-0 bottom-0 left-0 flex w-1.5 cursor-ew-resize touch-none items-center justify-center">
                          <span className="h-5 w-px rounded-full bg-white/35 transition-colors group-hover:bg-white/85" />
                        </span>
                      )}
                      {showRightHandle && (
                        <span
                          role="slider"
                          aria-label={`Drag to change ${income.name} end date`}
                          aria-valuemin={0}
                          aria-valuemax={cells.length - 1}
                          aria-valuenow={seg.startIndex + seg.spanCount - 1}
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            handlePointerDown(e, "resize-right", income)
                          }}
                          onPointerMove={(e) => {
                            e.stopPropagation()
                            handlePointerMove(e)
                          }}
                          onPointerUp={(e) => {
                            e.stopPropagation()
                            handlePointerUp(e)
                          }}
                          onPointerCancel={(e) => {
                            e.stopPropagation()
                            handlePointerCancel()
                          }}
                          onClickCapture={(e) => {
                            e.stopPropagation()
                            handleClickCapture(e)
                          }}
                          className="absolute top-0 right-0 bottom-0 flex w-1.5 cursor-ew-resize touch-none items-center justify-center">
                          <span className="h-5 w-px rounded-full bg-white/35 transition-colors group-hover:bg-white/85" />
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="center"
                    collisionPadding={12}
                    className="w-auto border-0 bg-transparent p-0 shadow-none">
                    <IncomeBarPopup
                      income={income}
                      initialAmount={seg.amount}
                      readOnly={!editMode}
                      canEditBonus={editMode && archetype === "recurring"}
                      segmentKind={
                        seg.milestoneId ? "future-change" : "current"
                      }
                      segmentPeriod={segmentPeriodLabel(seg, income)}
                      onEditPeriod={
                        editMode && onEditSegmentPeriod
                          ? () => onEditSegmentPeriod(income, seg)
                          : undefined
                      }
                      onConfirm={(next, bonus) => {
                        if (onSegmentAmountChange) {
                          onSegmentAmountChange(income, seg, next, bonus)
                        } else {
                          onAmountChange(income, next, bonus)
                        }
                        setOpenPopupKey(null)
                      }}
                      onDelete={() => onRequestDelete(income)}
                    />
                  </PopoverContent>
                </Popover>
              )
            })
          })}

          {/* Bonus markers — one gold pill per bonus month, sitting on the
              lower line of the (stacked) lane below its parent income bar. A
              thin connector links each pill up to the parent; clicking a pill
              opens the parent income's editor (where the bonus is edited). */}
          {bonusBarsByIncome.flatMap(({ income, bars }) => {
            if (bars.length === 0) return []
            const canEditBonus = getArchetype(income) === "recurring"
            const parentMonthly = Number(income.amount) || 0
            // Net bonus: subtract the employee CPF that applies to the year's
            // bonuses (capped by the Annual Wage ceiling), apportioned across
            // the bonus months by gross.
            const bonusGrossTotal = bars.reduce((s, x) => s + x.amount, 0)
            const bonusNetFactor =
              amountMode === "nett" &&
              income.subjectToCpf &&
              bonusGrossTotal > 0
                ? Math.max(
                    0,
                    1 -
                      computeAnnualBonusCpf(
                        parentMonthly,
                        bonusGrossTotal,
                        ageFromDobIso(income.familyMember?.dateOfBirth)
                      ).employee /
                        bonusGrossTotal
                  )
                : 1
            return bars.map((b) => {
              const centerPct = ((b.index + 0.5) / cells.length) * 100
              const bonusDisplay = b.amount * bonusNetFactor
              return (
                <div key={`${income.id}-bonus-${b.index}`}>
                  {/* Connector linking the gold bonus pill to its parent income
                      bar. When bonuses sit ABOVE the parent (#J) the pill is on
                      the upper line and the bar on the lower line, so the
                      gradient runs gold (pill, top) → green (bar, bottom); in
                      the legacy/mid-draft layout the pill is below, so it runs
                      green (top) → gold (bottom). Either way the colour blend
                      stays smooth between the two. */}
                  <div
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute w-1.5 -translate-x-1/2",
                      bonusAbove
                        ? "from-brand-gold to-brand-jungle bg-gradient-to-b"
                        : "from-brand-jungle to-brand-gold bg-gradient-to-b"
                    )}
                    style={
                      bonusAbove
                        ? { left: `${centerPct}%`, top: "30%", height: "26%" }
                        : { left: `${centerPct}%`, top: "44%", height: "20%" }
                    }
                  />
                  <Popover
                    open={openPopupKey === `${income.id}-bonus-${b.index}`}
                    onOpenChange={(o) =>
                      setOpenPopupKey(
                        o ? `${income.id}-bonus-${b.index}` : null
                      )
                    }>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "focus-visible:ring-ring from-brand-gold absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-md bg-gradient-to-r to-[#E0BD5C] px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-[#5A4500] shadow-sm transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                          bonusTopClass,
                          // Base layer gives buttons cursor-pointer; force the
                          // default arrow in view mode (utilities beat base).
                          !editMode && "cursor-default"
                        )}
                        style={{ left: `${centerPct}%` }}
                        aria-label={`${income.name} bonus, ${formatCurrency(bonusDisplay)}`}>
                        <Gift className="size-3" />
                        {formatCurrency(bonusDisplay)}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="center"
                      collisionPadding={12}
                      className="w-auto border-0 bg-transparent p-0 shadow-none">
                      <IncomeBarPopup
                        income={income}
                        initialAmount={parentMonthly}
                        openToBonus
                        readOnly={!editMode}
                        canEditBonus={editMode && canEditBonus}
                        onConfirm={(next, bonus) => {
                          onAmountChange(income, next, bonus)
                          setOpenPopupKey(null)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )
            })
          })}
        </div>

        {/* Bar-label overlay — deliberately NOT inside the translated layer.
            Each label is centered within the *visible* slice of its bar
            (clamped to the viewport), so a bar that spans past both edges
            keeps its label parked in the middle (static), and the label only
            glides once a start/end edge scrolls into view. Computed straight
            from startIndex/spanCount/subMonthFraction, so it's continuous
            across the month-boundary rebuilds — no stepping. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {incomes.flatMap((income) => {
            const archetype = getArchetype(income)
            const segments = buildBarSegments(income, cells)
            const N = cells.length || 1
            const rowNetFactor = netFactor(income)
            return segments.map((seg, i) => {
              const displayAmount =
                amountMode === "nett" ? seg.amount * rowNetFactor : seg.amount
              const isLastSegment = i === segments.length - 1
              const isFirstSegment = i === 0
              const reachesEnd = seg.startIndex + seg.spanCount >= cells.length
              const isOngoingTail =
                (archetype === "recurring" || archetype === "future") &&
                !income.endDate &&
                isLastSegment &&
                reachesEnd
              const rawLeft = (seg.startIndex - subMonthFraction) / N
              const rawRight =
                (seg.startIndex + seg.spanCount - subMonthFraction) / N
              const visLeft = Math.max(0, Math.min(1, rawLeft))
              const visRight = isOngoingTail
                ? 1
                : Math.max(0, Math.min(1, rawRight))
              if (visRight - visLeft < 0.008) return null
              return (
                <div
                  key={`${income.id}-${i}-label`}
                  aria-hidden
                  className={cn(
                    "absolute flex h-8 -translate-y-1/2 items-center justify-center overflow-hidden px-2",
                    barTopClass
                  )}
                  style={{
                    left: `${visLeft * 100}%`,
                    width: `${(visRight - visLeft) * 100}%`
                  }}>
                  {/* min-w-0 + truncate clips the label to the bar's VISIBLE
                      slice: a wide bar shows the full label, but a bar scrolled
                      down to a sliver truncates with an ellipsis instead of
                      spilling its text out past the bar edge (#M). */}
                  <span className="min-w-0 truncate text-xs font-semibold text-white">
                    {isFirstSegment && (
                      <span className="font-medium opacity-90">
                        {income.name} ·{" "}
                      </span>
                    )}
                    {amountMode === "nett" && rowNetFactor < 1 ? (
                      // CPF-applicable income in Nett mode: show the gross → net
                      // split so the take-home is read against the gross.
                      <>
                        <span className="opacity-70">
                          {formatCurrency(seg.amount)}
                        </span>
                        <span className="opacity-90"> → </span>
                        {formatCurrency(seg.amount * rowNetFactor)}
                      </>
                    ) : (
                      formatCurrency(displayAmount)
                    )}
                    {archetype === "recurring" && (
                      <em className="ml-1 font-normal italic opacity-80">
                        (Current)
                      </em>
                    )}
                  </span>
                </div>
              )
            })
          })}
        </div>
      </div>

      {dragTooltip && (
        <div
          role="status"
          className="bg-foreground font-display text-background pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md px-2 py-1 text-[11px] font-semibold whitespace-nowrap shadow-lg"
          style={{ left: dragTooltip.x, top: dragTooltip.y }}>
          {dragTooltip.text}
        </div>
      )}
    </div>
  )
})

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border-border/60 bg-card/95 w-full max-w-md rounded-2xl border p-10 text-center shadow-2xl ring-1 ring-black/5 backdrop-blur-sm">
      <p className="font-display text-foreground text-xl font-semibold">
        No income streams yet
      </p>
      <p className="text-muted-foreground mt-2 text-sm">
        Add your first income to unlock the timeline studio and start projecting
        your monthly balance.
      </p>
      <Button
        type="button"
        onClick={onCreate}
        className="bg-brand-terracotta hover:bg-brand-terracotta/90 mt-6 text-white">
        <Plus className="mr-1.5 size-4" />
        Add Income
      </Button>
    </div>
  )
}

function TimelineFooter({
  familyMembers,
  incomeCount
}: {
  familyMembers: FamilyMember[]
  incomeCount: number
}) {
  return (
    <div className="border-border/30 bg-muted/40 text-muted-foreground rounded-xl border p-4 text-xs">
      <p className="text-foreground/70 font-semibold tracking-[0.18em] uppercase">
        Live editing
      </p>
      <p className="mt-1">
        Showing {incomeCount} active income stream{incomeCount === 1 ? "" : "s"}{" "}
        across {familyMembers.length} family member
        {familyMembers.length === 1 ? "" : "s"}. Click any amount, name, or date
        to edit. Changes save to the same data the Legacy view uses.
      </p>
    </div>
  )
}

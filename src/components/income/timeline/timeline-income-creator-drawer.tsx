"use client"

import { useEffect, useState } from "react"
import { createIncome } from "@/actions/incomes"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, startOfMonth } from "date-fns"
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Infinity as InfinityIcon,
  Target
} from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoneyInput } from "@/components/ui/money-input"
import { MonthYearPicker } from "@/components/ui/month-year-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type Archetype = "recurring" | "one-off" | "temporary"

const CATEGORIES = [
  "salary",
  "freelance",
  "business",
  "investment",
  "rental",
  "dividend",
  "other"
] as const

interface FamilyMember {
  id: string
  name: string
  dateOfBirth: string | null
}

interface IncomeCreatorDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyMembers: FamilyMember[]
  onCreated?: () => void
}

// A "temporary" income, or a recurring one that already ended, requires an end
// date — enforced both at the step-2 gate and at final submit (superRefine).
const creatorFormSchema = z
  .object({
    archetype: z.enum(["recurring", "one-off", "temporary"]),
    recurringStatus: z.enum(["current", "past"]),
    name: z.string().trim().min(1),
    amount: z.string().refine((v) => Number(v) > 0, "Amount must be > 0"),
    startDate: z.date(),
    endDate: z.date().nullable(),
    category: z.string(),
    subjectToCpf: z.boolean(),
    familyMemberId: z.string(),
    description: z.string()
  })
  .superRefine((v, ctx) => {
    const needsEnd =
      v.archetype === "temporary" ||
      (v.archetype === "recurring" && v.recurringStatus === "past")
    if (needsEnd && !v.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date is required"
      })
    }
  })
type CreatorFormValues = z.infer<typeof creatorFormSchema>

const makeDefaults = (): CreatorFormValues => ({
  archetype: "recurring",
  recurringStatus: "current",
  name: "",
  amount: "",
  startDate: startOfMonth(new Date()),
  endDate: null,
  category: "salary",
  subjectToCpf: true,
  familyMemberId: "",
  description: ""
})

export function TimelineIncomeCreatorDrawer({
  open,
  onOpenChange,
  familyMembers,
  onCreated
}: IncomeCreatorDrawerProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [error, setError] = useState<string | null>(null)
  const [startCalOpen, setStartCalOpen] = useState(false)
  const [endCalOpen, setEndCalOpen] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { isSubmitting }
  } = useForm<CreatorFormValues>({
    resolver: zodResolver(creatorFormSchema),
    defaultValues: makeDefaults()
  })

  const archetype = useWatch({ control, name: "archetype" })
  const recurringStatus = useWatch({ control, name: "recurringStatus" })
  const category = useWatch({ control, name: "category" })
  const name = useWatch({ control, name: "name" })
  const amount = useWatch({ control, name: "amount" })
  const startDate = useWatch({ control, name: "startDate" })
  const endDate = useWatch({ control, name: "endDate" })
  const subjectToCpf = useWatch({ control, name: "subjectToCpf" })
  const familyMemberId = useWatch({ control, name: "familyMemberId" })

  // Reset the form when the drawer opens (RHF reset, not a React setState).
  useEffect(() => {
    if (open) reset(makeDefaults())
  }, [open, reset])

  // Reset the wizard step + error during render when the drawer (re)opens —
  // the "adjust state on prop change" pattern, so we don't setState in an effect.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setStep(1)
      setError(null)
    }
  }

  // Whenever archetype changes, reset recurringStatus to current and clear
  // endDate for currently-active recurring income.
  useEffect(() => {
    if (archetype !== "recurring") setValue("recurringStatus", "current")
    if (archetype === "recurring" && recurringStatus === "current")
      setValue("endDate", null)
  }, [archetype, recurringStatus, setValue])

  // CPF only applies to recurring/temporary (monthly wages): one-off defaults
  // OFF; recurring/temporary default ON when the category is salary.
  useEffect(() => {
    setValue(
      "subjectToCpf",
      archetype === "one-off" ? false : category === "salary"
    )
  }, [archetype, category, setValue])

  const parsedAmount = Number(amount)
  const canStep2 = parsedAmount > 0 && name.trim().length > 0
  const needsEndDate =
    archetype === "temporary" ||
    (archetype === "recurring" && recurringStatus === "past")

  const onSubmit = async (values: CreatorFormValues) => {
    setError(null)
    try {
      const member = familyMembers.find((m) => m.id === values.familyMemberId)
      const familyMemberAge = member?.dateOfBirth
        ? Math.max(
            0,
            new Date().getFullYear() -
              new Date(member.dateOfBirth).getFullYear()
          )
        : undefined

      const wantsEndDate =
        values.archetype === "temporary" ||
        (values.archetype === "recurring" && values.recurringStatus === "past")

      await createIncome({
        name: values.name.trim(),
        category: values.category,
        incomeCategory:
          values.archetype === "one-off" ? "one-off" : "current-recurring",
        amount: parsedAmount,
        subjectToCpf: values.subjectToCpf,
        startDate: format(values.startDate, "yyyy-MM-dd"),
        endDate:
          wantsEndDate && values.endDate
            ? format(values.endDate, "yyyy-MM-dd")
            : undefined,
        description: values.description.trim() || undefined,
        familyMemberId: values.familyMemberId || undefined,
        familyMemberAge
      })
      onOpenChange(false)
      onCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create income")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New income</DialogTitle>
          <DialogDescription>
            Step {step} of 3 · {step === 1 && "Pick the income type"}
            {step === 2 && "Tell us when and how much"}
            {step === 3 && "Optional details"}
          </DialogDescription>
        </DialogHeader>

        <StepDots step={step} />

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 1 && (
            <div className="space-y-3 py-2">
              <ArchetypeChoice
                value={archetype}
                onChange={(a) => setValue("archetype", a)}
                option="recurring"
                icon={InfinityIcon}
                label="Recurring"
                detail="Continuous monthly income with no end date — e.g. salary."
                accent="text-brand-jungle border-brand-jungle/40"
              />
              <ArchetypeChoice
                value={archetype}
                onChange={(a) => setValue("archetype", a)}
                option="one-off"
                icon={Target}
                label="One-off"
                detail="A single payment in a specific month — e.g. annual bonus, refund."
                accent="text-brand-terracotta border-brand-terracotta/40"
              />
              <ArchetypeChoice
                value={archetype}
                onChange={(a) => setValue("archetype", a)}
                option="temporary"
                icon={Clock}
                label="Temporary"
                detail="Recurring monthly income with a fixed end date — e.g. freelance gig."
                accent="text-on-warning border-brand-gold/50"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 py-2">
              <Field label="Name" htmlFor="creator-name" required>
                <Input
                  id="creator-name"
                  placeholder="e.g. Salary, Annual Bonus, Freelance Gig"
                  aria-required="true"
                  autoFocus
                  {...register("name")}
                />
              </Field>

              <Field label="Amount" htmlFor="creator-amount" required>
                <Controller
                  control={control}
                  name="amount"
                  render={({ field }) => (
                    <MoneyInput
                      id="creator-amount"
                      min={0}
                      step="50"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      className="font-display text-lg font-semibold"
                      placeholder="0"
                      aria-required="true"
                    />
                  )}
                />
              </Field>

              {archetype === "recurring" && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setValue("recurringStatus", "current")}
                      className={cn(
                        "rounded-lg border-2 px-3 py-2.5 text-left transition-all",
                        recurringStatus === "current"
                          ? "border-brand-jungle bg-brand-jungle/10"
                          : "border-border/40 bg-card hover:border-border/70"
                      )}>
                      <p className="text-foreground text-sm font-semibold">
                        Currently active
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        I&apos;m still receiving this income.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("recurringStatus", "past")}
                      className={cn(
                        "rounded-lg border-2 px-3 py-2.5 text-left transition-all",
                        recurringStatus === "past"
                          ? "border-muted-foreground/60 bg-muted"
                          : "border-border/40 bg-card hover:border-border/70"
                      )}>
                      <p className="text-foreground text-sm font-semibold">
                        No longer active
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        I had this income but it&apos;s ended.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>
                    {archetype === "one-off"
                      ? "Payment month"
                      : archetype === "recurring" && recurringStatus === "past"
                        ? "Started on"
                        : "Starting"}
                  </Label>
                  <Popover open={startCalOpen} onOpenChange={setStartCalOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="font-display w-full justify-start">
                        <CalendarDays className="text-muted-foreground mr-2 h-4 w-4" />
                        {format(startDate, "MMM yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <MonthYearPicker
                        value={startDate}
                        onChange={(d) => {
                          setValue("startDate", d)
                          setStartCalOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {needsEndDate && (
                  <div className="space-y-2">
                    <Label>
                      {archetype === "recurring" ? "Ended on" : "Until"}
                    </Label>
                    <Popover open={endCalOpen} onOpenChange={setEndCalOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="font-display w-full justify-start">
                          <CalendarDays className="text-muted-foreground mr-2 h-4 w-4" />
                          {endDate
                            ? format(endDate, "MMM yyyy")
                            : "Pick a month"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <MonthYearPicker
                          value={endDate ?? startDate}
                          onChange={(d) => {
                            setValue("endDate", d)
                            setEndCalOpen(false)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 py-2">
              <Field label="Category" htmlFor="creator-category">
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="creator-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c[0].toUpperCase() + c.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              {familyMembers.length > 0 && (
                <Field
                  label="Family member"
                  htmlFor="creator-family-member"
                  optional>
                  <Select
                    value={familyMemberId || "_none"}
                    onValueChange={(v) =>
                      setValue("familyMemberId", v === "_none" ? "" : v)
                    }>
                    <SelectTrigger id="creator-family-member">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">
                        — No one in particular
                      </SelectItem>
                      {familyMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <div className="border-border/40 flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Subject to CPF</p>
                  <p className="text-muted-foreground text-xs">
                    Compute employee + employer CPF on this income.
                  </p>
                </div>
                <Switch
                  checked={subjectToCpf}
                  onCheckedChange={(v) => setValue("subjectToCpf", v)}
                />
              </div>

              <Field label="Notes" htmlFor="creator-notes" optional>
                <Textarea
                  id="creator-notes"
                  rows={2}
                  placeholder="Any context for future you"
                  {...register("description")}
                />
              </Field>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                step === 1 ? onOpenChange(false) : setStep((step - 1) as 1 | 2)
              }
              disabled={isSubmitting}>
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep((step + 1) as 2 | 3)}
                disabled={
                  step === 2
                    ? !canStep2 || (needsEndDate && !getValues("endDate"))
                    : false
                }
                className="bg-brand-jungle hover:bg-brand-jungle/90 text-white">
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-brand-terracotta hover:bg-brand-terracotta/90 text-white">
                {isSubmitting ? "Creating…" : "Create income"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1.5 pb-2">
      {[1, 2, 3].map((s) => (
        <span
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all",
            s === step ? "bg-brand-terracotta w-8" : "bg-border w-1.5"
          )}
        />
      ))}
    </div>
  )
}

interface ArchetypeChoiceProps {
  value: Archetype
  onChange: (a: Archetype) => void
  option: Archetype
  icon: typeof InfinityIcon
  label: string
  detail: string
  accent: string
}

function ArchetypeChoice({
  value,
  onChange,
  option,
  icon: Icon,
  label,
  detail,
  accent
}: ArchetypeChoiceProps) {
  const selected = value === option
  return (
    <button
      type="button"
      onClick={() => onChange(option)}
      className={cn(
        "w-full rounded-xl border-2 px-4 py-3 text-left transition-all",
        selected
          ? "border-brand-terracotta bg-brand-terracotta/5"
          : "border-border/40 bg-card hover:border-border/70"
      )}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "bg-background flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border",
            accent
          )}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="font-display text-sm font-semibold">{label}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{detail}</p>
        </div>
      </div>
    </button>
  )
}

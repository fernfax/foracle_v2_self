"use client"

import { useEffect, useState } from "react"
import { toggleIncomeStatus, updateIncome } from "@/actions/incomes"
import { addMonths, format, parseISO } from "date-fns"
import { Archive, Clock, Infinity as InfinityIcon, Target } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const CATEGORIES = [
  "salary",
  "freelance",
  "business",
  "investment",
  "rental",
  "dividend",
  "other"
] as const

type Archetype = "recurring" | "one-off" | "temporary"

interface IncomeForDrawer {
  id: string
  name: string
  amount: string
  category: string
  incomeCategory: string | null
  frequency: string
  startDate: string
  endDate: string | null
  description: string | null
  subjectToCpf: boolean | null
  familyMemberId: string | null
  isActive: boolean | null
}

interface FamilyMember {
  id: string
  name: string
  dateOfBirth: string | null
}

interface IncomeDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  income: IncomeForDrawer | null
  familyMembers: FamilyMember[]
  onSaved?: () => void
  onArchived?: () => void
}

function deriveArchetype(income: IncomeForDrawer): Archetype {
  if (income.incomeCategory === "one-off" || income.frequency === "one-time")
    return "one-off"
  if (income.endDate) return "temporary"
  return "recurring"
}

export function TimelineIncomeDetailDrawer({
  open,
  onOpenChange,
  income,
  familyMembers,
  onSaved,
  onArchived
}: IncomeDetailDrawerProps) {
  const [archetype, setArchetype] = useState<Archetype>("recurring")
  const [category, setCategory] = useState("salary")
  const [familyMemberId, setFamilyMemberId] = useState("")
  const [subjectToCpf, setSubjectToCpf] = useState(false)
  const [description, setDescription] = useState("")
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && income) {
      setArchetype(deriveArchetype(income))
      setCategory(income.category || "salary")
      setFamilyMemberId(income.familyMemberId || "")
      setSubjectToCpf(income.subjectToCpf === true)
      setDescription(income.description || "")
      setError(null)
    }
  }, [open, income])

  if (!income) return null

  const runUpdate = async (
    field: string,
    patch: Parameters<typeof updateIncome>[1]
  ) => {
    setPending(field)
    setError(null)
    try {
      await updateIncome(income.id, patch)
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save")
    } finally {
      setPending(null)
    }
  }

  const handleArchetypeChange = (next: Archetype) => {
    if (next === archetype) return
    setArchetype(next)

    if (next === "recurring") {
      runUpdate("archetype", {
        incomeCategory: "current-recurring",
        frequency: "monthly",
        endDate: null
      })
    } else if (next === "one-off") {
      runUpdate("archetype", {
        incomeCategory: "one-off",
        frequency: "one-time",
        endDate: null
      })
    } else if (next === "temporary") {
      const start = parseISO(income.startDate)
      const fallbackEnd = format(addMonths(start, 12), "yyyy-MM-dd")
      const ed = income.endDate ?? fallbackEnd
      runUpdate("archetype", {
        incomeCategory: "current-recurring",
        frequency: "monthly",
        endDate: ed
      })
    }
  }

  const handleArchive = async () => {
    setPending("archive")
    setError(null)
    try {
      await toggleIncomeStatus(income.id)
      onOpenChange(false)
      onArchived?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive")
    } finally {
      setPending(null)
    }
  }

  const familyMemberDisplayValue = familyMemberId || "_none"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{income.name}</DialogTitle>
          <DialogDescription>
            Details, CPF, and grouping for this income stream. Changes save
            automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <section className="space-y-2">
            <Label>Income type</Label>
            <div className="grid grid-cols-3 gap-2">
              <ArchetypeButton
                active={archetype === "recurring"}
                pending={pending === "archetype"}
                icon={InfinityIcon}
                label="Recurring"
                onClick={() => handleArchetypeChange("recurring")}
              />
              <ArchetypeButton
                active={archetype === "temporary"}
                pending={pending === "archetype"}
                icon={Clock}
                label="Temporary"
                onClick={() => handleArchetypeChange("temporary")}
              />
              <ArchetypeButton
                active={archetype === "one-off"}
                pending={pending === "archetype"}
                icon={Target}
                label="One-off"
                onClick={() => handleArchetypeChange("one-off")}
              />
            </div>
          </section>

          <Field label="Category" htmlFor="detail-category">
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v)
                runUpdate("category", { category: v })
              }}>
              <SelectTrigger id="detail-category">
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
          </Field>

          {familyMembers.length > 0 && (
            <Field label="Family member" htmlFor="detail-family-member">
              <Select
                value={familyMemberDisplayValue}
                onValueChange={(v) => {
                  const next = v === "_none" ? "" : v
                  setFamilyMemberId(next)
                  runUpdate("familyMember", {
                    familyMemberId: next || undefined
                  })
                }}>
                <SelectTrigger id="detail-family-member">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— No one in particular</SelectItem>
                  {familyMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <section className="border-border/40 flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Subject to CPF</p>
              <p className="text-muted-foreground text-xs">
                Compute employee + employer CPF on this income.
              </p>
            </div>
            <Switch
              checked={subjectToCpf}
              disabled={pending === "subjectToCpf"}
              onCheckedChange={(v) => {
                setSubjectToCpf(v)
                runUpdate("subjectToCpf", { subjectToCpf: v })
              }}
            />
          </section>

          <Field label="Notes" htmlFor="detail-notes">
            <Textarea
              id="detail-notes"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                if (description !== (income.description ?? "")) {
                  runUpdate("description", {
                    description: description || undefined
                  })
                }
              }}
              placeholder="Any context for future you"
            />
          </Field>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="destructiveGhost"
            onClick={handleArchive}
            disabled={pending === "archive"}>
            <Archive className="mr-2 h-4 w-4" />
            {pending === "archive" ? "Archiving…" : "Archive"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ArchetypeButtonProps {
  active: boolean
  pending: boolean
  icon: typeof InfinityIcon
  label: string
  onClick: () => void
}

function ArchetypeButton({
  active,
  pending,
  icon: Icon,
  label,
  onClick
}: ArchetypeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border-2 px-2 py-3 text-xs font-semibold transition-all",
        active
          ? "border-brand-terracotta bg-brand-terracotta/10 text-brand-terracotta"
          : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
        pending && "cursor-wait opacity-60"
      )}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

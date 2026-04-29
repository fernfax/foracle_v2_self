"use client";

import { useEffect, useState } from "react";
import { addMonths, format, parseISO } from "date-fns";
import { Archive, Infinity as InfinityIcon, Target, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateIncome, toggleIncomeStatus } from "@/lib/actions/income";

const CATEGORIES = [
  "salary",
  "freelance",
  "business",
  "investment",
  "rental",
  "dividend",
  "other",
] as const;

type Archetype = "recurring" | "one-off" | "temporary";

interface IncomeForDrawer {
  id: string;
  name: string;
  amount: string;
  category: string;
  incomeCategory: string | null;
  frequency: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  subjectToCpf: boolean | null;
  familyMemberId: string | null;
  isActive: boolean | null;
}

interface FamilyMember {
  id: string;
  name: string;
  dateOfBirth: string | null;
}

interface IncomeDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income: IncomeForDrawer | null;
  familyMembers: FamilyMember[];
  onSaved?: () => void;
  onArchived?: () => void;
}

function deriveArchetype(income: IncomeForDrawer): Archetype {
  if (income.incomeCategory === "one-off" || income.frequency === "one-time") return "one-off";
  if (income.endDate) return "temporary";
  return "recurring";
}

export function IncomeDetailDrawer({
  open,
  onOpenChange,
  income,
  familyMembers,
  onSaved,
  onArchived,
}: IncomeDetailDrawerProps) {
  const [archetype, setArchetype] = useState<Archetype>("recurring");
  const [category, setCategory] = useState("salary");
  const [familyMemberId, setFamilyMemberId] = useState("");
  const [subjectToCpf, setSubjectToCpf] = useState(false);
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && income) {
      setArchetype(deriveArchetype(income));
      setCategory(income.category || "salary");
      setFamilyMemberId(income.familyMemberId || "");
      setSubjectToCpf(income.subjectToCpf === true);
      setDescription(income.description || "");
      setError(null);
    }
  }, [open, income]);

  if (!income) return null;

  const runUpdate = async (
    field: string,
    patch: Parameters<typeof updateIncome>[1]
  ) => {
    setPending(field);
    setError(null);
    try {
      await updateIncome(income.id, patch);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setPending(null);
    }
  };

  const handleArchetypeChange = (next: Archetype) => {
    if (next === archetype) return;
    setArchetype(next);

    if (next === "recurring") {
      runUpdate("archetype", {
        incomeCategory: "current-recurring",
        frequency: "monthly",
        endDate: null,
      });
    } else if (next === "one-off") {
      runUpdate("archetype", {
        incomeCategory: "one-off",
        frequency: "one-time",
        endDate: null,
      });
    } else if (next === "temporary") {
      const start = parseISO(income.startDate);
      const fallbackEnd = format(addMonths(start, 12), "yyyy-MM-dd");
      const ed = income.endDate ?? fallbackEnd;
      runUpdate("archetype", {
        incomeCategory: "current-recurring",
        frequency: "monthly",
        endDate: ed,
      });
    }
  };

  const handleArchive = async () => {
    setPending("archive");
    setError(null);
    try {
      await toggleIncomeStatus(income.id);
      onOpenChange(false);
      onArchived?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive");
    } finally {
      setPending(null);
    }
  };

  const familyMemberDisplayValue = familyMemberId || "_none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{income.name}</DialogTitle>
          <DialogDescription>
            Details, CPF, and grouping for this income stream. Changes save automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <section className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Income type
            </Label>
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

          <section className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </Label>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                runUpdate("category", { category: v });
              }}
            >
              <SelectTrigger>
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
          </section>

          {familyMembers.length > 0 && (
            <section className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Family member
              </Label>
              <Select
                value={familyMemberDisplayValue}
                onValueChange={(v) => {
                  const next = v === "_none" ? "" : v;
                  setFamilyMemberId(next);
                  runUpdate("familyMember", { familyMemberId: next || undefined });
                }}
              >
                <SelectTrigger>
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
            </section>
          )}

          <section className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Subject to CPF</p>
              <p className="text-xs text-muted-foreground">
                Compute employee + employer CPF on this income.
              </p>
            </div>
            <Switch
              checked={subjectToCpf}
              disabled={pending === "subjectToCpf"}
              onCheckedChange={(v) => {
                setSubjectToCpf(v);
                runUpdate("subjectToCpf", { subjectToCpf: v });
              }}
            />
          </section>

          <section className="space-y-2">
            <Label
              htmlFor="detail-notes"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Notes
            </Label>
            <Textarea
              id="detail-notes"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                if (description !== (income.description ?? "")) {
                  runUpdate("description", { description: description || undefined });
                }
              }}
              placeholder="Any context for future you"
            />
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleArchive}
            disabled={pending === "archive"}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Archive className="mr-2 h-4 w-4" />
            {pending === "archive" ? "Archiving…" : "Archive"}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ArchetypeButtonProps {
  active: boolean;
  pending: boolean;
  icon: typeof InfinityIcon;
  label: string;
  onClick: () => void;
}

function ArchetypeButton({ active, pending, icon: Icon, label, onClick }: ArchetypeButtonProps) {
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
        pending && "opacity-60 cursor-wait"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

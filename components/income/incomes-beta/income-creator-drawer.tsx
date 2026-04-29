"use client";

import { useEffect, useState } from "react";
import { format, startOfMonth } from "date-fns";
import {
  CalendarDays,
  Infinity as InfinityIcon,
  Target,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createIncome } from "@/lib/actions/income";

type Archetype = "recurring" | "one-off" | "temporary";

const CATEGORIES = [
  "salary",
  "freelance",
  "business",
  "investment",
  "rental",
  "dividend",
  "other",
] as const;

interface FamilyMember {
  id: string;
  name: string;
  dateOfBirth: string | null;
}

interface IncomeCreatorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyMembers: FamilyMember[];
  onCreated?: () => void;
}

export function IncomeCreatorDrawer({
  open,
  onOpenChange,
  familyMembers,
  onCreated,
}: IncomeCreatorDrawerProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [archetype, setArchetype] = useState<Archetype>("recurring");
  const [recurringStatus, setRecurringStatus] = useState<"current" | "past">("current");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState<Date>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [category, setCategory] = useState<string>("salary");
  const [subjectToCpf, setSubjectToCpf] = useState(true);
  const [familyMemberId, setFamilyMemberId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startCalOpen, setStartCalOpen] = useState(false);
  const [endCalOpen, setEndCalOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setArchetype("recurring");
      setRecurringStatus("current");
      setName("");
      setAmount("");
      setStartDate(startOfMonth(new Date()));
      setEndDate(null);
      setCategory("salary");
      setSubjectToCpf(true);
      setFamilyMemberId("");
      setDescription("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  // Whenever archetype changes, reset recurringStatus to current and clear endDate.
  useEffect(() => {
    if (archetype !== "recurring") setRecurringStatus("current");
    if (archetype === "recurring" && recurringStatus === "current") setEndDate(null);
  }, [archetype, recurringStatus]);

  useEffect(() => {
    // CPF only applies to recurring or temporary income (monthly wages).
    // For one-off, default to OFF; for recurring/temporary, default ON if category is salary.
    if (archetype === "one-off") {
      setSubjectToCpf(false);
    } else {
      setSubjectToCpf(category === "salary");
    }
  }, [archetype, category]);

  const parsedAmount = Number(amount);
  const canStep2 = parsedAmount > 0 && name.trim().length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const member = familyMembers.find((m) => m.id === familyMemberId);
      const familyMemberAge = member?.dateOfBirth
        ? Math.max(0, new Date().getFullYear() - new Date(member.dateOfBirth).getFullYear())
        : undefined;

      const wantsEndDate =
        archetype === "temporary" ||
        (archetype === "recurring" && recurringStatus === "past");

      await createIncome({
        name: name.trim(),
        category,
        incomeCategory: archetype === "one-off" ? "one-off" : "current-recurring",
        amount: parsedAmount,
        frequency: archetype === "one-off" ? "one-time" : "monthly",
        subjectToCpf,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: wantsEndDate && endDate ? format(endDate, "yyyy-MM-dd") : undefined,
        description: description.trim() || undefined,
        familyMemberId: familyMemberId || undefined,
        familyMemberAge,
      });
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create income");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New income</DialogTitle>
          <DialogDescription>
            Step {step} of 3 ·{" "}
            {step === 1 && "Pick the income type"}
            {step === 2 && "Tell us when and how much"}
            {step === 3 && "Optional details"}
          </DialogDescription>
        </DialogHeader>

        <StepDots step={step} />

        {step === 1 && (
          <div className="space-y-3 py-2">
            <ArchetypeChoice
              value={archetype}
              onChange={setArchetype}
              option="recurring"
              icon={InfinityIcon}
              label="Recurring"
              detail="Continuous monthly income with no end date — e.g. salary."
              accent="text-brand-jungle border-brand-jungle/40"
            />
            <ArchetypeChoice
              value={archetype}
              onChange={setArchetype}
              option="one-off"
              icon={Target}
              label="One-off"
              detail="A single payment in a specific month — e.g. annual bonus, refund."
              accent="text-brand-terracotta border-brand-terracotta/40"
            />
            <ArchetypeChoice
              value={archetype}
              onChange={setArchetype}
              option="temporary"
              icon={Clock}
              label="Temporary"
              detail="Recurring monthly income with a fixed end date — e.g. freelance gig."
              accent="text-[#7A5A00] border-[#D4A843]/50"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="creator-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </Label>
              <Input
                id="creator-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Salary, Annual Bonus, Freelance Gig"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creator-amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="creator-amount"
                  type="number"
                  min={0}
                  step="50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 font-display text-lg font-semibold"
                  placeholder="0"
                />
              </div>
            </div>

            {archetype === "recurring" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecurringStatus("current")}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2.5 text-left transition-all",
                      recurringStatus === "current"
                        ? "border-brand-jungle bg-brand-jungle/10"
                        : "border-border/40 bg-card hover:border-border/70"
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">Currently active</p>
                    <p className="text-[11px] text-muted-foreground">
                      I&apos;m still receiving this income.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecurringStatus("past")}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2.5 text-left transition-all",
                      recurringStatus === "past"
                        ? "border-muted-foreground/60 bg-muted"
                        : "border-border/40 bg-card hover:border-border/70"
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">No longer active</p>
                    <p className="text-[11px] text-muted-foreground">
                      I had this income but it&apos;s ended.
                    </p>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {archetype === "one-off"
                    ? "Payment month"
                    : archetype === "recurring" && recurringStatus === "past"
                      ? "Started on"
                      : "Starting"}
                </Label>
                <Popover open={startCalOpen} onOpenChange={setStartCalOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-start font-display">
                      <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                      {format(startDate, "MMM yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => {
                        if (d) {
                          setStartDate(startOfMonth(d));
                          setStartCalOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(archetype === "temporary" ||
                (archetype === "recurring" && recurringStatus === "past")) && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {archetype === "recurring" ? "Ended on" : "Until"}
                  </Label>
                  <Popover open={endCalOpen} onOpenChange={setEndCalOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-start font-display">
                        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                        {endDate ? format(endDate, "MMM yyyy") : "Pick a month"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ?? undefined}
                        onSelect={(d) => {
                          if (d) {
                            setEndDate(startOfMonth(d));
                            setEndCalOpen(false);
                          }
                        }}
                        initialFocus
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
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
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
            </div>

            {familyMembers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Family member (optional)
                </Label>
                <Select value={familyMemberId || "_none"} onValueChange={(v) => setFamilyMemberId(v === "_none" ? "" : v)}>
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
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Subject to CPF</p>
                <p className="text-xs text-muted-foreground">
                  Compute employee + employer CPF on this income.
                </p>
              </div>
              <Switch checked={subjectToCpf} onCheckedChange={setSubjectToCpf} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creator-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notes (optional)
              </Label>
              <Textarea
                id="creator-notes"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any context for future you"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter className="sm:justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => (step === 1 ? onOpenChange(false) : setStep((step - 1) as 1 | 2))}
            disabled={submitting}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep((step + 1) as 2 | 3)}
              disabled={
                step === 2
                  ? !canStep2 ||
                    (archetype === "temporary" && !endDate) ||
                    (archetype === "recurring" && recurringStatus === "past" && !endDate)
                  : false
              }
              className="bg-brand-jungle hover:bg-brand-jungle/90 text-white"
            >
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-brand-terracotta hover:bg-brand-terracotta/90 text-white"
            >
              {submitting ? "Creating…" : "Create income"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1.5 pb-2">
      {[1, 2, 3].map((s) => (
        <span
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all",
            s === step ? "w-8 bg-brand-terracotta" : "w-1.5 bg-border"
          )}
        />
      ))}
    </div>
  );
}

interface ArchetypeChoiceProps {
  value: Archetype;
  onChange: (a: Archetype) => void;
  option: Archetype;
  icon: typeof InfinityIcon;
  label: string;
  detail: string;
  accent: string;
}

function ArchetypeChoice({
  value,
  onChange,
  option,
  icon: Icon,
  label,
  detail,
  accent,
}: ArchetypeChoiceProps) {
  const selected = value === option;
  return (
    <button
      type="button"
      onClick={() => onChange(option)}
      className={cn(
        "w-full text-left rounded-xl border-2 px-4 py-3 transition-all",
        selected
          ? "border-brand-terracotta bg-brand-terracotta/5"
          : "border-border/40 bg-card hover:border-border/70"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-background",
            accent
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="font-display text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
        </div>
      </div>
    </button>
  );
}


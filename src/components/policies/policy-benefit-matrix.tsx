"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  Baby,
  Check,
  Heart,
  User,
  UserCircle,
  Users
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"

interface Policy {
  id: string
  familyMemberId: string | null
  coverageOptions: string | null
  policyType: string
}

interface FamilyMember {
  id: string
  name: string
  relationship: string | null
}

interface BenefitMatrixProps {
  familyMembers: FamilyMember[]
  policies: Policy[]
}

const BENEFIT_COLS = [
  { key: "death", label: "Death", color: "#B8622A" },
  { key: "tpd", label: "TPD", color: "#D4845A" },
  { key: "criticalIllness", label: "Critical Illness", color: "#D4A843" },
  { key: "earlyCriticalIllness", label: "Early CI", color: "#5A9470" },
  { key: "disabilityIncome", label: "Disability Income", color: "#3A6B52" },
  { key: "personalAccident", label: "Personal Accident", color: "#2C3E3D" },
  { key: "hospitalisationPlan", label: "H&S", color: "#00C4AA" }
] as const

type BenefitKey = (typeof BENEFIT_COLS)[number]["key"]

function getAvatarConfig(relationship: string | null) {
  const rel = relationship?.toLowerCase() || ""
  switch (rel) {
    case "self":
      return {
        icon: User,
        bgColor: "bg-brand-terracotta/[0.1]",
        iconColor: "text-on-brand"
      }
    case "spouse":
      return {
        icon: Heart,
        bgColor: "bg-brand-alert-red/[0.12]",
        iconColor: "text-on-danger"
      }
    case "child":
      return {
        icon: Baby,
        bgColor: "bg-brand-teal/[0.12]",
        iconColor: "text-on-success"
      }
    case "parent":
    case "sibling":
      return {
        icon: Users,
        bgColor: "bg-brand-terracotta/[0.1]",
        iconColor: "text-on-brand"
      }
    default:
      return {
        icon: UserCircle,
        bgColor: "bg-muted",
        iconColor: "text-foreground"
      }
  }
}

function parseCoverageOptions(raw: string | null): Record<string, number> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed)) {
      const n = typeof v === "number" ? v : parseFloat(v as string)
      if (!isNaN(n) && n > 0) out[k] = n
    }
    return out
  } catch {
    return {}
  }
}

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n.toLocaleString()}`
}

function memberHasPolicies(memberId: string, policies: Policy[]): boolean {
  return policies.some((p) => p.familyMemberId === memberId)
}

export function PolicyBenefitMatrix({
  familyMembers,
  policies
}: BenefitMatrixProps) {
  // memberId → benefitKey → total sum assured
  const memberBenefits = useMemo(() => {
    const map = new Map<string, Record<BenefitKey, number>>()
    for (const m of familyMembers) {
      map.set(m.id, {
        death: 0,
        tpd: 0,
        criticalIllness: 0,
        earlyCriticalIllness: 0,
        disabilityIncome: 0,
        personalAccident: 0,
        hospitalisationPlan: 0
      })
    }
    for (const p of policies) {
      if (!p.familyMemberId) continue
      const row = map.get(p.familyMemberId)
      if (!row) continue
      const opts = parseCoverageOptions(p.coverageOptions)
      for (const col of BENEFIT_COLS) {
        if (opts[col.key]) row[col.key] += opts[col.key]
      }
      // H&S: any hospitalisation plan type counts as covered even without a dollar amount
      if (
        p.policyType.toLowerCase().includes("hospital") &&
        row.hospitalisationPlan === 0
      ) {
        row.hospitalisationPlan = -1 // sentinel: covered but no dollar amount
      }
    }
    return map
  }, [familyMembers, policies])

  // Only show columns that have any data
  const activeCols = useMemo(
    () =>
      BENEFIT_COLS.filter((col) =>
        familyMembers.some((m) => {
          const row = memberBenefits.get(m.id)
          return row && row[col.key] !== 0
        })
      ),
    [familyMembers, memberBenefits]
  )

  if (activeCols.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-sm">
        No coverage data yet. Add benefit amounts when creating policies to see
        this view.
      </p>
    )
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-background border-border sticky left-0 z-10 min-w-[160px] border-r">
              Family Member
            </TableHead>
            {activeCols.map((col) => (
              <TableHead key={col.key} className="min-w-[130px] text-left">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                  {col.label}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {familyMembers.map((member) => {
            const row = memberBenefits.get(member.id)!
            const hasNoCoverage = !memberHasPolicies(member.id, policies)
            const avatarConfig = getAvatarConfig(member.relationship)
            const AvatarIcon = avatarConfig.icon

            return (
              <TableRow key={member.id} className="hover:bg-muted/30">
                {/* Sticky member name */}
                <TableCell className="bg-background border-border sticky left-0 z-10 border-r py-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${avatarConfig.bgColor}`}>
                      <AvatarIcon
                        className={`h-4 w-4 ${avatarConfig.iconColor}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-foreground truncate text-sm font-medium">
                          {member.name}
                        </span>
                        {hasNoCoverage && (
                          <AlertTriangle className="text-brand-gold h-3.5 w-3.5 flex-shrink-0" />
                        )}
                      </div>
                      {member.relationship && (
                        <span className="text-muted-foreground text-xs capitalize">
                          {member.relationship}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Benefit cells */}
                {activeCols.map((col) => {
                  const val = row[col.key]
                  const isSentinel = val === -1 // covered, no dollar amount
                  const isCovered = val !== 0

                  return (
                    <TableCell key={col.key} className="py-3">
                      {isCovered ? (
                        <div className="flex flex-col gap-0.5">
                          {isSentinel ? (
                            <div className="flex items-center gap-1.5">
                              <Check className="text-on-success h-4 w-4" />
                              <span className="text-on-success text-xs font-medium">
                                Covered
                              </span>
                            </div>
                          ) : (
                            <span
                              className="text-sm font-semibold"
                              style={{ color: col.color }}>
                              {formatAmount(val)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

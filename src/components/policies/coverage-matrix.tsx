"use client"

import { useMemo, useState } from "react"
import { differenceInDays, format, parseISO } from "date-fns"
import {
  AlertTriangle,
  Baby,
  Heart,
  Pencil,
  Plus,
  Trash2,
  User,
  UserCircle,
  Users
} from "lucide-react"

import { CHART_PALETTE } from "@/lib/chart-palette"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
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
  userId: string
  familyMemberId: string | null
  linkedExpenseId: string | null
  provider: string
  planName: string | null
  policyNumber: string | null
  policyType: string
  status: string | null
  startDate: string
  maturityDate: string | null
  coverageUntilAge: number | null
  premiumAmount: string
  premiumAmountCPF: string | null
  premiumFrequency: string
  customMonths: string | null
  totalPremiumDuration: number | null
  coverageOptions: string | null
  cashValue: string | null
  cashValueDate: string | null
  isActive: boolean | null
  description: string | null
  createdAt: Date
  updatedAt: Date
}

interface FamilyMember {
  id: string
  name: string
  relationship: string | null
}

interface CoverageMatrixProps {
  familyMembers: FamilyMember[]
  policies: Policy[]
  onEditPolicy: (policy: Policy) => void
  onDeletePolicy: (policy: Policy) => void
  onAddPolicy: (familyMemberId: string) => void
}

const POLICY_TYPE_COLORS: Record<string, string> = {
  "Whole Life": "#B8622A",
  "Term Life": "#D4845A",
  "Critical Illness": "#D4A843",
  "Disability Insurance": "#3A6B52",
  "Hospitalisation Plan": "#00C4AA",
  Endowment: "#5A9470",
  "Investment-Linked": "#6E8BA8",
  Other: "#8A8A8A"
}

function getPolicyTypeColor(policyType: string): string {
  if (POLICY_TYPE_COLORS[policyType]) return POLICY_TYPE_COLORS[policyType]
  // Deterministic fallback from chart palette
  let hash = 0
  for (let i = 0; i < policyType.length; i++)
    hash = (hash * 31 + policyType.charCodeAt(i)) | 0
  return CHART_PALETTE[Math.abs(hash) % CHART_PALETTE.length]
}

function getAvatarConfig(relationship: string | null) {
  const rel = relationship?.toLowerCase() || ""
  switch (rel) {
    case "self":
      return {
        icon: User,
        bgColor: "bg-[rgba(184,98,42,0.10)]",
        iconColor: "text-on-brand"
      }
    case "spouse":
      return {
        icon: Heart,
        bgColor: "bg-[rgba(224,85,85,0.12)]",
        iconColor: "text-on-danger"
      }
    case "child":
      return {
        icon: Baby,
        bgColor: "bg-[rgba(0,196,170,0.12)]",
        iconColor: "text-on-success"
      }
    case "parent":
    case "sibling":
      return {
        icon: Users,
        bgColor: "bg-[rgba(184,98,42,0.10)]",
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

function getChipExpiryLevel(policy: Policy): "warning" | "critical" | null {
  if (!policy.maturityDate) return null
  const st = (policy.status ?? "active").toLowerCase()
  if (st !== "active") return null
  const days = differenceInDays(parseISO(policy.maturityDate), new Date())
  if (days < 0 || days > 365) return null
  return days < 90 ? "critical" : "warning"
}

function formatPremium(policy: Policy): string {
  const amount = parseFloat(policy.premiumAmount)
  let monthly = amount
  switch (policy.premiumFrequency.toLowerCase()) {
    case "quarterly":
      monthly = amount / 3
      break
    case "annual":
    case "yearly":
      monthly = amount / 12
      break
  }
  return `$${monthly.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo`
}

function getCoverageOptions(policy: Policy) {
  if (!policy.coverageOptions) return []
  try {
    const options = JSON.parse(policy.coverageOptions)
    return Object.entries(options)
      .filter(([, value]) => value && parseFloat(value as string) > 0)
      .map(([key, value]) => ({
        label: key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase())
          .trim(),
        amount: parseFloat(value as string)
      }))
  } catch {
    return []
  }
}

export function CoverageMatrix({
  familyMembers,
  policies,
  onEditPolicy,
  onDeletePolicy,
  onAddPolicy
}: CoverageMatrixProps) {
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)
  const [selectedMemberName, setSelectedMemberName] = useState<string>("")

  // Derive unique policy types from actual data, sorted alphabetically
  const policyTypes = useMemo(() => {
    const types = new Set(policies.map((p) => p.policyType))
    return Array.from(types).sort()
  }, [policies])

  // Build lookup: memberId → policyType → Policy[]
  const coverageMap = useMemo(() => {
    const map = new Map<string, Map<string, Policy[]>>()
    for (const member of familyMembers) {
      map.set(member.id, new Map())
    }
    for (const policy of policies) {
      if (!policy.familyMemberId) continue
      const memberMap = map.get(policy.familyMemberId)
      if (!memberMap) continue
      const existing = memberMap.get(policy.policyType) ?? []
      memberMap.set(policy.policyType, [...existing, policy])
    }
    return map
  }, [familyMembers, policies])

  const handleChipClick = (policy: Policy, memberName: string) => {
    setSelectedPolicy(policy)
    setSelectedMemberName(memberName)
  }

  const handleEdit = () => {
    if (!selectedPolicy) return
    setSelectedPolicy(null)
    onEditPolicy(selectedPolicy)
  }

  const handleDelete = () => {
    if (!selectedPolicy) return
    setSelectedPolicy(null)
    onDeletePolicy(selectedPolicy)
  }

  if (policyTypes.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-sm">
        No policies to display. Add a policy to see the coverage matrix.
      </p>
    )
  }

  return (
    <>
      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {/* Member column header */}
              <TableHead className="bg-background border-border sticky left-0 z-10 min-w-[160px] border-r">
                Family Member
              </TableHead>
              {policyTypes.map((type) => (
                <TableHead key={type} className="min-w-[160px] text-left">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: getPolicyTypeColor(type) }}
                    />
                    {type}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {familyMembers.map((member) => {
              const memberMap = coverageMap.get(member.id)
              const totalPolicies = Array.from(memberMap?.values() ?? []).flat()
                .length
              const hasNoCoverage = totalPolicies === 0
              const avatarConfig = getAvatarConfig(member.relationship)
              const AvatarIcon = avatarConfig.icon

              return (
                <TableRow key={member.id} className="hover:bg-muted/30">
                  {/* Member name cell — sticky */}
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
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-[#D4A843]" />
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

                  {/* Coverage cells */}
                  {policyTypes.map((type) => {
                    const cellPolicies = memberMap?.get(type) ?? []
                    const typeColor = getPolicyTypeColor(type)

                    return (
                      <TableCell key={type} className="py-3 align-top">
                        {cellPolicies.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {cellPolicies.map((policy) => (
                              <button
                                key={policy.id}
                                onClick={() =>
                                  handleChipClick(policy, member.name)
                                }
                                className="border-border bg-card hover:border-border/60 hover:ring-border/30 flex w-full cursor-pointer flex-col gap-0.5 rounded-lg border px-2.5 py-2 text-left ring-1 ring-transparent transition-all hover:shadow-sm"
                                style={{
                                  borderLeftWidth: 3,
                                  borderLeftColor: typeColor
                                }}>
                                <span className="flex items-center gap-1">
                                  <span className="text-foreground truncate text-xs leading-tight font-medium">
                                    {policy.provider}
                                  </span>
                                  {getChipExpiryLevel(policy) ===
                                    "critical" && (
                                    <AlertTriangle className="text-on-danger h-3 w-3 flex-shrink-0" />
                                  )}
                                  {getChipExpiryLevel(policy) === "warning" && (
                                    <AlertTriangle className="h-3 w-3 flex-shrink-0 text-[#7A5C00]" />
                                  )}
                                </span>
                                {policy.planName && (
                                  <span className="text-muted-foreground truncate text-[10px] leading-tight">
                                    {policy.planName}
                                  </span>
                                )}
                                <span className="text-on-success text-xs font-medium">
                                  {formatPremium(policy)}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="group flex items-center">
                            <span className="text-muted-foreground text-sm group-hover:hidden">
                              —
                            </span>
                            <button
                              onClick={() => onAddPolicy(member.id)}
                              className="text-muted-foreground hover:text-primary hidden cursor-pointer items-center gap-1 text-xs transition-colors group-hover:flex">
                              <Plus className="h-3 w-3" />
                              Add
                            </button>
                          </div>
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

      {/* Policy detail dialog */}
      <Dialog
        open={!!selectedPolicy}
        onOpenChange={(open) => !open && setSelectedPolicy(null)}>
        {selectedPolicy && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {selectedPolicy.policyType}
              </DialogTitle>
              <DialogDescription>
                {selectedMemberName}&apos;s policy with{" "}
                {selectedPolicy.provider}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Policy
                </Button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="text-on-brand border-[rgba(184,98,42,0.25)] text-xs font-medium">
                  {selectedPolicy.provider}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-on-success border-[rgba(0,196,170,0.25)] bg-[rgba(0,196,170,0.12)] text-xs font-medium uppercase">
                  {selectedPolicy.status || "Active"}
                </Badge>
                {selectedPolicy.linkedExpenseId && (
                  <Badge
                    variant="outline"
                    className="text-on-success border-[rgba(0,196,170,0.25)] text-xs font-medium">
                    In Expenses
                  </Badge>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedPolicy.policyNumber && (
                  <div>
                    <p className="text-muted-foreground">Policy Number</p>
                    <p className="font-medium">{selectedPolicy.policyNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedPolicy.startDate), "MMM d, yyyy")}
                  </p>
                </div>
                {selectedPolicy.maturityDate && (
                  <div>
                    <p className="text-muted-foreground">End Date</p>
                    <p className="font-medium">
                      {format(
                        new Date(selectedPolicy.maturityDate),
                        "MMM d, yyyy"
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Premium</p>
                  <p className="text-on-success font-medium">
                    $
                    {parseFloat(selectedPolicy.premiumAmount).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}{" "}
                    /{selectedPolicy.premiumFrequency.toLowerCase()}
                  </p>
                </div>
                {selectedPolicy.totalPremiumDuration && (
                  <div>
                    <p className="text-muted-foreground">Premium Duration</p>
                    <p className="font-medium">
                      {selectedPolicy.totalPremiumDuration} years
                    </p>
                  </div>
                )}
                {selectedPolicy.coverageUntilAge && (
                  <div>
                    <p className="text-muted-foreground">Coverage Until Age</p>
                    <p className="font-medium">
                      {selectedPolicy.coverageUntilAge}
                    </p>
                  </div>
                )}
              </div>

              {/* Coverage options */}
              {(() => {
                const coverages = getCoverageOptions(selectedPolicy)
                return coverages.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Coverage</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {coverages.map((c, i) => (
                        <div key={i}>
                          <p className="text-muted-foreground">{c.label}</p>
                          <p className="font-medium">
                            $
                            {c.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Description */}
              {selectedPolicy.description && (
                <div>
                  <p className="mb-1 text-sm font-medium">Notes</p>
                  <p className="text-muted-foreground text-sm">
                    {selectedPolicy.description}
                  </p>
                </div>
              )}

              {/* Delete */}
              <div className="border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-on-danger hover:text-on-danger w-full">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Policy
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

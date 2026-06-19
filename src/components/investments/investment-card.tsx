"use client"

import { useState } from "react"
import {
  Banknote,
  BarChart3,
  Bitcoin,
  Building2,
  Expand,
  FileText,
  Pencil,
  PieChart,
  Trash2,
  TrendingUp
} from "lucide-react"

import type { Investment } from "@/db/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

interface InvestmentCardProps {
  investment: Investment
  onEdit?: () => void
  onDelete?: () => void
}

const INVESTMENT_TYPE_CONFIG: Record<
  string,
  { icon: typeof TrendingUp; color: string; bgColor: string; label: string }
> = {
  stock: {
    icon: TrendingUp,
    color: "text-on-brand",
    bgColor: "bg-brand-terracotta/[0.1]",
    label: "Stock"
  },
  cash: {
    icon: Banknote,
    color: "text-on-success",
    bgColor: "bg-brand-teal/[0.12]",
    label: "Cash"
  },
  bonds: {
    icon: FileText,
    color: "text-on-warning",
    bgColor: "bg-brand-gold/[0.15]",
    label: "Bonds"
  },
  etf: {
    icon: BarChart3,
    color: "text-on-brand",
    bgColor: "bg-brand-terracotta/[0.1]",
    label: "ETF"
  },
  crypto: {
    icon: Bitcoin,
    color: "text-on-brand",
    bgColor: "bg-brand-terracotta/[0.1]",
    label: "Crypto"
  },
  mutual_fund: {
    icon: PieChart,
    color: "text-on-brand",
    bgColor: "bg-brand-terracotta/[0.1]",
    label: "Mutual Fund"
  },
  reit: {
    icon: Building2,
    color: "text-foreground",
    bgColor: "bg-muted",
    label: "REIT"
  }
}

export function InvestmentCard({
  investment,
  onEdit,
  onDelete
}: InvestmentCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const config = INVESTMENT_TYPE_CONFIG[investment.type] || {
    icon: TrendingUp,
    color: "text-foreground",
    bgColor: "bg-muted",
    label: investment.type
  }
  const Icon = config.icon

  const capital = parseFloat(investment.currentCapital)
  const yield_ = parseFloat(investment.projectedYield)
  const contribution = parseFloat(investment.contributionAmount)

  // Calculate monthly contribution for display
  let monthlyContribution = contribution
  if (
    investment.contributionFrequency === "custom" &&
    investment.customMonths
  ) {
    try {
      const months = JSON.parse(investment.customMonths) as number[]
      monthlyContribution = (contribution * months.length) / 12
    } catch {
      // Keep original if parsing fails
    }
  }

  return (
    <>
      <div
        className="bg-card border-border relative cursor-pointer rounded-lg border p-4 transition-shadow hover:shadow-md"
        onClick={() => setIsModalOpen(true)}>
        {/* Expand Icon */}
        <Expand className="text-muted-foreground absolute top-3 right-3 h-3.5 w-3.5" />

        {/* Header with Icon */}
        <div className="mb-3 flex items-start gap-3 pr-6">
          <div className={`rounded-lg p-2.5 ${config.bgColor}`}>
            <Icon className={`size-5 ${config.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground truncate font-semibold">
              {investment.name}
            </h3>
            <Badge
              variant="outline"
              className={`text-xs font-medium ${config.color} mt-1 border-current`}>
              {config.label}
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-foreground/400 text-xs tracking-wide uppercase">
              Capital
            </p>
            <p className="text-foreground font-semibold">
              $
              {capital.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </p>
          </div>
          <div>
            <p className="text-foreground/400 text-xs tracking-wide uppercase">
              Yield
            </p>
            <p className="text-on-success font-semibold">
              {yield_.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-foreground/400 text-xs tracking-wide uppercase">
              Monthly
            </p>
            <p className="text-foreground font-semibold">
              $
              {monthlyContribution.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className={`rounded-lg p-2 ${config.bgColor}`}>
                <Icon className={`size-5 ${config.color}`} />
              </div>
              {investment.name}
            </DialogTitle>
            <DialogDescription>Investment details</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            {/* Type Badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${config.color} border-current`}>
                {config.label}
              </Badge>
              {investment.isActive ? (
                <Badge
                  variant="outline"
                  className="text-on-success border-brand-teal/[0.25] bg-brand-teal/[0.12]">
                  Active
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-muted-foreground border-border">
                  Inactive
                </Badge>
              )}
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-foreground/400 mb-1 text-xs tracking-wide uppercase">
                  Current Capital
                </p>
                <p className="text-foreground text-xl font-bold">
                  $
                  {capital.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="bg-brand-teal/[0.12] rounded-lg p-3">
                <p className="text-foreground/400 mb-1 text-xs tracking-wide uppercase">
                  Projected Yield
                </p>
                <p className="text-on-success text-xl font-bold">
                  {yield_.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Contribution Details */}
            <div className="space-y-2">
              <p className="text-foreground text-sm font-medium">
                Contributions
              </p>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Amount</span>
                  <span className="font-semibold">
                    $
                    {contribution.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-foreground">Frequency</span>
                  <span className="font-semibold capitalize">
                    {investment.contributionFrequency}
                    {investment.contributionFrequency === "custom" &&
                      investment.customMonths && (
                        <span className="text-foreground/400 ml-1 font-normal">
                          ({JSON.parse(investment.customMonths).length}x/year)
                        </span>
                      )}
                  </span>
                </div>
                {investment.contributionFrequency === "custom" && (
                  <div className="border-border mt-2 flex items-center justify-between border-t pt-2">
                    <span className="text-foreground">Avg. Monthly</span>
                    <span className="font-semibold">
                      $
                      {monthlyContribution.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsModalOpen(false)
                  onEdit?.()
                }}>
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="text-on-danger hover:text-on-danger hover:bg-brand-alert-red/[0.12] flex-1"
                onClick={() => {
                  setIsModalOpen(false)
                  onDelete?.()
                }}>
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

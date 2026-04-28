"use client";

import { useState } from "react";
import {
  TrendingUp,
  Banknote,
  FileText,
  BarChart3,
  Bitcoin,
  PieChart,
  Building2,
  Trash2,
  Pencil,
  Expand,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Investment {
  id: string;
  name: string;
  type: string;
  currentCapital: string;
  projectedYield: string;
  contributionAmount: string;
  contributionFrequency: string;
  customMonths: string | null;
  isActive: boolean | null;
}

interface InvestmentCardProps {
  investment: Investment;
  onEdit?: () => void;
  onDelete?: () => void;
}

const INVESTMENT_TYPE_CONFIG: Record<
  string,
  { icon: typeof TrendingUp; color: string; bgColor: string; label: string }
> = {
  stock: {
    icon: TrendingUp,
    color: "text-[#7A3A0A]",
    bgColor: "bg-[rgba(184,98,42,0.10)]",
    label: "Stock",
  },
  cash: {
    icon: Banknote,
    color: "text-[#007A68]",
    bgColor: "bg-[rgba(0,196,170,0.12)]",
    label: "Cash",
  },
  bonds: {
    icon: FileText,
    color: "text-[#7A5A00]",
    bgColor: "bg-[rgba(212,168,67,0.15)]",
    label: "Bonds",
  },
  etf: {
    icon: BarChart3,
    color: "text-[#7A3A0A]",
    bgColor: "bg-[rgba(184,98,42,0.10)]",
    label: "ETF",
  },
  crypto: {
    icon: Bitcoin,
    color: "text-[#7A3A0A]",
    bgColor: "bg-[rgba(184,98,42,0.10)]",
    label: "Crypto",
  },
  mutual_fund: {
    icon: PieChart,
    color: "text-[#7A3A0A]",
    bgColor: "bg-[rgba(184,98,42,0.10)]",
    label: "Mutual Fund",
  },
  reit: {
    icon: Building2,
    color: "text-foreground",
    bgColor: "bg-muted",
    label: "REIT",
  },
};

export function InvestmentCard({
  investment,
  onEdit,
  onDelete,
}: InvestmentCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const config = INVESTMENT_TYPE_CONFIG[investment.type] || {
    icon: TrendingUp,
    color: "text-foreground",
    bgColor: "bg-muted",
    label: investment.type,
  };
  const Icon = config.icon;

  const capital = parseFloat(investment.currentCapital);
  const yield_ = parseFloat(investment.projectedYield);
  const contribution = parseFloat(investment.contributionAmount);

  // Calculate monthly contribution for display
  let monthlyContribution = contribution;
  if (investment.contributionFrequency === "custom" && investment.customMonths) {
    try {
      const months = JSON.parse(investment.customMonths) as number[];
      monthlyContribution = (contribution * months.length) / 12;
    } catch {
      // Keep original if parsing fails
    }
  }

  return (
    <>
      <div
        className="bg-white rounded-lg border border-border p-4 hover:shadow-md transition-shadow relative cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Expand Icon */}
        <Expand className="h-3.5 w-3.5 text-muted-foreground absolute top-3 right-3" />

        {/* Header with Icon */}
        <div className="flex items-start gap-3 mb-3 pr-6">
          <div className={`p-2.5 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {investment.name}
            </h3>
            <Badge
              variant="outline"
              className={`text-xs font-medium ${config.color} border-current mt-1`}
            >
              {config.label}
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-foreground/400 text-xs uppercase tracking-wide">Capital</p>
            <p className="font-semibold text-foreground">
              ${capital.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-foreground/400 text-xs uppercase tracking-wide">Yield</p>
            <p className="font-semibold text-[#007A68]">{yield_.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-foreground/400 text-xs uppercase tracking-wide">Monthly</p>
            <p className="font-semibold text-foreground">
              ${monthlyContribution.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.bgColor}`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              {investment.name}
            </DialogTitle>
            <DialogDescription>Investment details</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Type Badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${config.color} border-current`}
              >
                {config.label}
              </Badge>
              {investment.isActive ? (
                <Badge variant="outline" className="text-[#007A68] border-[rgba(0,196,170,0.25)] bg-[rgba(0,196,170,0.12)]">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground border-border">
                  Inactive
                </Badge>
              )}
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-foreground/400 uppercase tracking-wide mb-1">
                  Current Capital
                </p>
                <p className="text-xl font-bold text-foreground">
                  ${capital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-[rgba(0,196,170,0.12)] rounded-lg p-3">
                <p className="text-xs text-foreground/400 uppercase tracking-wide mb-1">
                  Projected Yield
                </p>
                <p className="text-xl font-bold text-[#007A68]">
                  {yield_.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Contribution Details */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Contributions</p>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-foreground">Amount</span>
                  <span className="font-semibold">
                    ${contribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-foreground">Frequency</span>
                  <span className="font-semibold capitalize">
                    {investment.contributionFrequency}
                    {investment.contributionFrequency === "custom" &&
                      investment.customMonths && (
                        <span className="text-foreground/400 font-normal ml-1">
                          ({JSON.parse(investment.customMonths).length}x/year)
                        </span>
                      )}
                  </span>
                </div>
                {investment.contributionFrequency === "custom" && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                    <span className="text-foreground">Avg. Monthly</span>
                    <span className="font-semibold">
                      ${monthlyContribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsModalOpen(false);
                  onEdit?.();
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-[#8B0000] hover:text-[#8B0000] hover:bg-[rgba(224,85,85,0.12)]"
                onClick={() => {
                  setIsModalOpen(false);
                  onDelete?.();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

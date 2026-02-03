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
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Stock",
  },
  cash: {
    icon: Banknote,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Cash",
  },
  bonds: {
    icon: FileText,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    label: "Bonds",
  },
  etf: {
    icon: BarChart3,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    label: "ETF",
  },
  crypto: {
    icon: Bitcoin,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    label: "Crypto",
  },
  mutual_fund: {
    icon: PieChart,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    label: "Mutual Fund",
  },
  reit: {
    icon: Building2,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
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
    color: "text-gray-600",
    bgColor: "bg-gray-100",
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
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow relative cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Expand Icon */}
        <Expand className="h-3.5 w-3.5 text-gray-400 absolute top-3 right-3" />

        {/* Header with Icon */}
        <div className="flex items-start gap-3 mb-3 pr-6">
          <div className={`p-2.5 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
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
            <p className="text-gray-500 text-xs uppercase tracking-wide">Capital</p>
            <p className="font-semibold text-gray-900">
              ${capital.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Yield</p>
            <p className="font-semibold text-green-600">{yield_.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Monthly</p>
            <p className="font-semibold text-gray-900">
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
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-400 border-gray-200">
                  Inactive
                </Badge>
              )}
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Current Capital
                </p>
                <p className="text-xl font-bold text-gray-900">
                  ${capital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Projected Yield
                </p>
                <p className="text-xl font-bold text-green-600">
                  {yield_.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Contribution Details */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Contributions</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-semibold">
                    ${contribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">Frequency</span>
                  <span className="font-semibold capitalize">
                    {investment.contributionFrequency}
                    {investment.contributionFrequency === "custom" &&
                      investment.customMonths && (
                        <span className="text-gray-500 font-normal ml-1">
                          ({JSON.parse(investment.customMonths).length}x/year)
                        </span>
                      )}
                  </span>
                </div>
                {investment.contributionFrequency === "custom" && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Avg. Monthly</span>
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
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
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

"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CpfByFamilyMember } from "@/lib/actions/cpf";
import {
  extractCpfProjectionInputs,
  calculateCpfProjection,
  extractCpfLoanDeductions,
  type CpfProjectionInput,
  type CpfProjectionDataPoint,
  type CpfPropertyAsset,
} from "@/lib/cpf-projection-calculator";

// Income type matching client.tsx
interface Income {
  id: string;
  familyMemberId: string | null;
  amount: string;
  subjectToCpf: boolean | null;
  isActive: boolean | null;
  accountForBonus: boolean | null;
  bonusGroups: string | null;
  familyMember: {
    id: string;
    name: string;
    dateOfBirth: string | null;
  } | null;
  [key: string]: unknown;
}

interface CpfProjectionGraphProps {
  cpfData: CpfByFamilyMember[];
  incomes: Income[];
  propertyAssets?: CpfPropertyAsset[];
}

const TIME_RANGES = [
  { value: "12", label: "12 Months" },
  { value: "24", label: "24 Months" },
  { value: "36", label: "3 Years" },
  { value: "60", label: "5 Years" },
  { value: "120", label: "10 Years" },
  { value: "240", label: "20 Years" },
];

const MEMBER_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getDataKeys(
  inputs: CpfProjectionInput[],
  viewMode: "cumulative" | "non-cumulative",
  breakdownMode: "total" | "oa-sa-ma"
): {
  key: string;
  name: string;
  color: string;
  strokeDasharray?: string;
}[] {
  const prefix = viewMode === "cumulative" ? "" : "monthly_";
  const keys: {
    key: string;
    name: string;
    color: string;
    strokeDasharray?: string;
  }[] = [];

  inputs.forEach((input, idx) => {
    const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
    if (breakdownMode === "total") {
      keys.push({
        key: `member_${input.familyMemberId}_${prefix}total`,
        name: input.familyMemberName,
        color,
      });
    } else {
      keys.push({
        key: `member_${input.familyMemberId}_${prefix}oa`,
        name: `${input.familyMemberName} (OA)`,
        color,
      });
      keys.push({
        key: `member_${input.familyMemberId}_${prefix}sa`,
        name: `${input.familyMemberName} (SA)`,
        color,
        strokeDasharray: "8 4",
      });
      keys.push({
        key: `member_${input.familyMemberId}_${prefix}ma`,
        name: `${input.familyMemberName} (MA)`,
        color,
        strokeDasharray: "2 2",
      });
    }
  });

  // Add household total when multiple members
  if (inputs.length > 1) {
    if (breakdownMode === "total") {
      const householdKey =
        viewMode === "cumulative" ? "householdTotal" : "householdMonthlyTotal";
      keys.push({
        key: householdKey,
        name: "Household Total",
        color: "#8b5cf6", // violet-500
      });
    } else {
      const oaKey =
        viewMode === "cumulative" ? "householdOa" : "householdMonthlyOa";
      const saKey =
        viewMode === "cumulative" ? "householdSa" : "householdMonthlySa";
      const maKey =
        viewMode === "cumulative" ? "householdMa" : "householdMonthlyMa";
      keys.push({
        key: oaKey,
        name: "Household (OA)",
        color: "#8b5cf6",
      });
      keys.push({
        key: saKey,
        name: "Household (SA)",
        color: "#8b5cf6",
        strokeDasharray: "8 4",
      });
      keys.push({
        key: maKey,
        name: "Household (MA)",
        color: "#8b5cf6",
        strokeDasharray: "2 2",
      });
    }
  }

  return keys;
}

function CustomTooltip({
  active,
  payload,
  inputs,
  viewMode,
  breakdownMode,
}: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as CpfProjectionDataPoint;
  const prefix = viewMode === "cumulative" ? "" : "monthly_";

  // Check if there are any loan deductions in this data point
  const householdDeduction = (viewMode === "cumulative"
    ? data.householdLoanDeduction
    : data.householdMonthlyLoanDeduction) as number ?? 0;
  const hasDeductions = householdDeduction > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs">
      <p className="font-semibold text-gray-900 mb-2">{data.month}</p>
      <div className="space-y-2 text-sm">
        {(inputs as CpfProjectionInput[]).map(
          (input: CpfProjectionInput, idx: number) => {
            const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
            const total = (data[
              `member_${input.familyMemberId}_${prefix}total`
            ] ?? 0) as number;
            const oa = (data[
              `member_${input.familyMemberId}_${prefix}oa`
            ] ?? 0) as number;
            const sa = (data[
              `member_${input.familyMemberId}_${prefix}sa`
            ] ?? 0) as number;
            const ma = (data[
              `member_${input.familyMemberId}_${prefix}ma`
            ] ?? 0) as number;
            const loanDeduction = (data[
              `member_${input.familyMemberId}_${prefix}loan_deduction`
            ] ?? 0) as number;
            const earned = total + loanDeduction;

            return (
              <div key={input.familyMemberId}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium">{input.familyMemberName}</span>
                </div>
                {breakdownMode === "total" ? (
                  loanDeduction > 0 ? (
                    <div className="ml-4 text-gray-600 space-y-0.5">
                      <p className="text-emerald-600">CPF Earned: {formatCurrency(earned)}</p>
                      <p className="text-amber-600">Loan (OA): -{formatCurrency(loanDeduction)}</p>
                      <p className="font-medium text-gray-900">Balance: {formatCurrency(total)}</p>
                    </div>
                  ) : (
                    <p className="ml-4 text-gray-600">
                      Total: {formatCurrency(total)}
                    </p>
                  )
                ) : (
                  <div className="ml-4 text-gray-600 space-y-0.5">
                    {loanDeduction > 0 && (
                      <>
                        <p className="text-emerald-600">CPF Earned: {formatCurrency(earned)}</p>
                        <p className="text-amber-600">Loan (OA): -{formatCurrency(loanDeduction)}</p>
                        <div className="h-px bg-gray-100 my-0.5" />
                      </>
                    )}
                    <p>OA: {formatCurrency(oa)}</p>
                    <p>SA: {formatCurrency(sa)}</p>
                    <p>MA: {formatCurrency(ma)}</p>
                  </div>
                )}
              </div>
            );
          }
        )}

        {(inputs as CpfProjectionInput[]).length > 1 && (
          <div className="pt-1.5 border-t border-gray-200">
            {hasDeductions ? (
              <div className="space-y-0.5">
                <p className="text-emerald-600">
                  Household Earned:{" "}
                  {formatCurrency(
                    ((viewMode === "cumulative"
                      ? data.householdTotal
                      : data.householdMonthlyTotal) as number) + householdDeduction
                  )}
                </p>
                <p className="text-amber-600">
                  Loan (OA): -{formatCurrency(householdDeduction)}
                </p>
                <p className="font-medium text-gray-900">
                  Balance:{" "}
                  {formatCurrency(
                    (viewMode === "cumulative"
                      ? data.householdTotal
                      : data.householdMonthlyTotal) as number
                  )}
                </p>
              </div>
            ) : (
              <span className="font-medium text-gray-900">
                Household:{" "}
                {formatCurrency(
                  (viewMode === "cumulative"
                    ? data.householdTotal
                    : data.householdMonthlyTotal) as number
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CpfProjectionGraph({
  cpfData,
  incomes,
  propertyAssets = [],
}: CpfProjectionGraphProps) {
  const [timeRange, setTimeRange] = useState("12");
  const [viewMode, setViewMode] = useState<"cumulative" | "non-cumulative">(
    "cumulative"
  );
  const [breakdownMode, setBreakdownMode] = useState<"total" | "oa-sa-ma">(
    "total"
  );

  const inputs = useMemo(
    () => extractCpfProjectionInputs(cpfData, incomes),
    [cpfData, incomes]
  );

  const loanDeductions = useMemo(
    () => extractCpfLoanDeductions(propertyAssets),
    [propertyAssets]
  );

  const projectionData = useMemo(
    () => calculateCpfProjection(inputs, parseInt(timeRange), loanDeductions),
    [inputs, timeRange, loanDeductions]
  );

  const dataKeys = useMemo(
    () => getDataKeys(inputs, viewMode, breakdownMode),
    [inputs, viewMode, breakdownMode]
  );

  if (inputs.length === 0) return null;

  // Summary stats
  const lastPoint = projectionData[projectionData.length - 1];
  const firstMonthlyPoint = projectionData.length > 1 ? projectionData[1] : null;
  const monthlyHouseholdCpf = firstMonthlyPoint
    ? (firstMonthlyPoint.householdMonthlyTotal as number)
    : 0;
  const projectedTotal = (lastPoint?.householdTotal as number) ?? 0;

  // Y-axis domain
  const allValues = projectionData.flatMap((d) =>
    dataKeys.map((dk) => (d[dk.key] as number) ?? 0)
  );
  const maxVal = Math.max(...allValues, 0);
  const minVal = Math.min(...allValues, 0);
  const padding = Math.max(Math.abs(maxVal), Math.abs(minVal)) * 0.1;
  const yAxisMax = Math.ceil((maxVal + padding) / 1000) * 1000;
  const yAxisMin = Math.floor((minVal - padding) / 1000) * 1000;

  // Long duration: hide dots, space X ticks
  const isLongDuration =
    timeRange === "60" || timeRange === "120" || timeRange === "240";
  const xAxisInterval = isLongDuration
    ? Math.floor(projectionData.length / 10)
    : 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl sm:text-3xl font-black">
                CPF Balance Projection
              </CardTitle>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="max-w-[300px] text-xs bg-white border shadow-lg"
                  >
                    <p>
                      Projects CPF balance growth based on current income,
                      age-based contribution rates, and bonus schedules.
                      Contribution rates change automatically as members age
                      through CPF age brackets.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription className="mt-0.5 text-xs sm:text-sm">
              {viewMode === "cumulative"
                ? "Cumulative CPF balance projection with age-aware rate changes"
                : "Monthly CPF contribution breakdown"}
            </CardDescription>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-4">
            {/* View Mode */}
            <div className="space-y-1 sm:space-y-2 sm:min-w-[150px]">
              <Label
                htmlFor="cpfViewMode"
                className="text-xs sm:text-sm font-medium"
              >
                View Mode
              </Label>
              <Select
                value={viewMode}
                onValueChange={(v: "cumulative" | "non-cumulative") =>
                  setViewMode(v)
                }
              >
                <SelectTrigger
                  id="cpfViewMode"
                  className="bg-white text-xs sm:text-sm h-9 sm:h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cumulative">Cumulative</SelectItem>
                  <SelectItem value="non-cumulative">Non-Cumulative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Breakdown */}
            <div className="space-y-1 sm:space-y-2 sm:min-w-[150px]">
              <Label
                htmlFor="cpfBreakdown"
                className="text-xs sm:text-sm font-medium"
              >
                Breakdown
              </Label>
              <Select
                value={breakdownMode}
                onValueChange={(v: "total" | "oa-sa-ma") =>
                  setBreakdownMode(v)
                }
              >
                <SelectTrigger
                  id="cpfBreakdown"
                  className="bg-white text-xs sm:text-sm h-9 sm:h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total per Person</SelectItem>
                  <SelectItem value="oa-sa-ma">OA / SA / MA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Range */}
            <div className="space-y-1 sm:space-y-2 sm:min-w-[150px]">
              <Label
                htmlFor="cpfTimeRange"
                className="text-xs sm:text-sm font-medium"
              >
                Time Range
              </Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger
                  id="cpfTimeRange"
                  className="bg-white text-xs sm:text-sm h-9 sm:h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4">
          <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
            <p className="text-xs text-gray-600 mb-0.5">
              Monthly Household CPF
            </p>
            <p className="text-sm sm:text-lg font-semibold text-gray-900">
              {formatCurrency(monthlyHouseholdCpf)}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 sm:p-3">
            <p className="text-xs text-gray-600 mb-0.5">
              Projected Cumulative
            </p>
            <p className="text-sm sm:text-lg font-semibold text-blue-700">
              {formatCurrency(projectedTotal)}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 sm:p-3">
            <p className="text-xs text-gray-600 mb-0.5">Net Change</p>
            <p className="text-sm sm:text-lg font-semibold text-green-700">
              +{formatCurrency(projectedTotal)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={projectionData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                {inputs.map((input, idx) => {
                  const color = MEMBER_COLORS[idx % MEMBER_COLORS.length];
                  return (
                    <linearGradient
                      key={input.familyMemberId}
                      id={`cpfGradient_${input.familyMemberId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={color}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={color}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
                angle={-45}
                textAnchor="end"
                height={80}
                tickLine={false}
                interval={xAxisInterval}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
                tickFormatter={(value) => formatCurrency(value)}
                domain={[yAxisMin, yAxisMax]}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                content={
                  <CustomTooltip
                    inputs={inputs}
                    viewMode={viewMode}
                    breakdownMode={breakdownMode}
                  />
                }
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                content={({ payload }) => (
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-sm">
                    {payload?.map((entry, index) => {
                      const dk = dataKeys[index];
                      return (
                        <div key={index} className="flex items-center gap-1.5">
                          <div
                            className="w-3 h-0.5"
                            style={{
                              backgroundColor: entry.color,
                              borderTop: dk?.strokeDasharray
                                ? `2px dashed ${entry.color}`
                                : `2px solid ${entry.color}`,
                            }}
                          />
                          <span className="text-gray-600">{entry.value}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              />

              {dataKeys.map((dk) => {
                // Household total lines get no fill
                const isHousehold = dk.key.startsWith("household");
                const memberId = isHousehold
                  ? null
                  : dk.key.split("_")[1];
                const fillId =
                  isHousehold || dk.strokeDasharray
                    ? "none"
                    : `url(#cpfGradient_${memberId})`;

                return (
                  <Area
                    key={dk.key}
                    type="monotone"
                    dataKey={dk.key}
                    stroke={dk.color}
                    strokeWidth={isHousehold ? 2.5 : 2}
                    strokeDasharray={dk.strokeDasharray}
                    dot={isLongDuration ? false : { fill: dk.color, r: 2 }}
                    activeDot={{ r: 4 }}
                    fillOpacity={fillId === "none" ? 0 : 1}
                    fill={fillId}
                    name={dk.name}
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getBudgetForMonth } from "@/src/api/budget";
import { listGoals } from "@/src/api/goals";
import { listIncomes } from "@/src/api/incomes";
import { useApiClient } from "@/src/lib/use-api-client";
import { Card } from "@/src/ui/Card";
import { DataNumber, formatMoney } from "@/src/ui/DataNumber";
import { MotifStrip } from "@/src/ui/MotifStrip";
import { ProgressBar } from "@/src/ui/ProgressBar";
import { SectionLabel } from "@/src/ui/SectionLabel";
import { StatusPill } from "@/src/ui/StatusPill";

const PACING_VARIANT: Record<
  "under" | "on-track" | "over",
  { variant: "success" | "warning" | "danger" | "brand"; label: string }
> = {
  under: { variant: "success", label: "Underspending" },
  "on-track": { variant: "brand", label: "On track" },
  over: { variant: "danger", label: "Overspending" },
};

export default function OverviewScreen() {
  const insets = useSafeAreaInsets();
  const apiClient = useApiClient();

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const budgetQuery = useQuery({
    queryKey: ["budget", year, month],
    queryFn: () => getBudgetForMonth(apiClient, { year, month }),
  });
  const incomesQuery = useQuery({
    queryKey: ["incomes"],
    queryFn: () => listIncomes(apiClient),
  });
  const activeGoalsQuery = useQuery({
    queryKey: ["goals", { isActive: true, isAchieved: false }],
    queryFn: () => listGoals(apiClient, { isActive: true, isAchieved: false }),
  });

  const onRefresh = () =>
    Promise.all([
      budgetQuery.refetch(),
      incomesQuery.refetch(),
      activeGoalsQuery.refetch(),
    ]);

  const isLoading =
    budgetQuery.isPending ||
    incomesQuery.isPending ||
    activeGoalsQuery.isPending;
  const isRefreshing =
    (budgetQuery.isFetching && !budgetQuery.isPending) ||
    (incomesQuery.isFetching && !incomesQuery.isPending) ||
    (activeGoalsQuery.isFetching && !activeGoalsQuery.isPending);

  const monthlyIncome = useMemo(() => {
    const rows = incomesQuery.data ?? [];
    return rows
      .filter((r) => r.isActive !== false && r.incomeCategory === "current")
      .reduce((acc, r) => acc + (Number.parseFloat(r.amount) || 0), 0);
  }, [incomesQuery.data]);

  const monthlyExpenses = budgetQuery.data?.summary.totalBudget ?? 0;
  const spentThisMonth = budgetQuery.data?.summary.totalSpent ?? 0;
  const netMonthly = monthlyIncome - monthlyExpenses;

  const topGoal = useMemo(() => {
    const goals = [...(activeGoalsQuery.data ?? [])].sort((a, b) => {
      if (a.goalType !== b.goalType) return a.goalType === "primary" ? -1 : 1;
      return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    });
    return goals[0];
  }, [activeGoalsQuery.data]);

  const monthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#B8622A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <MotifStrip variant="thick" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#B8622A"
          />
        }
      >
        <View className="px-5 pt-5 pb-3 gap-1">
          <SectionLabel>{monthLabel}</SectionLabel>
          <Text
            className="font-editorial text-foreground"
            style={{ fontSize: 22, lineHeight: 30 }}
          >
            Today at a glance.
          </Text>
        </View>

        <View className="px-5 gap-5">
          <Card padding="md" className="gap-3">
            <SectionLabel>Net this month</SectionLabel>
            <DataNumber
              size="xl"
              style={{ color: netMonthly < 0 ? "#8B0000" : "#1C2B2A" }}
            >
              {netMonthly >= 0 ? "+" : "−"}
              {formatMoney(Math.abs(netMonthly), { decimals: 0 })}
            </DataNumber>
            <View className="flex-row gap-4 pt-1">
              <View className="flex-1">
                <Text className="text-xs text-foreground/55">Income</Text>
                <Text className="font-display-medium text-tint-success-fg text-base">
                  +{formatMoney(monthlyIncome, { decimals: 0 })}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-foreground/55">Expenses</Text>
                <Text className="font-display-medium text-foreground text-base">
                  −{formatMoney(monthlyExpenses, { decimals: 0 })}
                </Text>
              </View>
            </View>
          </Card>

          {budgetQuery.data ? (
            <Card padding="md" className="gap-3">
              <View className="flex-row items-center justify-between">
                <SectionLabel>Budget pacing</SectionLabel>
                <StatusPill
                  label={PACING_VARIANT[budgetQuery.data.summary.pacingStatus].label}
                  variant={PACING_VARIANT[budgetQuery.data.summary.pacingStatus].variant}
                />
              </View>
              <View className="flex-row items-baseline gap-2">
                <DataNumber size="lg">
                  {formatMoney(spentThisMonth, { decimals: 0 })}
                </DataNumber>
                <Text className="font-display text-base text-foreground/55">
                  / {formatMoney(monthlyExpenses, { decimals: 0 })}
                </Text>
              </View>
              <ProgressBar percent={budgetQuery.data.summary.percentUsed} />
              <Text className="text-xs text-foreground/55">
                Day {budgetQuery.data.summary.currentDay} of{" "}
                {budgetQuery.data.summary.daysInMonth} ·{" "}
                {formatMoney(Math.max(0, budgetQuery.data.summary.remaining))}{" "}
                remaining
              </Text>
            </Card>
          ) : null}

          {topGoal ? (
            <Card padding="md" className="gap-3">
              <View className="flex-row items-center justify-between">
                <SectionLabel>Top goal</SectionLabel>
                <StatusPill
                  label={topGoal.goalType === "primary" ? "Primary" : "Secondary"}
                  variant={topGoal.goalType === "primary" ? "brand" : "neutral"}
                />
              </View>
              <Text
                className="font-display text-foreground"
                style={{ fontSize: 18, letterSpacing: -0.3 }}
                numberOfLines={1}
              >
                {topGoal.goalName}
              </Text>
              <View className="flex-row items-baseline justify-between">
                <DataNumber size="md">
                  {formatMoney(topGoal.currentAmountSaved ?? "0", { decimals: 0 })}
                </DataNumber>
                <Text className="font-display-medium text-foreground/55 text-sm">
                  / {formatMoney(topGoal.targetAmount, { decimals: 0 })}
                </Text>
              </View>
              <ProgressBar
                percent={
                  ((Number.parseFloat(topGoal.currentAmountSaved ?? "0") || 0) /
                    Math.max(1, Number.parseFloat(topGoal.targetAmount))) *
                  100
                }
              />
            </Card>
          ) : null}

          <View className="flex-row gap-3">
            <Card padding="md" className="flex-1 gap-1">
              <SectionLabel>Earners</SectionLabel>
              <DataNumber size="lg">
                {
                  new Set(
                    (incomesQuery.data ?? [])
                      .filter((r) => r.isActive !== false)
                      .map((r) => r.familyMemberId ?? "_")
                  ).size
                }
              </DataNumber>
              <Text className="text-xs text-foreground/55">in household</Text>
            </Card>
            <Card padding="md" className="flex-1 gap-1">
              <SectionLabel>Active goals</SectionLabel>
              <DataNumber size="lg">
                {(activeGoalsQuery.data ?? []).length}
              </DataNumber>
              <Text className="text-xs text-foreground/55">in progress</Text>
            </Card>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

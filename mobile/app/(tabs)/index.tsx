import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getBudgetForMonth } from "@/src/api/budget";
import { listDailyExpenses, type DailyExpense } from "@/src/api/daily-expenses";
import { useApiClient } from "@/src/lib/use-api-client";
import { Card } from "@/src/ui/Card";
import { CategoryBars } from "@/src/ui/CategoryBars";
import { DailySpendingChart } from "@/src/ui/DailySpendingChart";
import { formatMoney } from "@/src/ui/DataNumber";
import { MonthNavigator } from "@/src/ui/MonthNavigator";
import { MotifStrip } from "@/src/ui/MotifStrip";
import { ProgressBar } from "@/src/ui/ProgressBar";
import { PeranakanTilesDecor } from "@/src/ui/PeranakanTilesDecor";
import { RadialDecor } from "@/src/ui/RadialDecor";
import { SectionLabel } from "@/src/ui/SectionLabel";
import { useBackgroundDecor } from "@/src/lib/use-background-decor";
import { StatusPill } from "@/src/ui/StatusPill";

const PACING_VARIANT: Record<
  "under" | "on-track" | "over",
  { variant: "success" | "warning" | "danger" | "brand"; label: string }
> = {
  under: { variant: "success", label: "Underspending" },
  "on-track": { variant: "brand", label: "On track" },
  over: { variant: "danger", label: "Overspending" },
};

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ExpenseRow({ expense }: { expense: DailyExpense }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-1 pr-3">
        <Text
          className="font-display text-foreground"
          style={{ fontSize: 15, letterSpacing: -0.1 }}
          numberOfLines={1}
        >
          {expense.categoryName}
        </Text>
        <Text
          className="font-body text-foreground/55 mt-0.5"
          style={{ fontSize: 12 }}
        >
          {formatDay(expense.date)}
          {expense.subcategoryName ? ` · ${expense.subcategoryName}` : ""}
          {expense.note ? ` · ${expense.note}` : ""}
        </Text>
      </View>
      <Text
        className="font-display-medium text-foreground"
        style={{ fontSize: 15 }}
      >
        {formatMoney(expense.amount)}
      </Text>
    </View>
  );
}

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const apiClient = useApiClient();
  const decor = useBackgroundDecor();

  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<{ year: number; month: number }>({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const budgetQuery = useQuery({
    queryKey: ["budget", cursor.year, cursor.month],
    queryFn: () => getBudgetForMonth(apiClient, cursor),
  });
  const expensesQuery = useQuery({
    queryKey: ["daily-expenses", cursor.year, cursor.month],
    queryFn: () => listDailyExpenses(apiClient, cursor),
  });

  const onRefresh = useCallback(async () => {
    await Promise.all([budgetQuery.refetch(), expensesQuery.refetch()]);
  }, [budgetQuery, expensesQuery]);

  const goPrev = useCallback(() => {
    setCursor((c) =>
      c.month === 1
        ? { year: c.year - 1, month: 12 }
        : { year: c.year, month: c.month - 1 }
    );
  }, []);
  const goNext = useCallback(() => {
    setCursor((c) =>
      c.month === 12
        ? { year: c.year + 1, month: 1 }
        : { year: c.year, month: c.month + 1 }
    );
  }, []);

  const isLoading = budgetQuery.isPending || expensesQuery.isPending;
  const isRefreshing =
    (budgetQuery.isFetching && !budgetQuery.isPending) ||
    (expensesQuery.isFetching && !expensesQuery.isPending);

  const topCategories = useMemo(
    () => (budgetQuery.data?.categories ?? []).slice(0, 5),
    [budgetQuery.data]
  );
  const recentExpenses = useMemo(
    () => (expensesQuery.data ?? []).slice(0, 10),
    [expensesQuery.data]
  );

  const dailyBuckets = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of expensesQuery.data ?? []) {
      const day = Number.parseInt(e.date.slice(8, 10), 10);
      if (!Number.isFinite(day)) continue;
      map.set(day, (map.get(day) ?? 0) + (Number.parseFloat(e.amount) || 0));
    }
    return Array.from(map.entries()).map(([day, amount]) => ({ day, amount }));
  }, [expensesQuery.data]);

  const daysInMonth = budgetQuery.data?.summary.daysInMonth ?? 30;
  const currentDay = budgetQuery.data?.summary.currentDay ?? 1;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {decor === "radial" && <RadialDecor />}
      {decor === "peranakan" && <PeranakanTilesDecor />}
      <MotifStrip variant="thick" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#B8622A"
          />
        }
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20, gap: 8 }}>
          <SectionLabel>Foracle</SectionLabel>
          <Text
            className="font-editorial text-foreground"
            style={{ fontSize: 26, lineHeight: 34, letterSpacing: -0.2 }}
          >
            How&apos;s your month going.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <MonthNavigator
            year={cursor.year}
            month={cursor.month}
            onPrev={goPrev}
            onNext={goNext}
          />
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 24, paddingVertical: 56, alignItems: "center" }}>
            <ActivityIndicator color="#B8622A" />
          </View>
        ) : budgetQuery.isError || expensesQuery.isError ? (
          <View style={{ paddingHorizontal: 20 }}>
            <Card variant="tint-danger" padding="md">
              <Text
                className="font-display text-tint-danger-fg"
                style={{ fontSize: 16 }}
              >
                Couldn&apos;t load this month
              </Text>
              <Text
                className="text-tint-danger-fg/80 font-body"
                style={{ fontSize: 14, marginTop: 4 }}
              >
                {(budgetQuery.error as Error)?.message ??
                  (expensesQuery.error as Error)?.message ??
                  "Unknown error"}
              </Text>
            </Card>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 24 }}>
            {budgetQuery.data ? (
              <Card padding="lg" style={{ gap: 16 }}>
                <View className="flex-row items-center justify-between">
                  <SectionLabel>This month</SectionLabel>
                  <StatusPill
                    label={PACING_VARIANT[budgetQuery.data.summary.pacingStatus].label}
                    variant={PACING_VARIANT[budgetQuery.data.summary.pacingStatus].variant}
                  />
                </View>

                <View className="flex-row items-baseline gap-2">
                  <Text
                    className="font-display text-foreground"
                    style={{ fontSize: 48, letterSpacing: -1, lineHeight: 52 }}
                  >
                    {formatMoney(budgetQuery.data.summary.totalSpent, { decimals: 0 })}
                  </Text>
                  <Text
                    className="font-display text-foreground/45"
                    style={{ fontSize: 18, letterSpacing: -0.3 }}
                  >
                    / {formatMoney(budgetQuery.data.summary.totalBudget, { decimals: 0 })}
                  </Text>
                </View>

                <ProgressBar percent={budgetQuery.data.summary.percentUsed} />

                <View className="flex-row items-center justify-between" style={{ paddingTop: 4 }}>
                  <View style={{ gap: 2 }}>
                    <Text
                      className="font-body text-foreground/55"
                      style={{ fontSize: 12, letterSpacing: 0.2 }}
                    >
                      Remaining
                    </Text>
                    <Text
                      className="font-display text-foreground"
                      style={{ fontSize: 18, letterSpacing: -0.3 }}
                    >
                      {formatMoney(Math.max(0, budgetQuery.data.summary.remaining))}
                    </Text>
                  </View>
                  <View style={{ gap: 2, alignItems: "flex-end" }}>
                    <Text
                      className="font-body text-foreground/55"
                      style={{ fontSize: 12, letterSpacing: 0.2 }}
                    >
                      Daily target
                    </Text>
                    <Text
                      className="font-display text-foreground"
                      style={{ fontSize: 18, letterSpacing: -0.3 }}
                    >
                      {formatMoney(budgetQuery.data.summary.dailyBudget)}
                    </Text>
                  </View>
                </View>

                <View
                  className="flex-row items-center"
                  style={{
                    paddingTop: 14,
                    borderTopWidth: 1,
                    borderTopColor: "rgba(28, 43, 42, 0.05)",
                    gap: 8,
                  }}
                >
                  <Text className="font-body text-foreground/45" style={{ fontSize: 12 }}>
                    Day {currentDay} of {daysInMonth}
                  </Text>
                  <Text className="font-body text-foreground/30" style={{ fontSize: 12 }}>·</Text>
                  <Text className="font-body text-foreground/45" style={{ fontSize: 12 }}>
                    Expected by today:{" "}
                    {formatMoney(budgetQuery.data.summary.expectedSpentByToday)}
                  </Text>
                </View>
              </Card>
            ) : null}

            {dailyBuckets.length > 0 ? (
              <Card padding="md">
                <DailySpendingChart
                  data={dailyBuckets}
                  daysInMonth={daysInMonth}
                  currentDay={currentDay}
                />
              </Card>
            ) : null}

            <View style={{ gap: 12 }}>
              <SectionLabel style={{ paddingHorizontal: 4 }}>Top categories</SectionLabel>
              <Card padding="md">
                <CategoryBars data={topCategories} />
              </Card>
            </View>

            <View style={{ gap: 12 }}>
              <View
                className="flex-row items-center justify-between"
                style={{ paddingHorizontal: 4 }}
              >
                <SectionLabel>Recent daily expenses</SectionLabel>
                <Text
                  className="font-display text-foreground/40"
                  style={{ fontSize: 11, letterSpacing: 0.5 }}
                >
                  {expensesQuery.data?.length ?? 0} total
                </Text>
              </View>
              <Card padding="md">
                {recentExpenses.length === 0 ? (
                  <View style={{ paddingVertical: 8, gap: 4 }}>
                    <Text
                      className="font-display text-foreground"
                      style={{ fontSize: 16 }}
                    >
                      Nothing logged yet
                    </Text>
                    <Text
                      className="font-body text-foreground/55"
                      style={{ fontSize: 13, lineHeight: 20 }}
                    >
                      Log a daily expense in the web app, then pull to refresh.
                    </Text>
                  </View>
                ) : (
                  recentExpenses.map((e, i) => (
                    <View
                      key={e.id}
                      style={
                        i > 0
                          ? {
                              borderTopWidth: 1,
                              borderTopColor: "rgba(28, 43, 42, 0.05)",
                            }
                          : undefined
                      }
                    >
                      <ExpenseRow expense={e} />
                    </View>
                  ))
                )}
              </Card>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

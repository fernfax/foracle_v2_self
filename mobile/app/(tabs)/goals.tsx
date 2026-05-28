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

import { listGoals, type Goal } from "@/src/api/goals";
import { useApiClient } from "@/src/lib/use-api-client";
import { Card } from "@/src/ui/Card";
import { DataNumber, formatMoney } from "@/src/ui/DataNumber";
import { MotifStrip } from "@/src/ui/MotifStrip";
import { ProgressBar } from "@/src/ui/ProgressBar";
import { SectionLabel } from "@/src/ui/SectionLabel";
import { StatusPill } from "@/src/ui/StatusPill";

function monthsUntil(dateIso: string): number {
  const target = new Date(`${dateIso}T00:00:00`);
  const now = new Date();
  return Math.max(
    0,
    (target.getFullYear() - now.getFullYear()) * 12 +
      (target.getMonth() - now.getMonth())
  );
}

function formatTargetDate(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function GoalCard({ goal }: { goal: Goal }) {
  const target = Number.parseFloat(goal.targetAmount) || 0;
  const saved = Number.parseFloat(goal.currentAmountSaved ?? "0") || 0;
  const monthly = Number.parseFloat(goal.monthlyContribution ?? "0") || 0;
  const percentSaved = target > 0 ? (saved / target) * 100 : 0;
  const monthsLeft = monthsUntil(goal.targetDate);
  const monthlyRequired = monthsLeft > 0 ? Math.max(0, target - saved) / monthsLeft : 0;

  // On-pace if their current monthly contribution covers what's required.
  const onPace = monthly > 0 && monthly >= monthlyRequired * 0.95;

  return (
    <Card padding="md" className="gap-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="font-display text-foreground"
            style={{ fontSize: 18, letterSpacing: -0.3 }}
            numberOfLines={2}
          >
            {goal.goalName}
          </Text>
          <Text className="text-xs text-foreground/55 mt-1">
            By {formatTargetDate(goal.targetDate)} · {monthsLeft} mo left
          </Text>
        </View>
        <StatusPill
          label={goal.goalType === "primary" ? "Primary" : "Secondary"}
          variant={goal.goalType === "primary" ? "brand" : "neutral"}
        />
      </View>

      <View className="gap-2">
        <View className="flex-row items-baseline justify-between">
          <DataNumber size="md">{formatMoney(saved, { decimals: 0 })}</DataNumber>
          <Text className="font-display-medium text-foreground/55 text-sm">
            / {formatMoney(target, { decimals: 0 })}
          </Text>
        </View>
        <ProgressBar percent={percentSaved} color={onPace ? "#00C4AA" : undefined} />
        <Text className="text-xs text-foreground/55">
          {percentSaved.toFixed(0)}% saved
        </Text>
      </View>

      <View className="flex-row items-center justify-between pt-1 border-t border-border">
        <View className="pt-2">
          <Text className="text-xs text-foreground/55">Contributing</Text>
          <Text className="font-display-medium text-foreground text-sm">
            {formatMoney(monthly)} / mo
          </Text>
        </View>
        <View className="pt-2 items-end">
          <Text className="text-xs text-foreground/55 text-right">Need to hit goal</Text>
          <Text className="font-display-medium text-foreground text-sm text-right">
            {formatMoney(monthlyRequired)} / mo
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const apiClient = useApiClient();

  const activeGoalsQuery = useQuery({
    queryKey: ["goals", { isActive: true, isAchieved: false }],
    queryFn: () => listGoals(apiClient, { isActive: true, isAchieved: false }),
  });

  const achievedQuery = useQuery({
    queryKey: ["goals", { isAchieved: true }],
    queryFn: () => listGoals(apiClient, { isAchieved: true }),
  });

  const onRefresh = () =>
    Promise.all([activeGoalsQuery.refetch(), achievedQuery.refetch()]);

  const isLoading =
    activeGoalsQuery.isPending || achievedQuery.isPending;
  const isRefreshing =
    (activeGoalsQuery.isFetching && !activeGoalsQuery.isPending) ||
    (achievedQuery.isFetching && !achievedQuery.isPending);

  const active = activeGoalsQuery.data ?? [];
  const achieved = achievedQuery.data ?? [];

  const sortedActive = useMemo(
    () =>
      [...active].sort((a, b) => {
        // Primary goals first; within type, soonest target date first.
        if (a.goalType !== b.goalType) return a.goalType === "primary" ? -1 : 1;
        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
      }),
    [active]
  );

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
          <SectionLabel>Goals</SectionLabel>
          <Text
            className="font-editorial text-foreground"
            style={{ fontSize: 22, lineHeight: 30 }}
          >
            Where you&apos;re heading.
          </Text>
        </View>

        {isLoading ? (
          <View className="px-5 py-12 items-center">
            <ActivityIndicator color="#B8622A" />
          </View>
        ) : activeGoalsQuery.isError ? (
          <View className="px-5">
            <Card variant="tint-danger" padding="md">
              <Text className="font-display text-tint-danger-fg text-base">
                Couldn&apos;t load goals
              </Text>
              <Text className="text-tint-danger-fg/80 text-sm mt-1">
                {(activeGoalsQuery.error as Error)?.message ?? "Unknown error"}
              </Text>
            </Card>
          </View>
        ) : sortedActive.length === 0 && achieved.length === 0 ? (
          <View className="px-5">
            <Card padding="md">
              <Text className="font-display text-foreground text-base">
                No goals yet
              </Text>
              <Text className="text-foreground/55 text-sm mt-1">
                Create a goal in the web app and pull to refresh.
              </Text>
            </Card>
          </View>
        ) : (
          <View className="px-5 gap-5">
            {sortedActive.length > 0 ? (
              <View className="gap-3">
                <SectionLabel>
                  Active · {sortedActive.length}
                </SectionLabel>
                {sortedActive.map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </View>
            ) : null}

            {achieved.length > 0 ? (
              <View className="gap-2">
                <SectionLabel>Achieved · {achieved.length}</SectionLabel>
                <Card padding="md" className="gap-0">
                  {achieved.map((g, i) => (
                    <View
                      key={g.id}
                      className={`flex-row items-center justify-between py-3 ${i > 0 ? "border-t border-border" : ""}`}
                    >
                      <Text className="font-display-medium text-foreground flex-1 pr-3" numberOfLines={1}>
                        {g.goalName}
                      </Text>
                      <Text className="font-display-medium text-tint-success-fg text-sm">
                        ✓ {formatMoney(g.targetAmount, { decimals: 0 })}
                      </Text>
                    </View>
                  ))}
                </Card>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

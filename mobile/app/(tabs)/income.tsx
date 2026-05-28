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

import { listIncomes, type Income } from "@/src/api/incomes";
import { useApiClient } from "@/src/lib/use-api-client";
import { Card } from "@/src/ui/Card";
import { DataNumber, formatMoney } from "@/src/ui/DataNumber";
import { MotifStrip } from "@/src/ui/MotifStrip";
import { SectionLabel } from "@/src/ui/SectionLabel";
import { StatusPill } from "@/src/ui/StatusPill";

type MemberBucket = {
  memberKey: string;
  memberName: string;
  relationship: string | null;
  incomes: Income[];
  totalMonthly: number;
  totalCpfContributions: number;
};

function bucketByMember(incomes: Income[]): MemberBucket[] {
  const buckets = new Map<string, MemberBucket>();
  for (const inc of incomes) {
    if (inc.isActive === false) continue;
    const key = inc.familyMember?.id ?? "_unassigned";
    const name = inc.familyMember?.name ?? "Unassigned";
    const relationship = inc.familyMember?.relationship ?? null;
    if (!buckets.has(key)) {
      buckets.set(key, {
        memberKey: key,
        memberName: name,
        relationship,
        incomes: [],
        totalMonthly: 0,
        totalCpfContributions: 0,
      });
    }
    const b = buckets.get(key)!;
    b.incomes.push(inc);
    b.totalMonthly += Number.parseFloat(inc.amount) || 0;
    if (inc.subjectToCpf) {
      b.totalCpfContributions +=
        (Number.parseFloat(inc.employeeCpfContribution ?? "0") || 0) +
        (Number.parseFloat(inc.employerCpfContribution ?? "0") || 0);
    }
  }
  return Array.from(buckets.values()).sort((a, b) => b.totalMonthly - a.totalMonthly);
}

function IncomeRow({ income }: { income: Income }) {
  const monthly = Number.parseFloat(income.amount) || 0;
  return (
    <View className="py-3 flex-row items-center justify-between">
      <View className="flex-1 pr-3 gap-1">
        <Text className="font-display-medium text-foreground text-[15px]" numberOfLines={1}>
          {income.name}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-foreground/55">{income.category}</Text>
          {income.subjectToCpf ? (
            <View className="bg-tint-success-bg rounded px-1.5 py-0.5">
              <Text
                className="font-display text-[9px] text-tint-success-fg"
                style={{ letterSpacing: 1 }}
              >
                CPF
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View className="items-end">
        <Text className="font-display-medium text-foreground text-[15px]">
          {formatMoney(monthly, { decimals: 0 })}
        </Text>
        <Text className="text-xs text-foreground/40">/mo</Text>
      </View>
    </View>
  );
}

function MemberCard({ bucket }: { bucket: MemberBucket }) {
  return (
    <Card padding="md" className="gap-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text
            className="font-display text-foreground"
            style={{ fontSize: 18, letterSpacing: -0.3 }}
          >
            {bucket.memberName}
          </Text>
          {bucket.relationship ? (
            <Text className="font-display text-[11px] text-foreground/50 mt-0.5" style={{ letterSpacing: 1.2 }}>
              {bucket.relationship.toUpperCase()}
            </Text>
          ) : null}
        </View>
        <View className="items-end">
          <DataNumber size="md">{formatMoney(bucket.totalMonthly, { decimals: 0 })}</DataNumber>
          <Text className="text-xs text-foreground/40">monthly</Text>
        </View>
      </View>
      <View className="border-t border-border pt-1 gap-0">
        {bucket.incomes.map((inc, i) => (
          <View key={inc.id} className={i > 0 ? "border-t border-border" : ""}>
            <IncomeRow income={inc} />
          </View>
        ))}
      </View>
      {bucket.totalCpfContributions > 0 ? (
        <View className="flex-row items-center gap-2 pt-1">
          <Text className="font-display text-[11px] text-foreground/40" style={{ letterSpacing: 1.2 }}>
            CPF MONTHLY
          </Text>
          <Text className="font-display-medium text-foreground/70 text-sm">
            {formatMoney(bucket.totalCpfContributions, { decimals: 0 })}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

export default function IncomeScreen() {
  const insets = useSafeAreaInsets();
  const apiClient = useApiClient();

  const incomesQuery = useQuery({
    queryKey: ["incomes"],
    queryFn: () => listIncomes(apiClient),
  });

  const buckets = useMemo(
    () => bucketByMember(incomesQuery.data ?? []),
    [incomesQuery.data]
  );
  const totalHousehold = useMemo(
    () => buckets.reduce((acc, b) => acc + b.totalMonthly, 0),
    [buckets]
  );
  const cpfTotal = useMemo(
    () => buckets.reduce((acc, b) => acc + b.totalCpfContributions, 0),
    [buckets]
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <MotifStrip variant="thick" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={incomesQuery.isFetching && !incomesQuery.isPending}
            onRefresh={() => incomesQuery.refetch()}
            tintColor="#B8622A"
          />
        }
      >
        <View className="px-5 pt-5 pb-3 gap-1">
          <SectionLabel>Household income</SectionLabel>
          <Text
            className="font-editorial text-foreground"
            style={{ fontSize: 22, lineHeight: 30 }}
          >
            What&apos;s coming in.
          </Text>
        </View>

        {incomesQuery.isPending ? (
          <View className="px-5 py-12 items-center">
            <ActivityIndicator color="#B8622A" />
          </View>
        ) : incomesQuery.isError ? (
          <View className="px-5">
            <Card variant="tint-danger" padding="md" className="gap-1">
              <Text className="font-display text-tint-danger-fg text-base">
                Couldn&apos;t load incomes
              </Text>
              <Text className="text-tint-danger-fg/80 text-sm">
                {(incomesQuery.error as Error)?.message ?? "Unknown error"}
              </Text>
            </Card>
          </View>
        ) : (
          <View className="px-5 gap-5">
            <Card padding="md" className="gap-3">
              <View className="flex-row items-center justify-between">
                <SectionLabel>Monthly total</SectionLabel>
                {cpfTotal > 0 ? (
                  <StatusPill label={`${formatMoney(cpfTotal, { decimals: 0 })} CPF`} variant="success" />
                ) : null}
              </View>
              <DataNumber size="xl">{formatMoney(totalHousehold, { decimals: 0 })}</DataNumber>
              <Text className="text-sm text-foreground/55">
                Across {buckets.length} {buckets.length === 1 ? "earner" : "earners"}
              </Text>
            </Card>

            {buckets.length === 0 ? (
              <Card padding="md" className="gap-1">
                <Text className="font-display text-foreground text-base">
                  No active income yet
                </Text>
                <Text className="text-foreground/55 text-sm">
                  Add an income in the web app and pull to refresh.
                </Text>
              </Card>
            ) : (
              buckets.map((b) => <MemberCard key={b.memberKey} bucket={b} />)
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

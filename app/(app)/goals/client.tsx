"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { Target, Trophy } from "lucide-react";
import { GoalList } from "@/components/goals/goal-list";

interface Goal {
  id: string;
  userId: string;
  linkedExpenseId: string | null;
  goalName: string;
  goalType: string;
  targetAmount: string;
  targetDate: string;
  currentAmountSaved: string | null;
  monthlyContribution: string | null;
  description: string | null;
  isAchieved: boolean | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface GoalsClientProps {
  initialGoals: Goal[];
}

export function GoalsClient({ initialGoals }: GoalsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "active");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync activeTab with URL search params when they change
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "active";
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/goals?tab=${value}`, { scroll: false });
  };

  // Filter goals by status
  const activeGoals = initialGoals.filter(
    (goal) => goal.isActive !== false && goal.isAchieved !== true
  );
  const achievedGoals = initialGoals.filter((goal) => goal.isAchieved === true);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">
          Financial Planning
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Goals</h1>
        <p className="text-muted-foreground mt-1">
          Set and track your financial goals
        </p>
      </div>

      {!mounted ? (
        <div className="h-[500px] animate-pulse bg-muted rounded-lg" />
      ) : (
        <>
          <SlidingTabs
            tabs={[
              { value: "active", label: "Active Goals", icon: Target, badge: activeGoals.length },
              { value: "achieved", label: "Achieved", icon: Trophy, badge: achievedGoals.length, badgeVariant: "success" },
            ]}
            value={activeTab}
            onValueChange={handleTabChange}
          />

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsContent value="active" className="mt-4">
              <GoalList initialGoals={activeGoals} showAddButton />
            </TabsContent>

            <TabsContent value="achieved" className="mt-4">
              <GoalList initialGoals={achievedGoals} isAchievedView />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

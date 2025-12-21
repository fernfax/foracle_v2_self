"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    router.push(`/dashboard/goals?tab=${value}`, { scroll: false });
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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>Active Goals</span>
              {activeGoals.length > 0 && (
                <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {activeGoals.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="achieved" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>Achieved</span>
              {achievedGoals.length > 0 && (
                <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  {achievedGoals.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <GoalList initialGoals={activeGoals} showAddButton />
          </TabsContent>

          <TabsContent value="achieved" className="mt-6">
            <GoalList initialGoals={achievedGoals} isAchievedView />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

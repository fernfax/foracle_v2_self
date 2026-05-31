import { getGoals } from "@/lib/actions/goals";
import { GoalsClient } from "./client";
import { assertFeatureEnabled } from "@/lib/feature-flags/guard";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Goals | Foracle",
  description: "Set and track your financial goals",
};

export default async function GoalsPage() {
  await assertFeatureEnabled("goals");
  const goals = await getGoals();

  return <GoalsClient initialGoals={goals} />;
}

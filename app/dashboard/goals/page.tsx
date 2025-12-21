import { getGoals } from "@/lib/actions/goals";
import { GoalsClient } from "./client";

export const metadata = {
  title: "Goals | Foracle",
  description: "Set and track your financial goals",
};

export default async function GoalsPage() {
  const goals = await getGoals();

  return <GoalsClient initialGoals={goals} />;
}

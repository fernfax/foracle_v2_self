import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getInvestments, getInvestmentsSummary } from "@/lib/actions/investments";
import { InvestmentsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function InvestmentsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [investments, summary] = await Promise.all([
    getInvestments(),
    getInvestmentsSummary(),
  ]);

  return (
    <InvestmentsClient
      initialInvestments={investments}
      initialSummary={summary}
    />
  );
}

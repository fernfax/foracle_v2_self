import { verifyAndScope } from "../../../_lib/auth";
import { ok, wrap } from "../../../_lib/response";
import { getInvestmentsSummary } from "@/lib/services/investments";

export async function GET() {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const summary = await getInvestmentsSummary(ctx);
    return ok(summary);
  });
}

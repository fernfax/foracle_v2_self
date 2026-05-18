import { verifyAndScope } from "../../_lib/auth";
import { ok, wrap } from "../../_lib/response";
import { getOnboardingData } from "@/lib/services/onboarding";

export async function GET() {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const data = await getOnboardingData(ctx);
    return ok(data);
  });
}

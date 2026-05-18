import { verifyAndScope } from "../../_lib/auth";
import { ok, wrap } from "../../_lib/response";
import { checkOnboardingStatus } from "@/lib/services/onboarding";

export async function GET() {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const completed = await checkOnboardingStatus(ctx);
    return ok({ onboardingCompleted: completed });
  });
}

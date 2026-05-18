import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../_lib/auth";
import { ok, wrap } from "../../_lib/response";
import { completeOnboarding } from "@/lib/services/onboarding";

export async function POST() {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    await completeOnboarding(ctx);
    revalidatePath("/overview");
    return ok({ onboardingCompleted: true });
  });
}

import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../_lib/auth";
import { ok, wrap } from "../../_lib/response";
import { createOnboardingExpensesBodySchema } from "@/lib/api-schemas/onboarding";
import { createOnboardingExpenses } from "@/lib/services/onboarding";

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = createOnboardingExpensesBodySchema.parse(await req.json());
    await createOnboardingExpenses(ctx, body);
    revalidatePath("/overview");
    return ok({ created: true });
  });
}

import type { NextRequest } from "next/server";
import { verifyAndScope } from "../../_lib/auth";
import { ok, wrap } from "../../_lib/response";
import { setSinglishModeBodySchema } from "@/lib/api-schemas/user-prefs";
import { getSinglishMode, setSinglishMode } from "@/lib/services/user-prefs";

export async function GET() {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const enabled = await getSinglishMode(ctx);
    return ok({ enabled });
  });
}

export async function PUT(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { enabled } = setSinglishModeBodySchema.parse(await req.json());
    const next = await setSinglishMode(ctx, enabled);
    return ok({ enabled: next });
  });
}

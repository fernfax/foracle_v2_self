import type { NextRequest } from "next/server";
import { verifyAndScope } from "../../_lib/auth";
import { ok, wrap } from "../../_lib/response";
import { setBackgroundDecorBodySchema } from "@/lib/api-schemas/user-prefs";
import {
  getBackgroundDecor,
  setBackgroundDecor,
} from "@/lib/services/user-prefs";

export async function GET() {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const decor = await getBackgroundDecor(ctx);
    return ok({ decor });
  });
}

export async function PUT(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { decor } = setBackgroundDecorBodySchema.parse(await req.json());
    const next = await setBackgroundDecor(ctx, decor);
    return ok({ decor: next });
  });
}

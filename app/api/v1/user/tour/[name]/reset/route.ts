import type { NextRequest } from "next/server";
import { verifyAndScope } from "../../../../_lib/auth";
import { ApiError } from "../../../../_lib/errors";
import { ok, wrap } from "../../../../_lib/response";
import { tourNameEnum } from "@/lib/api-schemas/user-prefs";
import { resetTourStatus } from "@/lib/services/user-prefs";

type RouteCtx = { params: Promise<{ name: string }> };

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { name } = await params;
    const parsed = tourNameEnum.safeParse(name);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid tour name", parsed.error.issues);
    }
    const status = await resetTourStatus(ctx, parsed.data);
    return ok(status);
  });
}

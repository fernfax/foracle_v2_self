import type { NextRequest } from "next/server";
import { verifyAndScope } from "../../../../_lib/auth";
import { ApiError } from "../../../../_lib/errors";
import { ok, wrap } from "../../../../_lib/response";
import {
  FamilyMemberNotFoundError,
  getFamilyMemberIncomes,
} from "@/lib/services/family";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    try {
      const rows = await getFamilyMemberIncomes(ctx, id);
      return ok(rows);
    } catch (err) {
      if (err instanceof FamilyMemberNotFoundError) {
        throw new ApiError("NOT_FOUND", "Family member not found");
      }
      throw err;
    }
  });
}

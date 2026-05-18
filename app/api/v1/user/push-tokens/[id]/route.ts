import type { NextRequest } from "next/server";
import { verifyAndScope } from "../../../_lib/auth";
import { ApiError } from "../../../_lib/errors";
import { ok, wrap } from "../../../_lib/response";
import {
  PushTokenNotFoundError,
  revokePushToken,
  type PushTokenRow,
} from "@/lib/services/push-tokens";

function serialize(row: PushTokenRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
  };
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    try {
      const row = await revokePushToken(ctx, id);
      return ok({ revoked: true, row: serialize(row) });
    } catch (err) {
      if (err instanceof PushTokenNotFoundError) {
        throw new ApiError("NOT_FOUND", "Push token not found");
      }
      throw err;
    }
  });
}

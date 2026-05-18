import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../_lib/auth";
import { ApiError } from "../../_lib/errors";
import { ok, wrap } from "../../_lib/response";
import { updatePolicyBodySchema } from "@/lib/api-schemas/policies";
import {
  PolicyNotFoundError,
  deletePolicy,
  getPolicyById,
  updatePolicy,
  type PolicyRow,
} from "@/lib/services/policies";

function serialize(row: PolicyRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const row = await getPolicyById(ctx, id);
    if (!row) throw new ApiError("NOT_FOUND", "Policy not found");
    return ok(serialize(row));
  });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const patch = updatePolicyBodySchema.parse(await req.json());
    try {
      const row = await updatePolicy(ctx, id, patch);
      revalidatePath("/policies");
      return ok(serialize(row));
    } catch (err) {
      if (err instanceof PolicyNotFoundError) {
        throw new ApiError("NOT_FOUND", "Policy not found");
      }
      throw err;
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    try {
      await deletePolicy(ctx, id);
      revalidatePath("/policies");
      return ok({ deleted: true });
    } catch (err) {
      if (err instanceof PolicyNotFoundError) {
        throw new ApiError("NOT_FOUND", "Policy not found");
      }
      throw err;
    }
  });
}

import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../../_lib/auth";
import { ApiError } from "../../../_lib/errors";
import { ok, wrap } from "../../../_lib/response";
import { updateFamilyMemberBodySchema } from "@/lib/api-schemas/family";
import {
  FamilyMemberNotFoundError,
  deleteFamilyMember,
  getFamilyMemberById,
  updateFamilyMember,
  type FamilyMemberRow,
} from "@/lib/services/family";

function serialize(row: FamilyMemberRow) {
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
    const row = await getFamilyMemberById(ctx, id);
    if (!row) throw new ApiError("NOT_FOUND", "Family member not found");
    return ok(serialize(row));
  });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const patch = updateFamilyMemberBodySchema.parse(await req.json());
    try {
      const row = await updateFamilyMember(ctx, id, patch);
      revalidatePath("/user");
      return ok(serialize(row));
    } catch (err) {
      if (err instanceof FamilyMemberNotFoundError) {
        throw new ApiError("NOT_FOUND", "Family member not found");
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
      const result = await deleteFamilyMember(ctx, id);
      revalidatePath("/user");
      return ok({ deleted: true, deletedIncomes: result.deletedIncomes });
    } catch (err) {
      if (err instanceof FamilyMemberNotFoundError) {
        throw new ApiError("NOT_FOUND", "Family member not found");
      }
      throw err;
    }
  });
}

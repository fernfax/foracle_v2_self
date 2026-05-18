import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../../_lib/auth";
import { ApiError } from "../../../_lib/errors";
import { ok, wrap } from "../../../_lib/response";
import { updatePropertyAssetBodySchema } from "@/lib/api-schemas/property-assets";
import {
  PropertyAssetNotFoundError,
  deletePropertyAsset,
  getPropertyAssetById,
  updatePropertyAsset,
  type PropertyAssetRow,
} from "@/lib/services/property-assets";

function serialize(row: PropertyAssetRow) {
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
    const row = await getPropertyAssetById(ctx, id);
    if (!row) throw new ApiError("NOT_FOUND", "Property asset not found");
    return ok(serialize(row));
  });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const patch = updatePropertyAssetBodySchema.parse(await req.json());
    try {
      const row = await updatePropertyAsset(ctx, id, patch);
      revalidatePath("/assets");
      revalidatePath("/expenses");
      return ok(serialize(row));
    } catch (err) {
      if (err instanceof PropertyAssetNotFoundError) {
        throw new ApiError("NOT_FOUND", "Property asset not found");
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
      await deletePropertyAsset(ctx, id);
      revalidatePath("/assets");
      revalidatePath("/expenses");
      return ok({ deleted: true });
    } catch (err) {
      if (err instanceof PropertyAssetNotFoundError) {
        throw new ApiError("NOT_FOUND", "Property asset not found");
      }
      throw err;
    }
  });
}

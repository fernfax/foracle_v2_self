import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../../_lib/auth";
import { ApiError } from "../../../_lib/errors";
import { ok, wrap } from "../../../_lib/response";
import { updateVehicleAssetBodySchema } from "@/lib/api-schemas/vehicle-assets";
import {
  VehicleAssetNotFoundError,
  deleteVehicleAsset,
  getVehicleAssetById,
  updateVehicleAsset,
  type VehicleAssetRow,
} from "@/lib/services/vehicle-assets";

function serialize(row: VehicleAssetRow) {
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
    const row = await getVehicleAssetById(ctx, id);
    if (!row) throw new ApiError("NOT_FOUND", "Vehicle asset not found");
    return ok(serialize(row));
  });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const patch = updateVehicleAssetBodySchema.parse(await req.json());
    try {
      const row = await updateVehicleAsset(ctx, id, patch);
      revalidatePath("/assets");
      revalidatePath("/expenses");
      return ok(serialize(row));
    } catch (err) {
      if (err instanceof VehicleAssetNotFoundError) {
        throw new ApiError("NOT_FOUND", "Vehicle asset not found");
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
      await deleteVehicleAsset(ctx, id);
      revalidatePath("/assets");
      revalidatePath("/expenses");
      return ok({ deleted: true });
    } catch (err) {
      if (err instanceof VehicleAssetNotFoundError) {
        throw new ApiError("NOT_FOUND", "Vehicle asset not found");
      }
      throw err;
    }
  });
}

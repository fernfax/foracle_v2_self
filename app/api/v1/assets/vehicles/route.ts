import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../_lib/auth";
import { ApiError } from "../../_lib/errors";
import { created, ok, wrap } from "../../_lib/response";
import {
  createVehicleAssetBodySchema,
  listVehicleAssetsQuerySchema,
} from "@/lib/api-schemas/vehicle-assets";
import {
  createVehicleAsset,
  listVehicleAssets,
  type VehicleAssetRow,
} from "@/lib/services/vehicle-assets";

function serialize(row: VehicleAssetRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const query = listVehicleAssetsQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    const rows = await listVehicleAssets(ctx, query);
    return ok(rows.map(serialize));
  });
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = createVehicleAssetBodySchema.parse(await req.json());
    let result;
    try {
      result = await createVehicleAsset(ctx, body);
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === "CONFLICT") {
        throw new ApiError(
          "CONFLICT",
          "A vehicle with this id already exists for another user"
        );
      }
      throw err;
    }
    revalidatePath("/assets");
    revalidatePath("/expenses");
    const payload = {
      ...serialize(result.row),
      idempotentReplay: result.status === "conflict",
    };
    return result.status === "created" ? created(payload) : ok(payload);
  });
}

import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../_lib/auth";
import { ApiError } from "../../_lib/errors";
import { created, ok, wrap } from "../../_lib/response";
import {
  createPropertyAssetBodySchema,
  listPropertyAssetsQuerySchema,
} from "@/lib/api-schemas/property-assets";
import {
  createPropertyAsset,
  listPropertyAssets,
  type PropertyAssetRow,
} from "@/lib/services/property-assets";

function serialize(row: PropertyAssetRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const query = listPropertyAssetsQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    const rows = await listPropertyAssets(ctx, query);
    return ok(rows.map(serialize));
  });
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = createPropertyAssetBodySchema.parse(await req.json());
    let result;
    try {
      result = await createPropertyAsset(ctx, body);
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === "CONFLICT") {
        throw new ApiError(
          "CONFLICT",
          "A property with this id already exists for another user"
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

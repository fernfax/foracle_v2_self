import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../_lib/auth";
import { ApiError } from "../_lib/errors";
import { created, ok, wrap } from "../_lib/response";
import {
  createPolicyBodySchema,
  listPoliciesQuerySchema,
} from "@/lib/api-schemas/policies";
import {
  createPolicy,
  listPolicies,
  type PolicyRow,
} from "@/lib/services/policies";

function serialize(row: PolicyRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const query = listPoliciesQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    const rows = await listPolicies(ctx, query);
    return ok(rows.map(serialize));
  });
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = createPolicyBodySchema.parse(await req.json());

    let result;
    try {
      result = await createPolicy(ctx, body);
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === "CONFLICT") {
        throw new ApiError(
          "CONFLICT",
          "A policy with this id already exists for another user"
        );
      }
      throw err;
    }

    revalidatePath("/policies");
    const payload = {
      ...serialize(result.row),
      idempotentReplay: result.status === "conflict",
    };
    return result.status === "created" ? created(payload) : ok(payload);
  });
}

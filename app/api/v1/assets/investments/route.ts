import type { NextRequest } from "next/server";
import { verifyAndScope } from "../../_lib/auth";
import { ApiError } from "../../_lib/errors";
import { created, ok, wrap } from "../../_lib/response";
import {
  createInvestmentBodySchema,
  listInvestmentsQuerySchema,
} from "@/lib/api-schemas/investments";
import {
  createInvestment,
  listInvestments,
  type InvestmentRow,
} from "@/lib/services/investments";

function serialize(row: InvestmentRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const query = listInvestmentsQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    const rows = await listInvestments(ctx, query);
    return ok(rows.map(serialize));
  });
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = createInvestmentBodySchema.parse(await req.json());
    let result;
    try {
      result = await createInvestment(ctx, body);
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === "CONFLICT") {
        throw new ApiError(
          "CONFLICT",
          "An investment with this id already exists for another user"
        );
      }
      throw err;
    }
    const payload = {
      ...serialize(result.row),
      idempotentReplay: result.status === "conflict",
    };
    return result.status === "created" ? created(payload) : ok(payload);
  });
}

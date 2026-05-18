import type { NextRequest } from "next/server";
import { verifyAndScope } from "../../../_lib/auth";
import { ApiError } from "../../../_lib/errors";
import { ok, wrap } from "../../../_lib/response";
import { updateInvestmentBodySchema } from "@/lib/api-schemas/investments";
import {
  InvestmentNotFoundError,
  deleteInvestment,
  getInvestmentById,
  updateInvestment,
  type InvestmentRow,
} from "@/lib/services/investments";

function serialize(row: InvestmentRow) {
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
    const row = await getInvestmentById(ctx, id);
    if (!row) throw new ApiError("NOT_FOUND", "Investment not found");
    return ok(serialize(row));
  });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const { id } = await params;
    const patch = updateInvestmentBodySchema.parse(await req.json());
    try {
      const row = await updateInvestment(ctx, id, patch);
      return ok(serialize(row));
    } catch (err) {
      if (err instanceof InvestmentNotFoundError) {
        throw new ApiError("NOT_FOUND", "Investment not found");
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
      await deleteInvestment(ctx, id);
      return ok({ deleted: true });
    } catch (err) {
      if (err instanceof InvestmentNotFoundError) {
        throw new ApiError("NOT_FOUND", "Investment not found");
      }
      throw err;
    }
  });
}

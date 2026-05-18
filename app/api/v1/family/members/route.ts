import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAndScope } from "../../_lib/auth";
import { created, ok, wrap } from "../../_lib/response";
import { createFamilyMemberBodySchema } from "@/lib/api-schemas/family";
import {
  createFamilyMember,
  listFamilyMembers,
  type FamilyMemberRow,
} from "@/lib/services/family";

function serialize(row: FamilyMemberRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET() {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const rows = await listFamilyMembers(ctx);
    return ok(rows.map(serialize));
  });
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = createFamilyMemberBodySchema.parse(await req.json());
    const row = await createFamilyMember(ctx, body);
    revalidatePath("/user");
    return created(serialize(row));
  });
}

import type { NextRequest } from "next/server";
import { verifyAndScope } from "../../_lib/auth";
import { created, ok, wrap } from "../../_lib/response";
import { registerPushTokenBodySchema } from "@/lib/api-schemas/push-tokens";
import {
  listActivePushTokens,
  registerPushToken,
  type PushTokenRow,
} from "@/lib/services/push-tokens";

function serialize(row: PushTokenRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
  };
}

export async function GET() {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const rows = await listActivePushTokens(ctx);
    return ok(rows.map(serialize));
  });
}

export async function POST(req: NextRequest) {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const body = registerPushTokenBodySchema.parse(await req.json());
    const result = await registerPushToken(ctx, body);
    const payload = { ...serialize(result.row), status: result.status };
    return result.status === "registered" ? created(payload) : ok(payload);
  });
}

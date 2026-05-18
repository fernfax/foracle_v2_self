import { verifyAndScope } from "../../_lib/auth";
import { ok, wrap } from "../../_lib/response";
import { getTourStatus } from "@/lib/services/user-prefs";

export async function GET() {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const status = await getTourStatus(ctx);
    return ok(status);
  });
}

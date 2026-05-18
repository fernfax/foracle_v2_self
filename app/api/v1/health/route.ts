import { ok, wrap } from "../_lib/response";

const API_VERSION = "1.0.0";

export async function GET() {
  return wrap(async () =>
    ok({
      ok: true,
      version: API_VERSION,
      commit: process.env.RENDER_GIT_COMMIT || "dev",
      time: new Date().toISOString(),
    })
  );
}

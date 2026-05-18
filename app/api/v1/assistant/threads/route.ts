import { verifyAndScope } from "../../_lib/auth";
import { created, ok, wrap } from "../../_lib/response";
import { createThread, getUserThreads } from "@/lib/ai/threads";
import { getUserQuotaInfo } from "@/lib/ai/rate-limiter";

export async function GET() {
  return wrap(async () => {
    const ctx = await verifyAndScope();
    const threads = await getUserThreads();
    const quota = getUserQuotaInfo(ctx.userId);
    return ok({
      threads,
      quota: {
        used: quota.used,
        limit: quota.limit,
        resetAt: quota.resetAt.toISOString(),
      },
    });
  });
}

export async function POST() {
  return wrap(async () => {
    await verifyAndScope();
    const thread = await createThread();
    return created({
      id: thread.id,
      title: thread.title,
      createdAt: thread.createdAt.toISOString(),
    });
  });
}

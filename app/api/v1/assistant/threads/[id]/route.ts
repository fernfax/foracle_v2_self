import type { NextRequest } from "next/server";
import { verifyAndScope } from "../../../_lib/auth";
import { ApiError } from "../../../_lib/errors";
import { ok, wrap } from "../../../_lib/response";
import { renameThreadBodySchema } from "@/lib/api-schemas/assistant";
import {
  deleteThread,
  getThread,
  getThreadMessages,
  renameThread,
} from "@/lib/ai/threads";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    await verifyAndScope();
    const { id } = await params;
    const thread = await getThread(id);
    if (!thread) throw new ApiError("NOT_FOUND", "Thread not found");
    const messages = await getThreadMessages(id);
    return ok({
      id: thread.id,
      title: thread.title,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolsUsed: m.toolsUsed ?? [],
        createdAt: m.createdAt.toISOString(),
      })),
    });
  });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    await verifyAndScope();
    const { id } = await params;
    const { title } = renameThreadBodySchema.parse(await req.json());
    const renamed = await renameThread(id, title);
    if (!renamed) throw new ApiError("NOT_FOUND", "Thread not found");
    return ok({ id, title });
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    await verifyAndScope();
    const { id } = await params;
    const deleted = await deleteThread(id);
    if (!deleted) throw new ApiError("NOT_FOUND", "Thread not found");
    return ok({ deleted: true });
  });
}

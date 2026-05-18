import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { ApiError } from "../../../../_lib/errors";
import { ok, wrap } from "../../../../_lib/response";
import {
  FamilyMemberNotFoundError,
  InvitationError,
  resendInvitation,
} from "@/lib/services/family";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  return wrap(async () => {
    const { id } = await params;
    try {
      const result = await resendInvitation(id);
      revalidatePath("/user");
      return ok(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("master can perform this action")) {
        throw new ApiError(
          "FORBIDDEN",
          "Only the family master can perform this action"
        );
      }
      if (msg === "Unauthorized") {
        throw new ApiError("UNAUTHORIZED", "Sign in required");
      }
      if (err instanceof FamilyMemberNotFoundError) {
        throw new ApiError("NOT_FOUND", "Invitation not found");
      }
      if (err instanceof InvitationError) {
        throw new ApiError("VALIDATION_ERROR", err.message);
      }
      throw err;
    }
  });
}

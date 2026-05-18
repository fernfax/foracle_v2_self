import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { ApiError } from "../../_lib/errors";
import { created, wrap } from "../../_lib/response";
import { inviteFamilyMemberBodySchema } from "@/lib/api-schemas/family";
import {
  InvitationError,
  inviteFamilyMember,
} from "@/lib/services/family";

export async function POST(req: NextRequest) {
  return wrap(async () => {
    // No verifyAndScope here — the service uses assertCallerIsMaster which
    // throws if the caller isn't the family master (mapped to 403 below).
    const body = inviteFamilyMemberBodySchema.parse(await req.json());
    try {
      const result = await inviteFamilyMember(body);
      revalidatePath("/user");
      return created(result);
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
      if (err instanceof InvitationError) {
        if (err.code === "OTHER_FAMILY") {
          throw new ApiError("CONFLICT", err.message);
        }
        throw new ApiError("VALIDATION_ERROR", err.message);
      }
      throw err;
    }
  });
}

import { z } from "zod";
import { ALL_FLAG_KEYS, type FlagKey } from "@/lib/feature-flags/registry";

// Built from the registry's ALL_FLAG_KEYS so the schema can never drift from
// the source of truth. z.enum needs a non-empty tuple, hence the cast.
export const flagKeySchema = z.enum(
  ALL_FLAG_KEYS as [FlagKey, ...FlagKey[]]
);

export const setFlagOverrideBodySchema = z.object({
  key: flagKeySchema,
  enabled: z.boolean(),
});
export type SetFlagOverrideBody = z.infer<typeof setFlagOverrideBodySchema>;

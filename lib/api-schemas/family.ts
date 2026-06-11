import { z } from "zod";
import { RELATIONSHIP_VALUES } from "@/lib/family-relationships";
import { isFutureIsoDate } from "@/lib/date-helpers";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
// Date of birth can never be in the future. (Defense in depth — the
// authoritative guard lives in lib/services/family.ts since these schemas are
// not .parse()'d on the write path, but any route that does parse gets it too.)
const dobDate = isoDate.refine((d) => !isFutureIsoDate(d), {
  message: "Date of birth cannot be in the future",
});
const relationshipEnum = z.enum(
  RELATIONSHIP_VALUES as unknown as [string, ...string[]]
);

export const createFamilyMemberBodySchema = z.object({
  name: z.string().min(1).max(255),
  relationship: z.string().min(1).max(100),
  dateOfBirth: dobDate.nullish(),
  isContributing: z.boolean().optional(),
  notes: z.string().nullish(),
});
export type CreateFamilyMemberBody = z.infer<typeof createFamilyMemberBodySchema>;

export const updateFamilyMemberBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    relationship: z.string().min(1).max(100).optional(),
    dateOfBirth: dobDate.nullish(),
    isContributing: z.boolean().optional(),
    notes: z.string().nullish(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateFamilyMemberBody = z.infer<typeof updateFamilyMemberBodySchema>;

export const inviteFamilyMemberBodySchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email(),
  relationship: relationshipEnum,
});
export type InviteFamilyMemberBody = z.infer<typeof inviteFamilyMemberBodySchema>;

import { z } from "zod";
import { RELATIONSHIP_VALUES } from "@/lib/family-relationships";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const relationshipEnum = z.enum(
  RELATIONSHIP_VALUES as unknown as [string, ...string[]]
);

export const createFamilyMemberBodySchema = z.object({
  name: z.string().min(1).max(255),
  relationship: z.string().min(1).max(100),
  dateOfBirth: isoDate.nullish(),
  isContributing: z.boolean().optional(),
  notes: z.string().nullish(),
});
export type CreateFamilyMemberBody = z.infer<typeof createFamilyMemberBodySchema>;

export const updateFamilyMemberBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    relationship: z.string().min(1).max(100).optional(),
    dateOfBirth: isoDate.nullish(),
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

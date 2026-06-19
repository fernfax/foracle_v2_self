import { RELATIONSHIP_VALUES } from "@/data/family-relationships.data"
import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { isFutureIsoDate } from "@/lib/date-helpers"
import { familyMembers } from "@/db/schema"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
// Date of birth can never be in the future. (Defense in depth — the
// authoritative guard lives in lib/services/family.ts since these schemas are
// not .parse()'d on the write path, but any route that does parse gets it too.)
const dobDate = isoDate.refine((d) => !isFutureIsoDate(d), {
  message: "Date of birth cannot be in the future"
})
const relationshipEnum = z.enum(
  RELATIONSHIP_VALUES as unknown as [string, ...string[]]
)

// Field schemas derived from the family_members table — the user-editable
// columns only (clerk/status/invitation fields are server-managed). relationship
// is nullable in the table but required on the create form, so its schema is
// overridden to a required string.
const familyMemberInsert = createInsertSchema(familyMembers, {
  name: (s) => s.min(1).max(255),
  relationship: z.string().min(1).max(100),
  dateOfBirth: dobDate.nullish(),
  isContributing: z.boolean().optional(),
  notes: z.string().nullish()
})

export const createFamilyMemberBodySchema = familyMemberInsert.pick({
  name: true,
  relationship: true,
  dateOfBirth: true,
  isContributing: true,
  notes: true
})
export type CreateFamilyMemberBody = z.infer<
  typeof createFamilyMemberBodySchema
>

export const updateFamilyMemberBodySchema = createFamilyMemberBodySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided"
  })
export type UpdateFamilyMemberBody = z.infer<
  typeof updateFamilyMemberBodySchema
>

export const inviteFamilyMemberBodySchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email(),
  relationship: relationshipEnum
})
export type InviteFamilyMemberBody = z.infer<
  typeof inviteFamilyMemberBodySchema
>

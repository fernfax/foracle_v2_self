import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const moneyString = z.string().regex(/^-?\d+(\.\d{1,2})?$/);

const policyStatusEnum = z.enum(["active", "lapsed", "cancelled", "matured"]);

const booleanLike = z
  .union([
    z.boolean(),
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false),
  ])
  .pipe(z.boolean());

export const listPoliciesQuerySchema = z.object({
  status: policyStatusEnum.optional(),
  isActive: booleanLike.optional(),
  policyType: z.string().optional(),
  familyMemberId: z.string().optional(),
});
export type ListPoliciesQuery = z.infer<typeof listPoliciesQuerySchema>;

export const createPolicyBodySchema = z.object({
  id: z.string().uuid().optional(),
  familyMemberId: z.string().nullish(),
  linkedExpenseId: z.string().nullish(),
  provider: z.string().min(1).max(255),
  policyNumber: z.string().nullish(),
  policyType: z.string().min(1).max(100),
  status: policyStatusEnum.optional(),
  startDate: isoDate,
  maturityDate: isoDate.nullish(),
  coverageUntilAge: z.number().int().min(0).max(150).nullish(),
  premiumAmount: moneyString,
  premiumFrequency: z.string().min(1).max(50),
  customMonths: z.string().nullish(),
  totalPremiumDuration: z.number().int().min(0).nullish(),
  coverageOptions: z.string().nullish(),
  description: z.string().nullish(),
});
export type CreatePolicyBody = z.infer<typeof createPolicyBodySchema>;

export const updatePolicyBodySchema = z
  .object({
    familyMemberId: z.string().nullish(),
    linkedExpenseId: z.string().nullish(),
    provider: z.string().min(1).max(255).optional(),
    policyNumber: z.string().nullish(),
    policyType: z.string().min(1).max(100).optional(),
    status: policyStatusEnum.optional(),
    startDate: isoDate.optional(),
    maturityDate: isoDate.nullish(),
    coverageUntilAge: z.number().int().min(0).max(150).nullish(),
    premiumAmount: moneyString.optional(),
    premiumFrequency: z.string().min(1).max(50).optional(),
    customMonths: z.string().nullish(),
    totalPremiumDuration: z.number().int().min(0).nullish(),
    coverageOptions: z.string().nullish(),
    description: z.string().nullish(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdatePolicyBody = z.infer<typeof updatePolicyBodySchema>;

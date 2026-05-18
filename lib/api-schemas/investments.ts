import { z } from "zod";

const moneyString = z.string().regex(/^-?\d+(\.\d{1,2})?$/);
const yieldString = z.string().regex(/^-?\d+(\.\d{1,2})?$/);

const investmentTypeEnum = z.enum([
  "stock",
  "cash",
  "bonds",
  "etf",
  "crypto",
  "mutual_fund",
  "reit",
]);

const contributionFrequencyEnum = z.enum(["monthly", "custom"]);

const booleanLike = z
  .union([
    z.boolean(),
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false),
  ])
  .pipe(z.boolean());

export const listInvestmentsQuerySchema = z.object({
  isActive: booleanLike.optional(),
  type: investmentTypeEnum.optional(),
});
export type ListInvestmentsQuery = z.infer<typeof listInvestmentsQuerySchema>;

export const createInvestmentBodySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  type: investmentTypeEnum,
  currentCapital: moneyString,
  projectedYield: yieldString,
  contributionAmount: moneyString,
  contributionFrequency: contributionFrequencyEnum,
  customMonths: z.string().nullish(),
});
export type CreateInvestmentBody = z.infer<typeof createInvestmentBodySchema>;

export const updateInvestmentBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    type: investmentTypeEnum.optional(),
    currentCapital: moneyString.optional(),
    projectedYield: yieldString.optional(),
    contributionAmount: moneyString.optional(),
    contributionFrequency: contributionFrequencyEnum.optional(),
    customMonths: z.string().nullish(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateInvestmentBody = z.infer<typeof updateInvestmentBodySchema>;

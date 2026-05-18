import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const moneyString = z.string().regex(/^-?\d+(\.\d{1,2})?$/);

const goalTypeEnum = z.enum(["primary", "secondary"]);

const booleanLike = z
  .union([
    z.boolean(),
    z.literal("true").transform(() => true),
    z.literal("false").transform(() => false),
  ])
  .pipe(z.boolean());

export const listGoalsQuerySchema = z.object({
  isActive: booleanLike.optional(),
  isAchieved: booleanLike.optional(),
  goalType: goalTypeEnum.optional(),
});
export type ListGoalsQuery = z.infer<typeof listGoalsQuerySchema>;

export const createGoalBodySchema = z.object({
  goalName: z.string().min(1).max(255),
  goalType: goalTypeEnum,
  targetAmount: moneyString,
  targetDate: isoDate,
  currentAmountSaved: moneyString.optional(),
  monthlyContribution: moneyString.nullish(),
  description: z.string().nullish(),
  // When true, the service also creates a linked recurring "Savings"
  // expense whose amount is monthlyContribution. The link is reversed
  // automatically on update / delete.
  addToExpenditures: z.boolean().optional(),
  expenseName: z.string().max(255).nullish(),
});
export type CreateGoalBody = z.infer<typeof createGoalBodySchema>;

export const updateGoalBodySchema = z
  .object({
    goalName: z.string().min(1).max(255).optional(),
    goalType: goalTypeEnum.optional(),
    targetAmount: moneyString.optional(),
    targetDate: isoDate.optional(),
    currentAmountSaved: moneyString.optional(),
    monthlyContribution: moneyString.nullish(),
    description: z.string().nullish(),
    isAchieved: z.boolean().optional(),
    isActive: z.boolean().optional(),
    addToExpenditures: z.boolean().optional(),
    expenseName: z.string().max(255).nullish(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateGoalBody = z.infer<typeof updateGoalBodySchema>;

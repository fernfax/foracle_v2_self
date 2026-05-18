import { z } from "zod";

export const expenseCategoryResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  isDefault: z.boolean().nullable(),
  trackedInBudget: z.boolean().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExpenseCategoryResponse = z.infer<typeof expenseCategoryResponseSchema>;

export const createExpenseCategoryBodySchema = z.object({
  name: z.string().min(1).max(100),
});
export type CreateExpenseCategoryBody = z.infer<typeof createExpenseCategoryBodySchema>;

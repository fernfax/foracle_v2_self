import { z } from "zod";

export const listExpenseSubcategoriesQuerySchema = z.object({
  categoryId: z.string().optional(),
});
export type ListExpenseSubcategoriesQuery = z.infer<
  typeof listExpenseSubcategoriesQuerySchema
>;

export const createExpenseSubcategoryBodySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(100),
});
export type CreateExpenseSubcategoryBody = z.infer<
  typeof createExpenseSubcategoryBodySchema
>;

export const updateExpenseSubcategoryBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });
export type UpdateExpenseSubcategoryBody = z.infer<
  typeof updateExpenseSubcategoryBodySchema
>;

export const expenseSubcategoryResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  categoryId: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExpenseSubcategoryResponse = z.infer<
  typeof expenseSubcategoryResponseSchema
>;

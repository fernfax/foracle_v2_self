import { z } from "zod";

export const budgetQuerySchema = z.object({
  year: z.coerce.number().int().min(1970).max(9999),
  month: z.coerce.number().int().min(1).max(12),
});
export type BudgetQuery = z.infer<typeof budgetQuerySchema>;

import { z } from "zod";

export const chatBodySchema = z.object({
  message: z.string().min(1).max(2000),
  threadId: z.string().optional(),
});
export type ChatBody = z.infer<typeof chatBodySchema>;

export const renameThreadBodySchema = z.object({
  title: z.string().min(1).max(100),
});
export type RenameThreadBody = z.infer<typeof renameThreadBodySchema>;

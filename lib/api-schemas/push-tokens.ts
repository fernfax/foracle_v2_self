import { z } from "zod";

export const platformEnum = z.enum(["ios", "android"]);
export type Platform = z.infer<typeof platformEnum>;

export const registerPushTokenBodySchema = z.object({
  token: z.string().min(1).max(512),
  platform: platformEnum,
});
export type RegisterPushTokenBody = z.infer<typeof registerPushTokenBodySchema>;

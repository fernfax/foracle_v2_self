import { z } from "zod"

export const setSinglishModeBodySchema = z.object({
  enabled: z.boolean()
})
export type SetSinglishModeBody = z.infer<typeof setSinglishModeBodySchema>

export const BACKGROUND_DECORS = ["radial", "peranakan", "none"] as const
export const backgroundDecorEnum = z.enum(BACKGROUND_DECORS)
export const setBackgroundDecorBodySchema = z.object({
  decor: backgroundDecorEnum
})
export type SetBackgroundDecorBody = z.infer<
  typeof setBackgroundDecorBodySchema
>

export const TOUR_NAMES = [
  "overall",
  "dashboard",
  "incomes",
  "expenses",
  "cpf",
  "holdings",
  "goals",
  "budget"
] as const
export const tourNameEnum = z.enum(TOUR_NAMES)
export type TourName = z.infer<typeof tourNameEnum>

export type TourStatus = Record<TourName, string | null>

/** Build a fresh, fully-populated TourStatus with every tour uncompleted. */
export const emptyTourStatus = (): TourStatus =>
  Object.fromEntries(TOUR_NAMES.map((n) => [n, null])) as TourStatus

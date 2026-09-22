import z from "zod";

export const FeedBackBody = z.object({
  emai: z.email(),
  message: z.string().min(0).max(200)
})

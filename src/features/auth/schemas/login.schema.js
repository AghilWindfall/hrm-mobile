import { z } from "zod"

export const loginSchema = z.object({
  identifier: z
    .string({ required_error: "Email or employee ID is required" })
    .min(3, "Enter a valid email or employee ID"),
  password: z.string(),
})

export default loginSchema

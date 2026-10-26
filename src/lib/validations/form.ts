import { z } from "zod";

export const createFormSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),

  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters"),
});

export type CreateFormInput =
  z.infer<typeof createFormSchema>;
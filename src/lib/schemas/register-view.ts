import { z } from "zod";

/**
 * One schema for both forms and both sides. The browser runs it before submitting so typos
 * never cost a round trip; the Server Action runs it again because the client can be bypassed.
 * FormData values are strings, hence `coerce` on the number; an empty field is treated as
 * missing rather than coerced to 0, so it gets the "enter a value" message.
 */
export const registerViewSchema = z.object({
  trackId: z.string().regex(/^[\w-]{1,64}$/, "Invalid track id"),
  views: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce
      .number({ error: "Enter how many views to register" })
      .int("Whole numbers only")
      .min(1, "Register at least 1 view")
      .max(5, "At most 5 views at a time"),
  ),
});

export type RegisterViewInput = z.infer<typeof registerViewSchema>;
export type RegisterViewFieldErrors = Partial<Record<keyof RegisterViewInput, string>>;

/** Parses FormData and reduces Zod's error tree to one message per field. */
export function parseRegisterView(formData: FormData) {
  const result = registerViewSchema.safeParse(Object.fromEntries(formData));
  if (result.success) {
    return { data: result.data, fieldErrors: undefined } as const;
  }
  const { fieldErrors } = z.flattenError(result.error);
  return {
    data: undefined,
    fieldErrors: { trackId: fieldErrors.trackId?.[0], views: fieldErrors.views?.[0] } as const,
  } as const;
}

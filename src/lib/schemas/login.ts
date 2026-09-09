import { z } from "zod";
import { isRedirectPath } from "@/lib/auth/paths";

/** What the credentials provider verifies. */
export const credentialsSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }),
  password: z.string().min(1, "Enter your password"),
});

/**
 * What the login form posts. Validated in the browser before the submit and again in the
 * Server Action, like the register-view form. A tampered redirectTo is dropped rather than
 * reported: the user cannot fix it, and the fallback (the account page) is always fine.
 */
export const loginSchema = credentialsSchema.extend({
  redirectTo: z
    .string()
    .refine(isRedirectPath, "Must be a relative path")
    .optional()
    .catch(undefined),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginFieldErrors = Partial<Record<"email" | "password", string>>;

/** Parses FormData and reduces Zod's error tree to one message per field. */
export function parseLogin(formData: FormData) {
  const result = loginSchema.safeParse(Object.fromEntries(formData));
  if (result.success) {
    return { data: result.data, fieldErrors: undefined } as const;
  }
  const { fieldErrors } = z.flattenError(result.error);
  return {
    data: undefined,
    fieldErrors: { email: fieldErrors.email?.[0], password: fieldErrors.password?.[0] } as const,
  } as const;
}

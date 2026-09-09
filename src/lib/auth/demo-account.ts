/**
 * The one account the demo knows. It is public on purpose: the login page prints it and the
 * end-to-end tests sign in with it. The server never compares against this plaintext; it keeps
 * a salted hash in users.ts, as a real user table would.
 */
export const DEMO_ACCOUNT = {
  name: "Cadet Kitty",
  email: "cadet@catstronauts.dev",
  password: "space-cat",
} as const;

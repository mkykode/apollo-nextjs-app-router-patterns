/**
 * The one account the demo knows. It is public on purpose: the login page prints it and the
 * end-to-end tests sign in with it. The server never compares against this plaintext; Better
 * Auth hashes the password into the account table when migrate.ts seeds it, as a real user
 * table would.
 */
export const DEMO_ACCOUNT = {
  name: "Cadet Kitty",
  email: "cadet@catstronauts.dev",
  password: "space-cat",
} as const;

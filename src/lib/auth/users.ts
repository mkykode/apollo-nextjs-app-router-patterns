import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { DEMO_ACCOUNT } from "./demo-account";

/** What the rest of the app may see of a user: a DTO with no password material. */
export interface User {
  id: string;
  name: string;
  email: string;
}

interface UserRecord extends User {
  /** `scrypt$<salt hex>$<key hex>`, produced by hashPassword. */
  passwordHash: string;
}

/**
 * The users "table". A real app queries a database; the shape of the code stays the same:
 * find the record, verify the password against its salted hash, hand back a DTO without the
 * hash. The whole module is server-only, so the hash can never end up in a client bundle.
 */
const USERS: readonly UserRecord[] = [
  {
    id: "cadet-1",
    name: DEMO_ACCOUNT.name,
    email: DEMO_ACCOUNT.email,
    passwordHash: "scrypt$e397c33c378796c01cd8588efab3f973$afd1795acac132d5ec71fb56e5606c227cba2d6c150514688721ec74dbbb67204f9367a4f9c1908b60aff91900378b6f0dd518f6f8465bf2c0a8ee16dbc162ee",
  },
];

const KEY_LENGTH = 64;

/** scrypt is in Node's standard library: no bcrypt dependency, no native build. */
export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return `scrypt$${salt}$${scryptSync(password, salt, KEY_LENGTH).toString("hex")}`;
}

/** Constant-time comparison, so response timing does not reveal how many bytes matched. */
export function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, keyHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

export function findUserByEmail(email: string) {
  const wanted = email.trim().toLowerCase();
  return USERS.find((user) => user.email.toLowerCase() === wanted);
}

/** Strip everything a session must not carry. */
export function toUser({ id, name, email }: UserRecord): User {
  return { id, name, email };
}

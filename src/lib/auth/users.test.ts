import { describe, expect, it, vi } from "vitest";

// The module is guarded by `server-only`, which throws outside React Server Components.
vi.mock("server-only", () => ({}));

import { DEMO_ACCOUNT } from "./demo-account";
import { findUserByEmail, hashPassword, toUser, verifyPassword } from "./users";

describe("users", () => {
  it("stores the demo password as a salted hash that verifies", () => {
    const user = findUserByEmail(DEMO_ACCOUNT.email);
    expect(user?.passwordHash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(user?.passwordHash).not.toContain(DEMO_ACCOUNT.password);
    expect(verifyPassword(DEMO_ACCOUNT.password, user!.passwordHash)).toBe(true);
    expect(verifyPassword("space-dog", user!.passwordHash)).toBe(false);
  });

  it("round-trips hashPassword with a fresh salt each time", () => {
    const first = hashPassword("secret");
    const second = hashPassword("secret");
    expect(first).not.toBe(second);
    expect(verifyPassword("secret", first)).toBe(true);
    expect(verifyPassword("secret", second)).toBe(true);
  });

  it("rejects stored values it did not produce instead of throwing", () => {
    expect(verifyPassword("secret", "secret")).toBe(false);
    expect(verifyPassword("secret", "bcrypt$salt$hash")).toBe(false);
    expect(verifyPassword("secret", "scrypt$$")).toBe(false);
  });

  it("finds users by email regardless of case and whitespace", () => {
    expect(findUserByEmail("  Cadet@Catstronauts.dev ")?.id).toBe("cadet-1");
    expect(findUserByEmail("nobody@catstronauts.dev")).toBeUndefined();
  });

  it("toUser drops the hash", () => {
    const user = findUserByEmail(DEMO_ACCOUNT.email)!;
    expect(toUser(user)).toEqual({ id: "cadet-1", name: DEMO_ACCOUNT.name, email: DEMO_ACCOUNT.email });
    expect(toUser(user)).not.toHaveProperty("passwordHash");
  });
});

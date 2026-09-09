import { describe, expect, it } from "vitest";
import { parseLogin } from "./login";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

describe("parseLogin", () => {
  it("accepts an email, a password, and a relative redirect", () => {
    expect(
      parseLogin(form({ email: "cadet@catstronauts.dev", password: "space-cat", redirectTo: "/rsc" })),
    ).toEqual({
      data: { email: "cadet@catstronauts.dev", password: "space-cat", redirectTo: "/rsc" },
      fieldErrors: undefined,
    });
  });

  it("returns one message per field", () => {
    expect(parseLogin(form({ email: "cadet", password: "" }))).toEqual({
      data: undefined,
      fieldErrors: { email: "Enter a valid email address", password: "Enter your password" },
    });
  });

  it("drops a redirect that is not a relative path instead of failing the login", () => {
    const { data } = parseLogin(
      form({ email: "cadet@catstronauts.dev", password: "space-cat", redirectTo: "https://evil.example" }),
    );
    expect(data?.redirectTo).toBeUndefined();
  });
});

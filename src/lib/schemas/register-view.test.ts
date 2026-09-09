import { describe, expect, it } from "vitest";
import { parseRegisterView } from "./register-view";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

describe("parseRegisterView", () => {
  it("coerces the numeric field and accepts valid input", () => {
    expect(parseRegisterView(form({ trackId: "c_0", views: "3" }))).toEqual({
      data: { trackId: "c_0", views: 3 },
      fieldErrors: undefined,
    });
  });

  it.each([
    ["0", "Register at least 1 view"],
    ["9", "At most 5 views at a time"],
    ["1.5", "Whole numbers only"],
    ["", "Enter how many views to register"],
  ])("rejects views=%s with one message", (views, message) => {
    const result = parseRegisterView(form({ trackId: "c_0", views }));
    expect(result.data).toBeUndefined();
    expect(result.fieldErrors?.views).toBe(message);
  });

  it("rejects a malformed track id", () => {
    expect(parseRegisterView(form({ trackId: "../etc", views: "1" })).fieldErrors?.trackId).toBe(
      "Invalid track id",
    );
  });
});

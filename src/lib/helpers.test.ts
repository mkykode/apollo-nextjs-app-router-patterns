import { describe, expect, it } from "vitest";
import { humanReadableTimeFromSeconds } from "./helpers";

describe("humanReadableTimeFromSeconds", () => {
  it.each([
    [30, "30s"],
    [60, "1m"],
    [2377, "39m"],
    [3600, "1h 0m"],
    [3660, "1h 1m"],
  ])("formats %i seconds as %s", (seconds, expected) => {
    expect(humanReadableTimeFromSeconds(seconds)).toBe(expected);
  });
});

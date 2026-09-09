import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { describe, expect, it, vi } from "vitest";

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));
vi.mock("next/navigation", () => ({ notFound }));

import { isNotFoundError, rethrowAsNotFound } from "./not-found";

/** The exact shape the Odyssey API returns for an unknown id (HTTP 200 + GraphQL error). */
const upstream404 = new CombinedGraphQLErrors({
  errors: [
    {
      message: "404: Not Found",
      path: ["track"],
      extensions: { response: { status: 404, statusText: "Not Found" }, code: "INTERNAL_SERVER_ERROR" },
    },
  ],
});

describe("rethrowAsNotFound", () => {
  it("turns the API's upstream 404 into Next's notFound()", () => {
    expect(isNotFoundError(upstream404)).toBe(true);
    expect(() => rethrowAsNotFound(upstream404)).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("rethrows everything else untouched", () => {
    const otherGraphqlError = new CombinedGraphQLErrors({ errors: [{ message: "bad field" }] });
    const httpFailure = new ServerError("boom", {
      response: new Response(null, { status: 503 }),
      bodyText: "",
    });
    expect(isNotFoundError(otherGraphqlError)).toBe(false);
    expect(isNotFoundError(httpFailure)).toBe(false);
    expect(() => rethrowAsNotFound(httpFailure)).toThrow(httpFailure);
    expect(() => rethrowAsNotFound(new Error("network"))).toThrow("network");
  });
});

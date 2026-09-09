import { ApolloLink, gql } from "@apollo/client";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { describe, expect, it } from "vitest";
import { shouldRetry } from "./links";

const query = gql`
  query Q {
    tracksForHome {
      id
    }
  }
`;
const mutation = gql`
  mutation M {
    incrementTrackViews(id: "c_0") {
      success
    }
  }
`;
const operation = (document: typeof query) =>
  ({ query: document, operationName: "op" }) as unknown as ApolloLink.Operation;

const serverError = (statusCode: number) =>
  new ServerError("boom", { response: new Response(null, { status: statusCode }), bodyText: "" });

describe("shouldRetry", () => {
  it("retries transient network failures on queries", () => {
    expect(shouldRetry(new Error("socket hang up"), operation(query))).toBe(true);
    expect(shouldRetry(serverError(503), operation(query))).toBe(true);
  });

  it("never retries mutations", () => {
    expect(shouldRetry(new Error("socket hang up"), operation(mutation))).toBe(false);
  });

  it("does not retry GraphQL errors or 4xx responses", () => {
    const graphqlError = new CombinedGraphQLErrors({ errors: [{ message: "bad field" }] });
    expect(shouldRetry(graphqlError, operation(query))).toBe(false);
    expect(shouldRetry(serverError(404), operation(query))).toBe(false);
  });
});

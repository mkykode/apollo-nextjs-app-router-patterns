import type { CodegenConfig } from "@graphql-codegen/cli";
import { GRAPHQL_URI } from "./src/lib/graphql-uri";

/**
 * Apollo's recommended codegen setup for Apollo Client 4:
 * typescript + typescript-operations + typed-document-node.
 * Operations live in .graphql files; fragments are colocated with the component that owns them.
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: GRAPHQL_URI,
  documents: ["src/**/*.graphql"],
  ignoreNoDocuments: true,
  generates: {
    "./src/__generated__/graphql.ts": {
      plugins: ["typescript", "typescript-operations", "typed-document-node"],
      config: {
        avoidOptionals: { field: true, inputValue: false },
        defaultScalarType: "unknown",
        nonOptionalTypename: true,
        skipTypeNameForRoot: true,
      },
    },
  },
};

export default config;

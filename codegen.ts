import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "https://odyssey-lift-off-server.herokuapp.com/",
  documents: ["src/**/*.tsx"],
  generates: {
    './src/__generated__/': {
      preset: 'client',
      presetConfig: { gqlTagName: 'gql' },
    },
    './src/__generated__/types.ts': {
      plugins: ['typescript'],
    },
  },
  // ignoreNoDocuments: true,
};

export default config;

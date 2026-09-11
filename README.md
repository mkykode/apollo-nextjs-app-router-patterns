# Tutorial: Catstronauts on the Next.js App Router with Apollo Client 4

You finished Apollo Odyssey's [Client-side GraphQL with React & Apollo](https://odyssey.apollographql.com/client-side-graphql-react). That app is a Vite single-page app: every query runs in the browser with `useQuery`. This tutorial rebuilds it on the **Next.js 16 App Router** with **Apollo Client 4** and [`@apollo/client-integration-nextjs`](https://github.com/apollographql/apollo-client-integrations), and renders the same two pages (track list, track detail) **six times, once per data-fetching pattern**, so you can compare them on live data.

By the end you will be able to:

- set up the two Apollo Client instances an App Router app needs, and explain why there are two
- fetch in a Server Component with `query()`, in a Client Component with `useSuspenseQuery`, hand a request from server to client with `PreloadQuery`, avoid waterfalls with `useBackgroundQuery`, and say when `useQuery` is still the right tool
- use every caching lever of the classic Next.js model on purpose: `dynamic` (`force-dynamic`, `force-static`, `error`), segment `revalidate`, fetch `next.revalidate` and tags, `generateStaticParams`, `dynamicParams`, `updateTag`, `revalidatePath`, and `revalidateTag`
- run a mutation with `useMutation` and with a Server Action, from a click and from a form, validate with one Zod schema on both sides, and let the normalized cache do the update
- keep search and pagination in the URL so the server can read them, and know when component state with `useDeferredValue` is the better fit
- stream independent sections behind content-shaped skeletons, scope `loading.tsx` with a route group, and turn an API miss into a real 404
- compose an Apollo link chain (error, retry, auth headers) and manage local state with reactive variables and `@client` fields
- add a login with Auth.js: a route kept behind the session by `proxy.ts`, the session read again in a Server Component and a Server Action, and its token handed to Apollo per operation
- ship metadata through file conventions, including Open Graph images generated from GraphQL data
- use transitions to change a suspense query's variables or call a Server Action without dropping the current UI
- animate navigations with React's `<ViewTransition>`: a shared-element morph, Suspense reveals, directional slides from transition types, and a same-route crossfade, and say why the morph only pairs on prefetched pages
- tell the cases apart: `useLayoutEffect` for DOM measurement, `useEffect` for external subscriptions, `useEffectEvent` for the latest state inside a subscription, and no effect for everything else
- handle errors, loading, and a trap in suspense error recovery
- test all of it with Vitest, Apollo's `MockedProvider`, and Playwright

**Starting point:** the finished course app on the `course` branch of this repo. **Finished result:** the `dynamic` branch. Every step names the finished file so you can compare when stuck. **Time:** about three hours. **Prerequisites:** Node 24, pnpm 11, and the course itself.

Run the finished app any time:

```sh
git checkout dynamic
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # unit tests
pnpm test:e2e     # Playwright against a production build
```

## Branches

| Branch | What it is | Switch |
| --- | --- | --- |
| `course` | The finished Odyssey course app: Vite, React Router, Apollo Client 3 | `git checkout course` |
| `dynamic` | The rebuild under the classic Next.js rendering model: `export const dynamic`, fetch `revalidate` and tags, route `/revalidate` | `git checkout dynamic` |
| `use-cache` | The same rebuild under Cache Components: `"use cache"`, `cacheLife`, `cacheTag`, `connection()`, route `/use-cache` | `git checkout use-cache` |

You are reading the `dynamic` branch. The two rendering models cannot coexist in one app, which is why they are branches; `git diff dynamic use-cache -- src` shows everything the model changes.

The reference material (pattern table, architecture diagram, interview talking points, known quirks) lives in [docs/patterns.md](docs/patterns.md).

## Contents

1. [Start from the course app](#step-1-start-from-the-course-app)
2. [Replace the toolchain](#step-2-replace-the-toolchain)
3. [Root layout and global styles](#step-3-root-layout-and-global-styles)
4. [Describe the data: `.graphql` files and codegen](#step-4-describe-the-data-graphql-files-and-codegen)
5. [Two Apollo Clients](#step-5-two-apollo-clients)
6. [Shared UI and the pattern registry](#step-6-shared-ui-and-the-pattern-registry)
7. [Pattern 1: RSC `query()` and a Server Action](#step-7-pattern-1-rsc-query-and-a-server-action)
8. [Pattern 2: `useSuspenseQuery` and streaming SSR](#step-8-pattern-2-usesuspensequery-and-streaming-ssr)
9. [Pattern 3: `PreloadQuery`](#step-9-pattern-3-preloadquery)
10. [Pattern 4: `useBackgroundQuery`](#step-10-pattern-4-usebackgroundquery)
11. [Pattern 5: `useQuery`, the course way](#step-11-pattern-5-usequery-the-course-way)
12. [Pattern 6: RSC and the Next.js Data Cache](#step-12-pattern-6-rsc-and-the-nextjs-data-cache)
13. [URL state: search and pagination](#step-13-url-state-search-and-pagination)
14. [Streaming sections, skeletons, route groups, and not found](#step-14-streaming-sections-skeletons-route-groups-and-not-found)
15. [Forms: a Server Action and a client mutation](#step-15-forms-a-server-action-and-a-client-mutation)
16. [Transitions: keep the old UI while the new one loads](#step-16-transitions-keep-the-old-ui-while-the-new-one-loads)
17. [View transitions: continuity between pages](#step-17-view-transitions-continuity-between-pages)
18. [Effects: useLayoutEffect, useEffect, useEffectEvent, and no effect at all](#step-18-effects-uselayouteffect-useeffect-useeffectevent-and-no-effect-at-all)
19. [Apollo local state: reactive variables and client fields](#step-19-apollo-local-state-reactive-variables-and-client-fields)
20. [The link chain](#step-20-the-link-chain)
21. [Authentication: Auth.js, the proxy, and the session in Server Actions](#step-21-authentication-authjs-the-proxy-and-the-session-in-server-actions)
22. [Metadata: file conventions and Open Graph images](#step-22-metadata-file-conventions-and-open-graph-images)
23. [Errors and retry](#step-23-errors-and-retry)
24. [Tests](#step-24-tests)
25. [Build and ship](#step-25-build-and-ship)
26. [What you learned](#what-you-learned)

Each step ends with a **Check**. Do the check before moving on.

## Step 1: Start from the course app

```sh
git checkout course
git checkout -b my-app-router
```

Look around before changing anything. The pieces you will replace: `vite.config.ts` and `index.html` (the build), `src/pages` and `react-router-dom` (routing), `@emotion/styled` and `@apollo/space-kit` (styling), Apollo Client 3 with `uri` in the constructor, and codegen's `client-preset` with its `gql()` function.

**Check:** `pnpm start` still serves the course app on port 3000. Stop it.

## Step 2: Replace the toolchain

Delete the files that only made sense for Vite:

```sh
git rm -r index.html vite.config.ts src/index.tsx src/pages src/react-app-env.d.ts \
  package-lock.json public/_redirects src/__generated__ src/styles.tsx \
  src/components/index.ts src/components/layout.tsx src/components/__tests__ \
  src/containers src/utils src/components/module-detail.tsx src/components/modules-navigation.tsx
```

`module-detail` and `modules-navigation` were never reachable from a route in the finished course, so they go too, together with `react-player` and the window-size hook.

Replace the dependency blocks in `package.json`. The versions here are the ones the finished branch uses; take the latest when you follow along.

```json
{
  "name": "apollo-nextjs-app-router-patterns",
  "version": "2.0.0",
  "private": true,
  "description": "Catstronauts on Next.js 16 App Router: every Apollo Client 4 data-fetching pattern side by side",
  "packageManager": "pnpm@11.22.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "next typegen && tsc --noEmit",
    "test": "vitest",
    "generate": "graphql-codegen --config codegen.ts",
    "test:e2e": "playwright test",
    "docs:readme": "node scripts/build-readme.mjs"
  },
  "dependencies": {
    "@apollo/client": "^4.2.12",
    "@apollo/client-integration-nextjs": "^0.14.5",
    "@graphql-typed-document-node/core": "^3.2.0",
    "graphql": "^17.0.2",
    "next": "16.3.4",
    "next-auth": "5.0.0-beta.32",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-markdown": "^10.1.0",
    "rxjs": "^7.8.2",
    "server-only": "^0.0.1",
    "zod": "^4.5.4"
  },
  "devDependencies": {
    "@graphql-codegen/cli": "^7.4.0",
    "@graphql-codegen/typed-document-node": "^7.1.0",
    "@graphql-codegen/typescript": "^6.1.0",
    "@graphql-codegen/typescript-operations": "^6.1.6",
    "@next/env": "16.3.4",
    "@playwright/test": "^1.63.0",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.3",
    "@types/node": "^24",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^6.1.1",
    "eslint": "^9",
    "eslint-config-next": "16.3.4",
    "happy-dom": "^20.14.0",
    "typescript": "^5",
    "vitest": "^5.0.0"
  },
  "author": "Raphael Terrier @R4ph-t",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/mkykode/apollo-nextjs-app-router-patterns.git"
  }
}
```

pnpm blocks postinstall scripts unless allowed:

```yaml
# pnpm-workspace.yaml
allowBuilds:
  esbuild: true
  sharp: false
  unrs-resolver: false
```

Install, then add the three config files.

```sh
pnpm install
```

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    remotePatterns: [
      // Restricted to the paths the Odyssey API serves, so the optimizer cannot be used as an open proxy.
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/apollographql/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-*" },
    ],
  },
};

export default nextConfig;
```

`typedRoutes` makes `<Link href>` type-checked against the route tree. `remotePatterns` is required for `next/image` with remote URLs; restrict the paths, or the image optimizer becomes an open proxy.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "**/*.mts",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/__generated__/**",
  ]),
]);

export default eslintConfig;
```

`next lint` was removed in Next 16; run `eslint` directly. Finally the env example, so the endpoint can be overridden without code changes:

```sh
# .env.example
# Optional. Defaults to the Odyssey Lift-off server when unset.
# NEXT_PUBLIC_GRAPHQL_URI=https://odyssey-lift-off-server.herokuapp.com/

# Required by POST /api/revalidate (on-demand revalidation). Any long random string.
# REVALIDATE_SECRET=

# Absolute origin used for Open Graph and other metadata URLs (metadataBase).
# NEXT_PUBLIC_SITE_URL=https://example.com

# Required by Auth.js to sign the session cookie. Generate one: `npx auth secret` or
# `openssl rand -base64 32`. .env.development carries a development-only value.
# AUTH_SECRET=
```

**Check:** `pnpm exec next --version` prints `Next.js 16.x`, and `pnpm lint` runs without complaining about the config.

## Step 3: Root layout and global styles

Emotion cannot render in Server Components, and the whole point of this rebuild is to keep components on the server unless they need a handler or a hook. So the styling moves to CSS Modules. The palette, reset, and typography that `@apollo/space-kit` used to provide become tokens in `src/app/globals.css`:

```css
:root {
  --pink-base: #f25cc1;
  --pink-light: #ffa3e0;
  --silver-light: #f4f6f8;
  --grey-dark: #5a6270;
  --black-base: #191c23;
  /* ...the full space-kit palette is in the file... */

  --color-accent: var(--pink-base);
  --color-background: var(--silver-light);
  --color-text: var(--black-base);
  --color-text-secondary: var(--grey-dark);

  --width-regular-page: 1100px;
  --width-text-page: 800px;
}

body {
  margin: 0;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  font-family: var(--font-sans), sans-serif;
  background-color: var(--color-background);
  background-image: url("/space_kitty_pattern.png");
  color: var(--color-text);
}
```

Copy the complete file from `src/app/globals.css`. Two things to notice while you port the emotion styles: the course's `PageContainer` declared `padding: 16` without a unit, which browsers drop, so the real layout has no padding; and the `#root` rules move to `body`, because the App Router has no root div.

Now the root layout. Fonts come from `next/font` instead of the Google Fonts `@font-face` block space-kit shipped:

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Source_Code_Pro, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ApolloWrapper } from "@/lib/apollo/apollo-wrapper";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

const sourceCode = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  // Absolute base for og:image and friends. Icons, the manifest, and the Open Graph image
  // are file conventions next to this layout (favicon.ico, apple-icon.png, manifest.ts,
  // opengraph-image.tsx), so nothing else needs listing here.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Catstronauts",
    template: "%s | Catstronauts",
  },
  description: "Apollo Client 4 data-fetching patterns on the Next.js App Router",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${sourceCode.variable}`}>
      <body>
        <Header />
        <ApolloWrapper>{children}</ApolloWrapper>
        <Footer />
      </body>
    </html>
  );
}
```

`ApolloWrapper` does not exist yet; you write it in Step 5. Leave the import in and keep going, or comment it out until then.

Port the presentational components next. Each one gets a `.module.css` next to it. None of them needs `"use client"`:

| Component | Finished file | Notes |
| --- | --- | --- |
| Header | `src/components/header.tsx` | Renders `PatternNav` (Step 6). Logo through `next/image` with a static import. |
| Footer | `src/components/footer.tsx` | Uses the inlined `ApolloIcon`. |
| PageContainer | `src/components/page-container.tsx` | `<main>` with an optional `grid` mode. |
| Loading | `src/components/loading.tsx` | The space-kit spinner as inline SVG with a CSS keyframe. |
| Button | `src/components/button.tsx` | Space-kit's large raised pink button, in CSS. |
| Icons | `src/components/icons.tsx` | Space-kit's SVG paths, inlined so they render on the server. |
| ContentSection, MarkdownContent | `src/components/content-section.tsx`, `src/components/md-content.tsx` | `react-markdown` 10 works in Server Components. |

Add a placeholder home page so the app renders:

```tsx
// src/app/page.tsx (temporary)
import { PageContainer } from "@/components/page-container";

export default function HomePage() {
  return (
    <PageContainer>
      <h1>Catstronauts</h1>
    </PageContainer>
  );
}
```

**Check:** `pnpm dev`, open http://localhost:3000. Header, pink title, footer, kitty background. No console errors.

## Step 4: Describe the data: `.graphql` files and codegen

The course generated types with `client-preset` and a `gql()` function. The Apollo Client 4 recommendation is `typescript` + `typescript-operations` + `typed-document-node`, with operations in `.graphql` files. Hooks then infer their types from the document, and you never write `useQuery<Data, Vars>` generics again.

One endpoint constant, shared by codegen and both clients:

```ts
// src/lib/graphql-uri.ts
/**
 * Single source of truth for the GraphQL endpoint.
 * Read by codegen (schema introspection), the RSC client, and the browser/SSR client.
 * Must be absolute: relative URLs cannot be fetched during server rendering.
 */
export const GRAPHQL_URI =
  process.env.NEXT_PUBLIC_GRAPHQL_URI ??
  "https://odyssey-lift-off-server.herokuapp.com/";
```

```ts
// codegen.ts
import type { CodegenConfig } from "@graphql-codegen/cli";
import { GRAPHQL_URI } from "./src/lib/graphql-uri";

/**
 * Apollo's recommended codegen setup for Apollo Client 4:
 * typescript + typescript-operations + typed-document-node.
 * Operations live in .graphql files; fragments are colocated with the component that owns them.
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: [GRAPHQL_URI, "src/graphql/client-schema.graphql"],
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
```

Each component owns a fragment named `Component_prop`, colocated with the component. Page queries spread those fragments, so the query mirrors the component tree.

```graphql
# src/components/track-card.graphql
# Colocated fragment: exactly the fields TrackCard renders, nothing more.
fragment TrackCard_track on Track {
  id
  title
  thumbnail
  length
  modulesCount
  author {
    id
    name
    photo
  }
}
```

```graphql
# src/components/track-detail.graphql
# Colocated fragment: exactly the fields TrackDetail renders.
fragment TrackDetail_track on Track {
  id
  title
  description
  thumbnail
  length
  modulesCount
  numberOfViews
  author {
    id
    name
    photo
  }
  modules {
    id
    title
    length
  }
}
```

```graphql
# src/graphql/tracks.graphql
# Page-level operations. Each page has one query composed from colocated component fragments.

query GetTracks {
  tracksForHome {
    id
    ...TrackCard_track
  }
}

query GetTrack($trackId: ID!) {
  track(id: $trackId) {
    id
    ...TrackDetail_track
  }
}

# The response selects `track { id numberOfViews }` so the normalized cache
# updates the Track entity automatically: no manual cache write, no refetch.
mutation IncrementTrackViews($trackId: ID!) {
  incrementTrackViews(id: $trackId) {
    code
    success
    message
    track {
      id
      numberOfViews
    }
  }
}
```

Generate:

```sh
pnpm generate
```

**Check:** `src/__generated__/graphql.ts` exports `GetTracksDocument`, `GetTrackDocument`, `IncrementTrackViewsDocument`, and the fragment types `TrackCard_TrackFragment` and `TrackDetail_TrackFragment`. Commit the generated file; the app must build without the live API.

## Step 5: Two Apollo Clients

An App Router app has two module graphs. Server Components run once per request on the server and have no React context. Client Components run twice: on the server during streaming SSR, and again in the browser. Each world needs its own Apollo Client.

First, Apollo's dev messages, loaded outside production only:

```ts
// src/lib/apollo/dev-messages.ts
import { loadDevMessages, loadErrorMessages } from "@apollo/client/dev";

// Apollo Client 4 ships error messages as an opt-in bundle; load them outside production only.
if (process.env.NODE_ENV === "development") {
  loadDevMessages();
  loadErrorMessages();
}
```

The Server Component client. `registerApolloClient` wraps your factory in React's `cache()`, so every Server Component and Server Action in one request shares an instance and identical queries are deduplicated. `import "server-only"` turns any accidental client import into a build error.

```ts
// src/lib/apollo/rsc-client.ts
import "server-only";
import "./dev-messages";
import { ApolloClient, registerApolloClient } from "@apollo/client-integration-nextjs";
import { GRAPHQL_URI } from "@/lib/graphql-uri";
import { createCache } from "./cache";
import { createLinkChain } from "./links";

/**
 * Apollo Client for React Server Components and Server Actions.
 *
 * registerApolloClient wraps the factory in React's `cache()`, so every Server Component
 * in one request shares a single client and identical queries are deduplicated.
 * Data fetched here is rendered on the server; it never reaches the browser cache.
 *
 * - getClient(): the per-request client (query, mutate, readQuery...)
 * - query(): shortcut for getClient().query()
 * - PreloadQuery: start a request in RSC and hand the result to Client Components
 *
 * Caching is decided per route, not here. On the server, HttpLink hands `fetchOptions` to
 * Next.js's patched fetch, so Next-only options apply: a route can pass
 * `context: { fetchOptions: { next: { revalidate, tags } } }` to store a response in the
 * Data Cache (see /revalidate), or export `dynamic = "force-dynamic"` to render per request
 * (see the layout.tsx of /rsc). Without either, Next.js fetches once at build time.
 */
export const { getClient, query, PreloadQuery } = registerApolloClient(
  () =>
    new ApolloClient({
      cache: createCache(),
      // The same chain as the browser client (src/lib/apollo/links.ts), with a header that
      // marks server-side requests in the API's logs. A session token would be resolved here
      // per request, for example from cookies(), and attached by the SetContextLink.
      link: createLinkChain({ uri: GRAPHQL_URI, headers: { "x-apollo-origin": "rsc" } }),
    }),
);
```

The Client Component client. `ApolloNextAppProvider` calls `makeClient` on the server for the SSR pass and again in the browser. The `ApolloClient` and `InMemoryCache` from the integration package are subclasses that record every query result during SSR, stream it into the HTML, and replay it into the browser cache, so hydration does not refetch.

```tsx
// src/lib/apollo/apollo-wrapper.tsx
"use client";

import "./dev-messages";
import { ApolloClient, ApolloNextAppProvider } from "@apollo/client-integration-nextjs";
import type { PropsWithChildren } from "react";
import { GRAPHQL_URI } from "@/lib/graphql-uri";
import { createCache } from "./cache";
import { createLinkChain } from "./links";

/**
 * Apollo Client for Client Components.
 *
 * Client Components render twice: once on the server (streaming SSR) and once in the browser.
 * ApolloNextAppProvider calls makeClient in both environments. During SSR it records every
 * query result and streams it into the HTML, so the browser client hydrates with a warm cache
 * instead of refetching. The ApolloClient and InMemoryCache imported from the integration
 * package are subclasses instrumented for that transport.
 */
function makeClient() {
  return new ApolloClient({
    cache: createCache(),
    // No custom headers here: the browser would need CORS approval for each one. A session
    // token would come from getToken (a cookie-backed session or an in-memory value).
    link: createLinkChain({ uri: GRAPHQL_URI }),
  });
}

export function ApolloWrapper({ children }: PropsWithChildren) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
```

Both factories call `createCache()` and `createLinkChain()` instead of `new InMemoryCache()` and `new HttpLink()`. Treat them as exactly that for now; Step 19 and Step 20 open them up.

You already render `<ApolloWrapper>{children}</ApolloWrapper>` in the layout from Step 3. A common worry: does a Client Component wrapper in the root layout turn every page into a Client Component? No. `"use client"` is a boundary in the module **import** graph. A Client Component makes what it imports client code; what it receives as `children` was rendered on the server already and arrives as a slot. Context never reaches Server Components, so the provider is invisible to them.

**Check:** `pnpm build` succeeds. Then try it the wrong way: import `getClient` from `rsc-client.ts` inside `apollo-wrapper.tsx`. The build fails with a `server-only` error. Remove the import.

## Step 6: Shared UI and the pattern registry

All five patterns render the same components. The registry is the single source of truth for routes, the header navigation, the index page, and the end-to-end tests:

```ts
// src/lib/patterns.ts
import type { Route } from "next";

export type PatternSlug =
  | "rsc"
  | "suspense"
  | "preload"
  | "background"
  | "legacy"
  | "revalidate";

export interface Pattern {
  slug: PatternSlug;
  title: string;
  /** Where the GraphQL request is made. */
  fetchedBy: "Server Component" | "Client Component";
  /** Whether the server-rendered HTML already contains the track data (false: it contains the spinner). */
  shipsDataInHtml: boolean;
  summary: string;
}

/**
 * Single source of truth for the demo routes.
 * Every pattern renders the same two pages (track list, track detail) with a different data-fetching strategy.
 */
export const PATTERNS: readonly Pattern[] = [
  {
    slug: "rsc",
    title: "RSC query()",
    fetchedBy: "Server Component",
    shipsDataInHtml: true,
    summary:
      "registerApolloClient gives one client per request. The page awaits query() and renders on the server; nothing reaches the browser cache. Mutation runs through a Server Action.",
  },
  {
    slug: "suspense",
    title: "useSuspenseQuery",
    fetchedBy: "Client Component",
    shipsDataInHtml: true,
    summary:
      "The page is a Client Component. It suspends during streaming SSR, the result is transported into the browser cache, and the cache stays live after hydration.",
  },
  {
    slug: "preload",
    title: "PreloadQuery",
    fetchedBy: "Server Component",
    shipsDataInHtml: true,
    summary:
      "A Server Component starts the request with PreloadQuery and a Client Component reads it with useSuspenseQuery or useReadQuery. No waterfall, and the data lands in the browser cache.",
  },
  {
    slug: "background",
    title: "useBackgroundQuery",
    fetchedBy: "Client Component",
    shipsDataInHtml: true,
    summary:
      "Client-only version of preloading: the parent starts the query with useBackgroundQuery and passes a queryRef to a child that reads it with useReadQuery.",
  },
  {
    slug: "legacy",
    title: "useQuery",
    fetchedBy: "Client Component",
    shipsDataInHtml: false,
    summary:
      "The way the Odyssey course does it. useQuery does not suspend, so SSR renders the spinner and the data is fetched only in the browser.",
  },
  {
    slug: "revalidate",
    title: "RSC + revalidate",
    fetchedBy: "Server Component",
    shipsDataInHtml: true,
    summary:
      "The RSC pattern with Next.js caching: each query opts into the Data Cache with revalidate and tags, the route is static, and the Server Action calls updateTag so a click shows fresh data.",
  },
];

export const tracksHref = (slug: PatternSlug): Route => `/${slug}`;

export const trackHref = (slug: PatternSlug, trackId: string): Route =>
  `/${slug}/track/${trackId}` as Route;
```

`PatternNav` (`src/components/pattern-nav.tsx`) is the one Client Component in the header: it reads `usePathname()` and links every pattern to the same sub-path, so you can jump from `/rsc/track/c_0` to `/preload/track/c_0`. The index page (`src/app/page.tsx`) lists the registry; replace the placeholder from Step 3 with the finished file. It exports `dynamic = "error"`: the page has no request-time data, and this turns that into a build-time guarantee instead of a silent fallback to dynamic rendering.

`TrackDetail` (`src/components/track-detail.tsx`) is a plain Server Component that takes a `TrackDetail_TrackFragment`. The card and grid are Client Components, and the reason is instructive:

```tsx
// src/components/track-grid.tsx
"use client";

import type { TrackCard_TrackFragment } from "@/__generated__/graphql";
import { type PatternSlug, trackHref } from "@/lib/patterns";
import { TrackCard } from "./track-card";

/** Cards visible above the fold at desktop width; their images load eagerly (LCP). */
const ABOVE_THE_FOLD = 3;

interface TrackGridProps {
  tracks: readonly TrackCard_TrackFragment[];
  /** Which pattern's detail page the cards link to. */
  pattern: PatternSlug;
  /**
   * Increments the view count. Either the useMutation callback (Client Component pages)
   * or the Server Action (RSC page): both are serializable across the RSC boundary.
   */
  onOpenTrack: (trackId: string) => Promise<unknown>;
}

/** Client Component so it can bind per-card click handlers; the page decides how the mutation runs. */
export function TrackGrid({ tracks, pattern, onOpenTrack }: TrackGridProps) {
  return tracks.map((track, index) => (
    <TrackCard
      key={track.id}
      track={track}
      href={trackHref(pattern, track.id)}
      onOpen={() => onOpenTrack(track.id)}
      eager={index < ABOVE_THE_FOLD}
    />
  ));
}
```

A Server Component cannot pass a closure to a Client Component; only serializable props and Server Actions cross the boundary. So the grid is a Client Component that builds the per-card closures itself, and the page passes it either the `useMutation` callback or the Server Action.

```tsx
// src/components/track-card.tsx
"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, ViewTransition, useTransition } from "react";
import type { TrackCard_TrackFragment } from "@/__generated__/graphql";
import { humanReadableTimeFromSeconds } from "@/lib/helpers";
import { NAV_FORWARD } from "@/lib/navigation-types";
import { FavoriteButton } from "./favorite-button";
import styles from "./track-card.module.css";

interface TrackCardProps {
  track: TrackCard_TrackFragment;
  href: Route;
  /** Increments the view count; the caller decides whether that is useMutation or a Server Action. */
  onOpen: () => Promise<unknown>;
  /** Load the thumbnail eagerly (above-the-fold cards). */
  eager?: boolean;
}

const logOpenFailure = (error: unknown) =>
  console.error("Could not increment the track's view count", error);

/** Upper bound on how long navigation waits for the increment; the request itself keeps running. */
const INCREMENT_WAIT_MS = 2000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Card for the track grid. Client Component only because of the click handler.
 *
 * The increment is awaited (bounded by INCREMENT_WAIT_MS) before navigating so the detail
 * page does not render a count that is stale by one. Modifier clicks (new tab) keep the
 * browser's default navigation and fire the mutation without waiting for it.
 * The favorite button sits next to the link, not inside it: a button inside an anchor is
 * invalid HTML and two click targets would fight.
 *
 * View transitions: the cover is a named <ViewTransition>, and TrackDetail names its cover
 * the same way, so when the detail page renders in the navigation's commit the browser morphs
 * one into the other. The push carries a transition type so the pages slide the right way.
 */
export function TrackCard({ track, href, onOpen, eager = false }: TrackCardProps) {
  const { id, title, thumbnail, author, length, modulesCount } = track;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isPending) {
      // One increment per open: ignore clicks while the previous one is in flight.
      event.preventDefault();
      return;
    }
    const opensElsewhere =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    if (opensElsewhere) {
      void onOpen().catch(logOpenFailure);
      return;
    }
    event.preventDefault();
    startTransition(async () => {
      await Promise.race([onOpen().catch(logOpenFailure), sleep(INCREMENT_WAIT_MS)]);
      router.push(href, { transitionTypes: [NAV_FORWARD] });
    });
  };

  return (
    <article className={styles.card} aria-busy={isPending}>
      <Link href={href} className={styles.link} onClick={handleClick}>
        <div className={styles.content}>
          {/* The name must be unique on the page: the id makes it so, and the detail page reuses it. */}
          <ViewTransition name={`track-cover-${id}`} share="morph" default="none">
            <div className={styles.imageContainer}>
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={title}
                  fill
                  sizes="(min-width: 992px) 340px, (min-width: 768px) 50vw, 90vw"
                  className={styles.image}
                  loading={eager ? "eager" : "lazy"}
                />
              ) : null}
            </div>
          </ViewTransition>
          <div className={styles.body}>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.footer}>
              {author.photo ? (
                <Image
                  src={author.photo}
                  alt=""
                  width={30}
                  height={30}
                  className={styles.authorImage}
                />
              ) : null}
              <div className={styles.authorAndTrack}>
                <div className={styles.authorName}>{author.name}</div>
                <div className={styles.trackLength}>
                  {modulesCount ?? 0} modules - {humanReadableTimeFromSeconds(length ?? 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
      <FavoriteButton trackId={id} title={title} />
    </article>
  );
}
```

Three details to notice: the click is intercepted so the increment completes before `router.push`, otherwise the detail page can render a count that is stale by one; the wait is bounded because `HttpLink` has no timeout; and modifier clicks are left to the browser so open-in-new-tab keeps working. Styles are in `src/components/track-card.module.css`.

**Check:** `pnpm typecheck` passes. Nothing renders tracks yet.

## Step 7: Pattern 1: RSC `query()` and a Server Action

The page is an `async` Server Component. It awaits `query()`, and the HTML arrives complete. No Apollo code or data for this page is shipped to the browser, and the browser cache knows nothing about it.

```tsx
// src/app/rsc/(list)/page.tsx, first version. The finished file also reads searchParams;
// Step 13 adds that. The (list) folder is a route group, explained in
// Step 14.
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { incrementTrackViews } from "@/lib/actions/increment-track-views";
import { query } from "@/lib/apollo/rsc-client";

export default async function RscTracksPage() {
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });

  return (
    <PageContainer grid>
      <TrackGrid tracks={data.tracksForHome} pattern="rsc" onOpenTrack={incrementTrackViews} />
    </PageContainer>
  );
}
```

Passing `errorPolicy: "none"` is the default, but stating it narrows `data` from `TData | undefined` to `TData` in the types.

Because there is no browser cache to update, the mutation runs in a Server Action with the same RSC client. Every `"use server"` export is a public endpoint, so validate the input:

```ts
// src/lib/actions/increment-track-views.ts
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { getClient } from "@/lib/apollo/rsc-client";
import { trackTag } from "@/lib/cache-tags";

const TRACK_ID = /^[\w-]{1,64}$/;

/**
 * Server Action version of the mutation: the browser posts to Next.js, and the
 * GraphQL request is made server-side with the RSC client. Use this when the
 * page itself was rendered in RSC, because there is no browser cache to update.
 */
export async function incrementTrackViews(trackId: string) {
  // Every "use server" export is a public endpoint: validate before forwarding.
  if (typeof trackId !== "string" || !TRACK_ID.test(trackId)) {
    throw new Error("Invalid track id");
  }
  const { data } = await getClient().mutate({
    mutation: IncrementTrackViewsDocument,
    variables: { trackId },
  });
  return data?.incrementTrackViews ?? null;
}

/**
 * Same mutation, for the /revalidate pattern, followed by both on-demand invalidation APIs:
 * - updateTag expires the track's tagged fetch entry immediately, so the render triggered by
 *   this click reads the new count (read-your-own-writes).
 * - revalidatePath marks the segment-cached list page for regeneration on its next request.
 * revalidateTag(tag, "max") is the third option, used by /api/revalidate: serve the stale
 * entry once more while refreshing in the background.
 */
export async function incrementTrackViewsAndUpdateCache(trackId: string) {
  const result = await incrementTrackViews(trackId);
  updateTag(trackTag(trackId));
  revalidatePath("/revalidate");
  return result;
}
```

The detail page shows the payoff of one client per request. `generateMetadata` and the page both run `GetTrack`, and only one request leaves the server, because the second call is served from that client's cache.

```tsx
// src/app/rsc/track/[trackId]/page.tsx, first version. The finished file streams two sections and
// maps unknown ids to a 404; Step 14 shows it.
import type { Metadata } from "next";
import { GetTrackDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackDetail } from "@/components/track-detail";
import { query } from "@/lib/apollo/rsc-client";

type Props = PageProps<"/rsc/track/[trackId]">;

const getTrack = (trackId: string) =>
  query({ query: GetTrackDocument, variables: { trackId }, errorPolicy: "none" });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackId } = await params;
  const { data } = await getTrack(trackId);
  return { title: data.track.title };
}

export default async function RscTrackPage({ params }: Props) {
  const { trackId } = await params;
  const { data } = await getTrack(trackId);

  return (
    <PageContainer>
      <TrackDetail track={data.track} />
    </PageContainer>
  );
}
```

`params` is a Promise in Next 16; `PageProps<"/rsc/track/[trackId]">` is a global helper generated by `next typegen`.

One more file. Next.js's default for a `fetch` with no options is `auto no cache`: it fetches once during `next build` and prerenders the route with that data, unless the route reads a request-time API. Nothing here does, so the view counts would freeze at build time. A segment config in the folder's layout makes every route below it render per request:

```tsx
// src/app/rsc/layout.tsx
import type { ReactNode } from "react";

/**
 * This pattern fetches at request time. Without this segment config Next.js would fetch once
 * during `next build` and prerender the route with that data (the default `auto no cache`).
 */
export const dynamic = "force-dynamic";

export default function RscLayout({ children }: { children: ReactNode }) {
  return children;
}
```

**Check:**

```sh
pnpm dev
curl -s http://localhost:3000/rsc | grep -c "Cat-stronomy"   # at least 1: the data is in the HTML
```

Open http://localhost:3000/rsc with the Network tab filtered to the GraphQL host: no request. Click a card. The detail page shows the view count, and the count went up (the Server Action ran).

## Step 8: Pattern 2: `useSuspenseQuery` and streaming SSR

The Client Component version. Add the mutation hook the client patterns share. The mutation response selects `track { id numberOfViews }`, so `InMemoryCache` updates the `Track:<id>` entity and every component reading it re-renders. No `refetchQueries`, no manual `update`.

```ts
// src/lib/hooks/use-increment-track-views.ts
import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";

/**
 * Client-side version of the mutation. The response selects `track { id numberOfViews }`,
 * so InMemoryCache normalizes it into the existing `Track:<id>` entity and every
 * component reading that track re-renders. No refetch, no manual cache write.
 */
export function useIncrementTrackViews() {
  const [incrementTrackViews] = useMutation(IncrementTrackViewsDocument);
  return useCallback(
    (trackId: string) => incrementTrackViews({ variables: { trackId } }),
    [incrementTrackViews],
  );
}
```

A `loading.tsx` in the pattern's folder is the Suspense boundary. The shell streams first, the data follows. It lives in the pattern folder rather than at the root on purpose: a boundary above a page sends the 200 shell before the page runs, which makes a real 404 status impossible for the routes underneath (the not-found step shows both outcomes).

```tsx
// src/app/suspense/loading.tsx
import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";

/**
 * Suspense boundary for this pattern's routes: the shell streams first, the data follows.
 * There is deliberately no loading.tsx at the root. A boundary above a page means its shell
 * is sent (status 200) before the page runs, so a notFound() inside it can only render in
 * place; routes that must answer with a real 404 (see /revalidate) stay outside any boundary.
 */
export default function SuspenseLoading() {
  return (
    <PageContainer>
      <Loading />
    </PageContainer>
  );
}
```

This pattern needs the same `layout.tsx` with `dynamic = "force-dynamic"` as Step 7: its SSR request goes through the Client Component link, which has no Next.js options, so without the segment config the route would be prerendered at build with a stale transported cache. Copy `src/app/rsc/layout.tsx` to `src/app/suspense/layout.tsx` and rename the component.

```tsx
// src/app/suspense/page.tsx, first version. The finished file adds a client-side search;
// Step 13 shows it.
"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { useIncrementTrackViews } from "@/lib/hooks/use-increment-track-views";

export default function SuspenseTracksPage() {
  const { data } = useSuspenseQuery(GetTracksDocument);
  const incrementTrackViews = useIncrementTrackViews();

  return (
    <PageContainer grid>
      <TrackGrid tracks={data.tracksForHome} pattern="suspense" onOpenTrack={incrementTrackViews} />
    </PageContainer>
  );
}
```

Client pages get `params` as a Promise too. Unwrap it with React's `use()`:

```tsx
// src/app/suspense/track/[trackId]/page.tsx, first version. Later steps add a form, a favorite
// status, and a preview widget under TrackDetail.
"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { use } from "react";
import { GetTrackDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackDetail } from "@/components/track-detail";

export default function SuspenseTrackPage({ params }: PageProps<"/suspense/track/[trackId]">) {
  const { trackId } = use(params);
  const { data } = useSuspenseQuery(GetTrackDocument, { variables: { trackId } });

  return (
    <PageContainer>
      <TrackDetail track={data.track} />
    </PageContainer>
  );
}
```

**Check:** `curl -s http://localhost:3000/suspense | grep -c "Cat-stronomy"` finds the data: the request ran on the server during SSR. In the browser, the Network tab shows no GraphQL request after load: the transported result hydrated the cache. Click a card, then use the browser back button. The list renders instantly from the cache, and the card you clicked already carries the new view count on the detail page.

## Step 9: Pattern 3: `PreloadQuery`

Use this when the data belongs to a Client Component (it must stay live, or it drives interaction) but you want the request to start as early as possible: in the Server Component, before any client code runs, with no waterfall and no duplicate fetch.

Form one: start the query in RSC, read it with `useSuspenseQuery` using the same document and variables.

```tsx
// src/app/preload/page.tsx
import { Suspense } from "react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";
import { PreloadQuery } from "@/lib/apollo/rsc-client";
import { TracksClient } from "./tracks-client";

/**
 * Pattern 3a: PreloadQuery + useSuspenseQuery.
 * The Server Component starts the GraphQL request immediately. PreloadQuery streams the
 * result into the Client Component cache as a "simulated network request", so the
 * useSuspenseQuery in TracksClient waits for it instead of fetching again.
 * Data fetched this way is client data: never read it from a Server Component.
 */
export default function PreloadTracksPage() {
  return (
    <PageContainer grid>
      <PreloadQuery query={GetTracksDocument}>
        <Suspense fallback={<Loading />}>
          <TracksClient />
        </Suspense>
      </PreloadQuery>
    </PageContainer>
  );
}
```

```tsx
// src/app/preload/tracks-client.tsx
"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { TrackGrid } from "@/components/track-grid";
import { useIncrementTrackViews } from "@/lib/hooks/use-increment-track-views";

/** Same query and variables as the PreloadQuery above, so the preloaded result is picked up. */
export function TracksClient() {
  const { data } = useSuspenseQuery(GetTracksDocument);
  const incrementTrackViews = useIncrementTrackViews();

  return (
    <TrackGrid tracks={data.tracksForHome} pattern="preload" onOpenTrack={incrementTrackViews} />
  );
}
```

Form two: the render prop hands a `queryRef` to the child, which reads it with `useReadQuery` and gets `refetch` from `useQueryRefHandlers`. Call `useQueryRefHandlers` before `useReadQuery`.

```tsx
// src/app/preload/track/[trackId]/page.tsx
import { Suspense } from "react";
import { GetTrackDocument } from "@/__generated__/graphql";
import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";
import { PreloadQuery } from "@/lib/apollo/rsc-client";
import { TrackClient } from "./track-client";

/**
 * Pattern 3b: PreloadQuery render prop + useReadQuery.
 * Instead of repeating the query in the Client Component, the queryRef is passed down.
 * The child reads it with useReadQuery and gets refetch/fetchMore from useQueryRefHandlers.
 */
export default async function PreloadTrackPage({ params }: PageProps<"/preload/track/[trackId]">) {
  const { trackId } = await params;

  return (
    <PageContainer>
      <PreloadQuery query={GetTrackDocument} variables={{ trackId }}>
        {(queryRef) => (
          <Suspense fallback={<Loading />}>
            <TrackClient queryRef={queryRef} />
          </Suspense>
        )}
      </PreloadQuery>
    </PageContainer>
  );
}
```

```tsx
// src/app/preload/track/[trackId]/track-client.tsx
"use client";

import type { TransportedQueryRef } from "@apollo/client-integration-nextjs";
import { useQueryRefHandlers, useReadQuery } from "@apollo/client/react";
import { useTransition } from "react";
import type { GetTrackQuery, GetTrackQueryVariables } from "@/__generated__/graphql";
import { Button } from "@/components/button";
import { TrackDetail } from "@/components/track-detail";
import styles from "./track-client.module.css";

interface TrackClientProps {
  queryRef: TransportedQueryRef<GetTrackQuery, GetTrackQueryVariables>;
}

export function TrackClient({ queryRef }: TrackClientProps) {
  // Order matters: useQueryRefHandlers before useReadQuery.
  const { refetch } = useQueryRefHandlers(queryRef);
  const { data } = useReadQuery(queryRef);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <div className={styles.toolbar}>
        <Button disabled={isPending} onClick={() => startTransition(() => void refetch())}>
          {isPending ? "Refreshing..." : "Refresh view count"}
        </Button>
      </div>
      <TrackDetail track={data.track} />
    </>
  );
}
```

Data that arrives this way is client data. Never read it from a Server Component; the integration creates a separate client for `PreloadQuery` to make that hard to do by accident. Add the same `layout.tsx` segment config as the previous steps (`src/app/preload/layout.tsx`).

**Check:** open http://localhost:3000/preload/track/c_0. Note the view count. Increment it from outside the app:

```sh
curl -s -X POST https://odyssey-lift-off-server.herokuapp.com/ \
  -H 'content-type: application/json' \
  -d '{"query":"mutation { incrementTrackViews(id: \"c_0\") { success } }"}'
```

Click **Refresh view count**. The number goes up without a full reload. You will also see a console warning about a duplicate fragment name on these pages; it is a cosmetic upstream quirk, explained in [docs/patterns.md](docs/patterns.md#known-quirks).

## Step 10: Pattern 4: `useBackgroundQuery`

The client-only version of preloading: the parent starts the request without suspending and passes a `queryRef` to a child that suspends on it. Use it when a parent must render before its data-bound children, or to start several queries in parallel.

```tsx
// src/app/background/page.tsx
"use client";

import { type QueryRef, useBackgroundQuery, useReadQuery } from "@apollo/client/react";
import { Suspense } from "react";
import { type GetTracksQuery, GetTracksDocument } from "@/__generated__/graphql";
import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { useIncrementTrackViews } from "@/lib/hooks/use-increment-track-views";

/**
 * Pattern 4: useBackgroundQuery + useReadQuery, entirely in Client Components.
 * The parent kicks off the request without suspending, then the child suspends on the
 * queryRef. This avoids waterfalls when a parent needs to render before its data-bound
 * children. PreloadQuery is the RSC equivalent of this pattern.
 */
export default function BackgroundTracksPage() {
  const [queryRef] = useBackgroundQuery(GetTracksDocument);

  return (
    <PageContainer grid>
      <Suspense fallback={<Loading />}>
        <TracksReader queryRef={queryRef} />
      </Suspense>
    </PageContainer>
  );
}

function TracksReader({ queryRef }: { queryRef: QueryRef<GetTracksQuery> }) {
  const { data } = useReadQuery(queryRef);
  const incrementTrackViews = useIncrementTrackViews();

  return (
    <TrackGrid tracks={data.tracksForHome} pattern="background" onOpenTrack={incrementTrackViews} />
  );
}
```

```tsx
// src/app/background/track/[trackId]/page.tsx
"use client";

import { type QueryRef, useBackgroundQuery, useReadQuery } from "@apollo/client/react";
import { Suspense, use } from "react";
import { type GetTrackQuery, GetTrackDocument } from "@/__generated__/graphql";
import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";
import { TrackDetail } from "@/components/track-detail";

export default function BackgroundTrackPage({ params }: PageProps<"/background/track/[trackId]">) {
  const { trackId } = use(params);
  const [queryRef] = useBackgroundQuery(GetTrackDocument, { variables: { trackId } });

  return (
    <PageContainer>
      <Suspense fallback={<Loading />}>
        <TrackReader queryRef={queryRef} />
      </Suspense>
    </PageContainer>
  );
}

function TrackReader({ queryRef }: { queryRef: QueryRef<GetTrackQuery> }) {
  const { data } = useReadQuery(queryRef);
  return <TrackDetail track={data.track} />;
}
```

Add `src/app/background/layout.tsx` with the segment config, like Step 8.

**Check:** http://localhost:3000/background behaves like Step 8: data in the SSR HTML, no browser GraphQL request after load.

## Step 11: Pattern 5: `useQuery`, the course way

`useQuery` never suspends. The SSR pass renders the loading state, and the request only happens in the browser after hydration. It is still right for polling, lazy queries, and anything that must not block rendering. The course's `QueryResult` helper comes back with a render prop, so `data` is narrowed by the time your children run:

```tsx
// src/components/query-result.tsx
import type { ErrorLike } from "@apollo/client";
import type { ReactNode } from "react";
import { Loading } from "./loading";

interface QueryResultProps<TData> {
  loading: boolean;
  error?: ErrorLike;
  data: TData | undefined;
  /** Rendered once data is available, with `data` narrowed to a defined value. */
  children: (data: TData) => ReactNode;
}

/**
 * Renders the three states of a non-suspense hook (useQuery): loading, error, or children.
 * Suspense hooks do not need this; Suspense and error boundaries take over.
 */
export function QueryResult<TData>({ loading, error, data, children }: QueryResultProps<TData>) {
  if (error) {
    return <p>ERROR: {error.message}</p>;
  }
  if (loading) {
    return <Loading />;
  }
  if (data === undefined) {
    return <p>Nothing to show...</p>;
  }
  return <>{children(data)}</>;
}
```

```tsx
// src/app/legacy/page.tsx
"use client";

import { useQuery } from "@apollo/client/react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { QueryResult } from "@/components/query-result";
import { TrackGrid } from "@/components/track-grid";
import { useIncrementTrackViews } from "@/lib/hooks/use-increment-track-views";

/**
 * Pattern 5: useQuery, the way the Odyssey course teaches it.
 * useQuery never suspends, so the SSR pass renders the loading state and the request is
 * only made in the browser after hydration. Loading and error are handled by hand.
 * Still the right tool for polling, lazy queries, or when you must not block rendering.
 */
export default function LegacyTracksPage() {
  const { loading, error, data } = useQuery(GetTracksDocument);
  const incrementTrackViews = useIncrementTrackViews();

  return (
    <PageContainer grid>
      <QueryResult loading={loading} error={error} data={data}>
        {({ tracksForHome }) => (
          <TrackGrid tracks={tracksForHome} pattern="legacy" onOpenTrack={incrementTrackViews} />
        )}
      </QueryResult>
    </PageContainer>
  );
}
```

```tsx
// src/app/legacy/track/[trackId]/page.tsx
"use client";

import { useQuery } from "@apollo/client/react";
import { use } from "react";
import { GetTrackDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { QueryResult } from "@/components/query-result";
import { TrackDetail } from "@/components/track-detail";

export default function LegacyTrackPage({ params }: PageProps<"/legacy/track/[trackId]">) {
  const { trackId } = use(params);
  const { loading, error, data } = useQuery(GetTrackDocument, { variables: { trackId } });

  return (
    <PageContainer>
      <QueryResult loading={loading} error={error} data={data}>
        {({ track }) => <TrackDetail track={track} />}
      </QueryResult>
    </PageContainer>
  );
}
```

This pattern gets a layout too, with the opposite setting. Nothing fetches on the server, so the spinner shell is prerendered, and `force-static` keeps it that way even if a request-time API sneaks in later (it would return empty values rather than flip the route to dynamic):

```tsx
// src/app/legacy/layout.tsx
import type { ReactNode } from "react";

/**
 * The opposite of the other patterns: nothing here fetches on the server, so the spinner shell
 * is prerendered. `force-static` makes that explicit and keeps it true even if a request-time
 * API sneaks in later (it would return empty values instead of making the route dynamic).
 * Compare `dynamic = "error"` on the index page, which fails the build in that case.
 */
export const dynamic = "force-static";

export default function LegacyLayout({ children }: { children: ReactNode }) {
  return children;
}
```

**Check:** `curl -s http://localhost:3000/legacy | grep -c "Cat-stronomy"` prints `0`, and `curl -s http://localhost:3000/legacy | grep -c progressbar` prints `1`: the HTML has the spinner, not the data. In the browser, the Network tab shows a GraphQL request after hydration.

## Step 12: Pattern 6: RSC and the Next.js Data Cache

Everything so far renders on every request. This pattern uses the caching side of the classic model, and it uses each lever once so you can compare them.

**Segment-level: `revalidate`.** The list page exports `revalidate = 60`. The whole page is prerendered and regenerated at most once a minute (Incremental Static Regeneration). The fetch inside needs no options; it runs whenever the page regenerates.

```tsx
// src/app/revalidate/page.tsx
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { PageTransition } from "@/components/page-transition";
import { TrackGrid } from "@/components/track-grid";
import { incrementTrackViewsAndUpdateCache } from "@/lib/actions/increment-track-views";
import { query } from "@/lib/apollo/rsc-client";

/**
 * Segment-level caching: the whole page is prerendered and regenerated at most once a minute
 * (Incremental Static Regeneration). The fetch inside needs no options; it simply runs whenever
 * the page is regenerated. Invalidate it by path: the Server Action calls revalidatePath.
 */
export const revalidate = 60;

/**
 * Pattern 6: RSC + the Next.js Data Cache.
 * Same client and query as /rsc, but nothing here is fetched per request. This list page is
 * cached at the segment level (above); the detail page caches at the fetch level with tags.
 * A click runs a Server Action that invalidates both, so the next render is fresh.
 *
 * Static pages are prefetched whole, so a navigation between this list and a detail page
 * renders the destination in the same commit: the directional slide plays and the card's
 * cover morphs into the detail cover.
 */
export default async function CachedTracksPage() {
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });

  return (
    <PageTransition>
      <PageContainer grid>
        <TrackGrid
          tracks={data.tracksForHome}
          pattern="revalidate"
          onOpenTrack={incrementTrackViewsAndUpdateCache}
        />
      </PageContainer>
    </PageTransition>
  );
}
```

**Fetch-level: `next.revalidate` and `next.tags`.** On the server, `HttpLink` hands `fetchOptions` to Next's patched `fetch`, so Next-only options work per query through `context.fetchOptions`. The detail page caches each track's response under its own tag. It also exports `generateStaticParams`, which runs the list query once at build and prerenders a page per track, and `dynamicParams`, which decides what happens for ids that were not in that list.

```ts
// src/lib/cache-tags.ts
/** Next.js Data Cache tags used by the /revalidate pattern and its Server Action. */
export const TRACKS_TAG = "tracks";

export const trackTag = (trackId: string) => `track:${trackId}`;
```

```tsx
// src/app/revalidate/track/[trackId]/page.tsx
import type { Metadata } from "next";
import { GetTrackDocument, GetTracksDocument } from "@/__generated__/graphql";
import { BackLink } from "@/components/back-link";
import { PageContainer } from "@/components/page-container";
import { PageTransition } from "@/components/page-transition";
import { TrackDetail } from "@/components/track-detail";
import { rethrowAsNotFound } from "@/lib/apollo/not-found";
import { query } from "@/lib/apollo/rsc-client";
import { trackTag } from "@/lib/cache-tags";
import { tracksHref } from "@/lib/patterns";

type Props = PageProps<"/revalidate/track/[trackId]">;

/**
 * Prerender a page per track at build time. generateStaticParams runs the list query once
 * during `next build`; each returned param becomes a static page.
 */
export async function generateStaticParams() {
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });
  return data.tracksForHome.map(({ id }) => ({ trackId: id }));
}

/** Ids not returned above are rendered on first request and then cached (false would 404). */
export const dynamicParams = true;

/**
 * Fetch-level caching: this response lives in the Data Cache for a minute under its own tag,
 * so a Server Action (updateTag) or the /api/revalidate route handler (revalidateTag) can
 * expire exactly this track. Passed through Apollo's `context.fetchOptions` to Next's fetch.
 */
const getTrack = (trackId: string) =>
  query({
    query: GetTrackDocument,
    variables: { trackId },
    errorPolicy: "none",
    context: { fetchOptions: { next: { revalidate: 60, tags: [trackTag(trackId)] } } },
  }).catch(rethrowAsNotFound);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackId } = await params;
  const { data } = await getTrack(trackId);
  return { title: data.track.title };
}

export default async function CachedTrackPage({ params }: Props) {
  const { trackId } = await params;
  const { data } = await getTrack(trackId);

  return (
    <PageTransition>
      <PageContainer>
        <BackLink href={tracksHref("revalidate")}>All tracks</BackLink>
        <TrackDetail track={data.track} />
      </PageContainer>
    </PageTransition>
  );
}
```

**On demand, from inside the app.** Add the second Server Action to `src/lib/actions/increment-track-views.ts`. `updateTag` expires the track's fetch entry immediately, so the render caused by this click is fresh (read-your-own-writes). `revalidatePath` marks the segment-cached list page for regeneration on its next request.

```ts
// src/lib/actions/increment-track-views.ts
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { getClient } from "@/lib/apollo/rsc-client";
import { trackTag } from "@/lib/cache-tags";

const TRACK_ID = /^[\w-]{1,64}$/;

/**
 * Server Action version of the mutation: the browser posts to Next.js, and the
 * GraphQL request is made server-side with the RSC client. Use this when the
 * page itself was rendered in RSC, because there is no browser cache to update.
 */
export async function incrementTrackViews(trackId: string) {
  // Every "use server" export is a public endpoint: validate before forwarding.
  if (typeof trackId !== "string" || !TRACK_ID.test(trackId)) {
    throw new Error("Invalid track id");
  }
  const { data } = await getClient().mutate({
    mutation: IncrementTrackViewsDocument,
    variables: { trackId },
  });
  return data?.incrementTrackViews ?? null;
}

/**
 * Same mutation, for the /revalidate pattern, followed by both on-demand invalidation APIs:
 * - updateTag expires the track's tagged fetch entry immediately, so the render triggered by
 *   this click reads the new count (read-your-own-writes).
 * - revalidatePath marks the segment-cached list page for regeneration on its next request.
 * revalidateTag(tag, "max") is the third option, used by /api/revalidate: serve the stale
 * entry once more while refreshing in the background.
 */
export async function incrementTrackViewsAndUpdateCache(trackId: string) {
  const result = await incrementTrackViews(trackId);
  updateTag(trackTag(trackId));
  revalidatePath("/revalidate");
  return result;
}
```

**On demand, from outside the app.** A CMS or the GraphQL backend would call a webhook after data changes. This route handler is that webhook: `revalidateTag(tag, "max")` is stale-while-revalidate, so the next request still gets the cached entry while a fresh one is fetched in the background. Next 16 requires the profile argument. Set `REVALIDATE_SECRET` in `.env.local` to enable it.

```ts
// src/app/api/revalidate/route.ts
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

/** Only the tags this app creates: `track:<id>`. Anything else is rejected. */
const TAG = /^track:[\w-]{1,64}$/;

const isAuthorized = (given: string | null, expected: string) =>
  given !== null &&
  given.length === expected.length &&
  timingSafeEqual(Buffer.from(given), Buffer.from(expected));

/**
 * On-demand revalidation from outside the app, the way a CMS or the GraphQL backend would
 * call a webhook after data changes: POST /api/revalidate?tag=track:c_1&secret=...
 *
 * revalidateTag with the "max" profile is stale-while-revalidate: the next request for a
 * page using that tag still gets the cached entry while a fresh one is fetched in the
 * background. Compare updateTag in the Server Action, which expires the entry so the very
 * next render waits for fresh data. Next 16 requires the profile argument.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "REVALIDATE_SECRET is not configured" }, { status: 503 });
  }
  if (!isAuthorized(request.nextUrl.searchParams.get("secret"), secret)) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }
  const tag = request.nextUrl.searchParams.get("tag");
  if (tag === null || !TAG.test(tag)) {
    return NextResponse.json({ error: "Expected tag=track:<id>" }, { status: 400 });
  }

  revalidateTag(tag, "max");
  return NextResponse.json({ revalidated: tag });
}
```

Register the pattern in `src/lib/patterns.ts` (slug `revalidate`) and the header, index page, and tests pick it up.

No `layout.tsx` for this folder: nothing reads request-time data, so the segment config on the page and the fetch options decide everything. `fetchCache` is the one lever not used here. It changes the default `cache` option for every fetch in a segment; with one query per page it adds nothing over setting the option on the query.

**Check:** open http://localhost:3000/revalidate/track/c_0 twice, incrementing the count between the two loads with the `curl` from Step 9. The second load still shows the old count: it came from the Data Cache. Now go to `/revalidate` and click the card. The detail page shows the fresh count: the Server Action expired the tag. Then, with `REVALIDATE_SECRET=test` in `.env.local` and the server restarted, increment again and run:

```sh
curl -s -X POST "http://localhost:3000/api/revalidate?tag=track:c_0&secret=test"
```

Reload the detail page twice: the first load may still be stale, the second is fresh. `e2e/data-cache.spec.ts` and `e2e/revalidate-route.spec.ts` automate both flows.

## Step 13: URL state: search and pagination

The list has thirteen tracks and the API has no arguments, so filtering and paging happen in the app. Where the current query lives is the design decision, and both answers are on the branch.

**URL state, read on the server.** On `/rsc` the query string is the state. The Server Component reads `searchParams` (a Promise in Next 16), filters and slices the list, and renders. The search box only rewrites the URL; the page re-renders because the URL changed. The result is shareable, bookmarkable, and visible to the server, which is what makes it the default choice. The pure helpers first:

```ts
// src/lib/search.ts
export const PAGE_SIZE = 6;

type RawParam = string | string[] | undefined;

/** The URL is the state: read it on the server from `searchParams`, or in the browser from useSearchParams. */
export function parseSearch(params: { query?: RawParam; page?: RawParam }) {
  const first = (value: RawParam) => (Array.isArray(value) ? value[0] : value) ?? "";
  const query = first(params.query).trim();
  const page = Number.parseInt(first(params.page), 10);
  return { query, page: Number.isInteger(page) && page > 0 ? page : 1 };
}

interface Searchable {
  title: string;
  author: { name: string };
}

export function filterTracks<T extends Searchable>(tracks: readonly T[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return tracks;
  return tracks.filter(
    ({ title, author }) =>
      title.toLowerCase().includes(needle) || author.name.toLowerCase().includes(needle),
  );
}

export function paginate<T>(items: readonly T[], requestedPage: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, totalPages };
}

/** Builds `pathname?query=…&page=…`, omitting defaults so the canonical list URL stays clean. */
export function searchHref(pathname: string, { query, page }: { query: string; page: number }) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}
```

A debounce keeps a keystroke from becoming a server round trip; it fits in one hook:

```ts
// src/lib/hooks/use-debounced-callback.ts
import { useEffect, useMemo, useRef } from "react";

/**
 * Returns a stable function that runs `callback` only after `delayMs` of silence.
 * The latest callback is kept in a ref so the debounced function never goes stale, and the
 * pending timer is cleared on unmount so it cannot fire into a component that is gone.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) {
  const latest = useRef(callback);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  return useMemo(
    () =>
      (...args: Args) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => latest.current(...args), delayMs);
      },
    [delayMs],
  );
}
```

The search box uses `router.replace` so typing does not fill the history, resets the page so a shorter result set cannot land on an empty page, and reads its initial value from the URL. `useSearchParams` is request-time data, so the page renders it inside a Suspense boundary with a same-size fallback.

```tsx
// src/components/search-box.tsx
"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { searchHref } from "@/lib/search";
import styles from "./search-box.module.css";

/**
 * URL as state. Typing rewrites the query string (debounced), the Server Component page
 * reads it from `searchParams` and re-renders with the filtered list, and the URL stays
 * shareable and bookmarkable. `replace` keeps each keystroke out of the history stack;
 * resetting `page` avoids landing on an empty page of a shorter result set.
 *
 * useSearchParams is request-time data, so the page renders this inside a Suspense boundary.
 */
export function SearchBox({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const updateQuery = useDebouncedCallback((query: string) => {
    router.replace(searchHref(pathname, { query, page: 1 }) as Route);
  }, 300);

  return (
    <div className={styles.box}>
      <label htmlFor="track-search" className={styles.srOnly}>
        Search tracks
      </label>
      <input
        id="track-search"
        type="search"
        className={styles.input}
        placeholder={placeholder}
        defaultValue={searchParams.get("query") ?? ""}
        onChange={(event) => updateQuery(event.target.value)}
      />
    </div>
  );
}

/** Suspense fallback with the same footprint, so the grid does not jump. */
export function SearchBoxFallback({ placeholder }: { placeholder: string }) {
  return (
    <div className={styles.box}>
      <input type="search" className={styles.input} placeholder={placeholder} disabled />
    </div>
  );
}
```

Pagination is navigation, so it is plain links: they work before hydration and with JavaScript off.

```tsx
// src/components/pagination.tsx
import type { Route } from "next";
import Link from "next/link";
import { searchHref } from "@/lib/search";
import styles from "./pagination.module.css";

interface PaginationProps {
  pathname: string;
  page: number;
  totalPages: number;
  query: string;
}

/** Plain links: pagination is navigation, so it works before hydration and with JavaScript off. */
export function Pagination({ pathname, page, totalPages, query }: PaginationProps) {
  if (totalPages <= 1) return null;
  const href = (target: number) => searchHref(pathname, { query, page: target }) as Route;

  return (
    <nav aria-label="Pagination" className={styles.pagination}>
      {page > 1 ? (
        <Link href={href(page - 1)} className={styles.link}>
          Previous
        </Link>
      ) : (
        <span className={`${styles.link} ${styles.disabled}`}>Previous</span>
      )}
      <ul className={styles.pages}>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((target) => (
          <li key={target}>
            <Link
              href={href(target)}
              className={styles.link}
              aria-current={target === page ? "page" : undefined}
            >
              {target}
            </Link>
          </li>
        ))}
      </ul>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={styles.link}>
          Next
        </Link>
      ) : (
        <span className={`${styles.link} ${styles.disabled}`}>Next</span>
      )}
    </nav>
  );
}
```

```tsx
// src/app/rsc/(list)/page.tsx
import { Suspense } from "react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { PageTransition } from "@/components/page-transition";
import { Pagination } from "@/components/pagination";
import { SearchBox, SearchBoxFallback } from "@/components/search-box";
import { TrackGrid } from "@/components/track-grid";
import { incrementTrackViews } from "@/lib/actions/increment-track-views";
import { query } from "@/lib/apollo/rsc-client";
import { filterTracks, paginate, parseSearch } from "@/lib/search";

const PLACEHOLDER = "Search tracks by title or author";

/**
 * Pattern 1: React Server Component.
 * The GraphQL request happens on the server during render. The HTML arrives complete,
 * no Apollo code or data is shipped for this page, and the browser cache knows nothing about it.
 * The mutation therefore runs through a Server Action instead of useMutation.
 *
 * Search and pagination are URL state: the page reads `searchParams` (a Promise in Next 16),
 * filters and slices the list on the server, and the SearchBox and Pagination only change
 * the URL. The API has no arguments for this, so the filtering happens here.
 *
 * errorPolicy "none" is the default, but stating it narrows `data` to a defined value:
 * GraphQL errors reject the promise and land in error.tsx.
 */
export default async function RscTracksPage({ searchParams }: PageProps<"/rsc">) {
  const { query: search, page: requestedPage } = parseSearch(await searchParams);
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });
  const matches = filterTracks(data.tracksForHome, search);
  const { items, page, totalPages } = paginate(matches, requestedPage);

  return (
    <PageTransition>
      <PageContainer grid>
        <Suspense fallback={<SearchBoxFallback placeholder={PLACEHOLDER} />}>
          <SearchBox placeholder={PLACEHOLDER} />
        </Suspense>
        {items.length > 0 ? (
          <TrackGrid tracks={items} pattern="rsc" onOpenTrack={incrementTrackViews} />
        ) : (
          <p data-testid="no-results">No tracks match &ldquo;{search}&rdquo;.</p>
        )}
        <Pagination pathname="/rsc" page={page} totalPages={totalPages} query={search} />
      </PageContainer>
    </PageTransition>
  );
}
```

**Component state, filtered in the browser.** On `/suspense` the whole list is already in the browser cache, so a filter needs no navigation. `useDeferredValue` lets the input update on every keystroke while the filtered list re-renders at lower priority, and the stale results are dimmed until the new ones are ready. Instant, but invisible to the server and not shareable.

```tsx
// src/components/client-search.tsx
"use client";

import { type ReactNode, ViewTransition, useDeferredValue, useState } from "react";
import { filterTracks } from "@/lib/search";
import styles from "./search-box.module.css";

interface ClientSearchProps<T> {
  tracks: readonly T[];
  placeholder: string;
  children: (matches: readonly T[]) => ReactNode;
}

/**
 * Component state instead of URL state: the list is already in the browser, so filtering
 * needs no navigation. useDeferredValue lets the input update on every keystroke while the
 * (potentially expensive) filtered list re-renders at a lower priority; while the list still
 * shows results for the previous value it is marked stale and dimmed. Trade-off against
 * SearchBox: instant, but not shareable and invisible to the server.
 *
 * useDeferredValue is one of the three things that activate <ViewTransition> (with Transitions
 * and Suspense). The results are keyed by the deferred query: when it changes, React deletes
 * the old list and inserts the new one, pairs them by name, and the browser crossfades. That
 * is the same-route pattern from the Next.js guide; the cost is that the cards remount.
 */
export function ClientSearch<T extends { title: string; author: { name: string } }>({
  tracks,
  placeholder,
  children,
}: ClientSearchProps<T>) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const matches = filterTracks(tracks, deferredQuery);
  const isStale = query !== deferredQuery;

  return (
    <>
      <div className={styles.box}>
        <label htmlFor="client-track-search" className={styles.srOnly}>
          Filter tracks
        </label>
        <input
          id="client-track-search"
          type="search"
          className={styles.input}
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className={styles.results} data-stale={isStale}>
        <ViewTransition
          key={deferredQuery}
          name="track-results"
          share="auto"
          enter="auto"
          default="none"
        >
          {children(matches)}
        </ViewTransition>
      </div>
    </>
  );
}
```

```tsx
// src/app/suspense/page.tsx
"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { ClientSearch } from "@/components/client-search";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { useIncrementTrackViews } from "@/lib/hooks/use-increment-track-views";

/**
 * Pattern 2: Client Component with useSuspenseQuery.
 * Rendered twice: during streaming SSR (the request runs on the server and the result is
 * streamed into the HTML alongside the markup) and in the browser, where the transported
 * result hydrates the cache so no second request is made. The pattern's loading.tsx is
 * the Suspense boundary. Errors throw to error.tsx.
 *
 * The search here is component state with useDeferredValue, the counterpart of the
 * URL-state search on /rsc: the whole list is already in the browser cache.
 */
export default function SuspenseTracksPage() {
  const { data } = useSuspenseQuery(GetTracksDocument);
  const incrementTrackViews = useIncrementTrackViews();

  return (
    <PageContainer grid>
      <ClientSearch tracks={data.tracksForHome} placeholder="Filter tracks by title or author">
        {(matches) =>
          matches.length > 0 ? (
            <TrackGrid tracks={matches} pattern="suspense" onOpenTrack={incrementTrackViews} />
          ) : (
            <p data-testid="no-results">No tracks match.</p>
          )
        }
      </ClientSearch>
    </PageContainer>
  );
}
```

**Check:** on http://localhost:3000/rsc, page links show at the bottom and `/rsc?page=2` renders the second page. Type "kitty": after a pause the URL becomes `/rsc?query=kitty` and the Network tab shows the RSC request that re-rendered the page. On http://localhost:3000/suspense, typing filters immediately with no request and no URL change. `e2e/search.spec.ts` computes its expectations from the live catalog with the same filter.

## Step 14: Streaming sections, skeletons, route groups, and not found

Four App Router conventions, on the RSC detail page and its list.

**Sections that stream on their own.** The page awaits nothing but `params`. Each section is an async Server Component in its own `<Suspense>`, so the two queries start in parallel and each streams in behind a fallback shaped like the content, whichever finishes first. If one component needed both results, `await Promise.all([...])` is the way; two sequential `await`s in one component is the Server Component waterfall.

```tsx
// src/app/rsc/track/[trackId]/page.tsx
import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";
import { GetTrackDocument, GetTracksDocument } from "@/__generated__/graphql";
import { BackLink } from "@/components/back-link";
import { MoreTracks } from "@/components/more-tracks";
import { PageContainer } from "@/components/page-container";
import { PageTransition } from "@/components/page-transition";
import { QuickViewButton } from "@/components/quick-view-button";
import { RegisterViewForm } from "@/components/register-view-form";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { MoreTracksSkeleton, TrackDetailSkeleton } from "@/components/skeletons";
import { TrackDetail } from "@/components/track-detail";
import { rethrowAsNotFound } from "@/lib/apollo/not-found";
import { query } from "@/lib/apollo/rsc-client";
import { auth } from "@/lib/auth/auth";
import { trackHref, tracksHref } from "@/lib/patterns";

type Props = PageProps<"/rsc/track/[trackId]">;

/** Unknown ids become a 404 page instead of an error boundary. */
const getTrack = (trackId: string) =>
  query({ query: GetTrackDocument, variables: { trackId }, errorPolicy: "none" }).catch(
    rethrowAsNotFound,
  );

/**
 * generateMetadata and the page both run GetTrack. Because registerApolloClient shares
 * one client per request, the second call is served from that client's cache:
 * one network request, not two. Only RSC data can drive metadata like this.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackId } = await params;
  const { data } = await getTrack(trackId);
  return { title: data.track.title };
}

/**
 * The page itself awaits nothing but params. Each section is an async Server Component in
 * its own Suspense boundary, so the two queries start in parallel and each streams in
 * behind a skeleton shaped like the content, whichever finishes first.
 *
 * Each reveal is animated: the fallback's <ViewTransition> exits downwards and the content's
 * enters from below. They are two boundaries, not one around the Suspense, so React treats
 * the swap as exit plus enter rather than a crossfade of one snapshot. Because this page
 * suspends before its cover renders, the card-to-cover morph never pairs here; it does on
 * the prefetched /revalidate pages.
 */
export default async function RscTrackPage({ params }: Props) {
  const { trackId } = await params;

  return (
    <PageTransition>
      <PageContainer>
        <BackLink href={tracksHref("rsc")}>All tracks</BackLink>
        <Suspense
          fallback={
            <ViewTransition exit="slide-down" default="none">
              <TrackDetailSkeleton />
            </ViewTransition>
          }
        >
          <ViewTransition enter="slide-up" default="none">
            <TrackSection trackId={trackId} />
          </ViewTransition>
        </Suspense>
        <Suspense
          fallback={
            <ViewTransition exit="slide-down" default="none">
              <MoreTracksSkeleton />
            </ViewTransition>
          }
        >
          <ViewTransition enter="slide-up" default="none">
            <MoreTracksSection currentTrackId={trackId} />
          </ViewTransition>
        </Suspense>
      </PageContainer>
    </PageTransition>
  );
}

/**
 * The session is read next to the data, inside the boundary, so the request-time cookie read
 * never blocks the shell. Signed out, the form gives way to a sign-in link; the action would
 * refuse anyway, so this is a courtesy, not the check.
 */
async function TrackSection({ trackId }: { trackId: string }) {
  const [{ data }, session] = await Promise.all([getTrack(trackId), auth()]);
  return (
    <>
      <TrackDetail track={data.track} />
      <QuickViewButton trackId={trackId} />
      {session?.user ? (
        <RegisterViewForm trackId={trackId} numberOfViews={data.track.numberOfViews ?? 0} />
      ) : (
        <SignInPrompt callbackUrl={trackHref("rsc", trackId)} />
      )}
    </>
  );
}

async function MoreTracksSection({ currentTrackId }: { currentTrackId: string }) {
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });
  const others = data.tracksForHome.filter(({ id }) => id !== currentTrackId).slice(0, 4);
  return <MoreTracks tracks={others} href={(id) => trackHref("rsc", id)} />;
}
```

**Skeletons.** A fallback that has the content's dimensions keeps the layout from jumping when the real markup arrives. These are Server Components: no state, no handlers.

```tsx
// src/components/skeletons.tsx
import styles from "./skeletons.module.css";

/**
 * Suspense fallbacks shaped like the content they stand in for, so the layout does not jump
 * when the real markup streams in. Server Components: no state, no handlers.
 */
export function TrackCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.image} />
      <div className={styles.body}>
        <div className={`${styles.line} ${styles.title}`} />
        <div className={styles.footer}>
          <div className={styles.avatar} />
          <div>
            <div className={`${styles.line} ${styles.short}`} />
            <div className={`${styles.line} ${styles.shorter}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrackGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.grid} data-testid="track-grid-skeleton" role="status" aria-label="Loading tracks">
      {Array.from({ length: count }, (_, index) => (
        <TrackCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function TrackDetailSkeleton() {
  return (
    <div className={styles.detail} data-testid="track-detail-skeleton" role="status" aria-label="Loading track">
      <div className={styles.cover} />
      <div className={styles.panel}>
        <div className={`${styles.line} ${styles.heading}`} />
        <div className={styles.row}>
          <div className={`${styles.line} ${styles.short}`} />
          <div className={`${styles.line} ${styles.short}`} />
          <div className={`${styles.line} ${styles.short}`} />
        </div>
      </div>
    </div>
  );
}

export function MoreTracksSkeleton() {
  return (
    <div className={styles.more} data-testid="more-tracks-skeleton" role="status" aria-label="Loading more tracks">
      <div className={`${styles.line} ${styles.short}`} />
      <div className={styles.line} />
      <div className={styles.line} />
      <div className={styles.line} />
    </div>
  );
}
```

**A route group to scope `loading.tsx`.** The list page moved into `src/app/rsc/(list)/page.tsx`. Folders in parentheses never appear in the URL; the page is still `/rsc`. The point is that a `loading.tsx` inside the group wraps only the list, so the grid skeleton does not also wrap `/rsc/track/[trackId]`, which has its own boundaries.

```tsx
// src/app/rsc/(list)/loading.tsx
import { PageContainer } from "@/components/page-container";
import { TrackGridSkeleton } from "@/components/skeletons";

/**
 * A route group, `(list)`, scopes this loading.tsx to the list page only: without the group
 * it would sit at /rsc and also wrap /rsc/track/[trackId], where a grid skeleton is wrong.
 * Groups never appear in the URL; this page is still /rsc.
 */
export default function RscListLoading() {
  return (
    <PageContainer grid>
      <TrackGridSkeleton />
    </PageContainer>
  );
}
```

**Not found.** The Odyssey API is Apollo Server in front of a REST service, so an unknown id is an HTTP 200 carrying a GraphQL error whose `extensions.response.status` is 404. Map that to Next's `notFound()`:

```ts
// src/lib/apollo/not-found.ts
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { notFound } from "next/navigation";

/**
 * The Odyssey API is Apollo Server in front of a REST service. An unknown id is an HTTP 200
 * with a GraphQL error whose `extensions.response` carries the upstream 404, so it arrives
 * as CombinedGraphQLErrors, not ServerError. Check the extension, not the message text.
 */
export const isNotFoundError = (error: unknown) =>
  CombinedGraphQLErrors.is(error) &&
  error.errors.some((graphqlError) => {
    const response = graphqlError.extensions?.response;
    return typeof response === "object" && response !== null && "status" in response
      ? response.status === 404
      : false;
  });

/**
 * Translate the API's 404 into Next.js's 404 and rethrow everything else. `notFound()` throws,
 * so the nearest not-found.tsx renders in place of the segment. The status code is only a
 * real 404 if the throw happens before the shell is sent; inside a streamed Suspense boundary
 * the response is already a 200 and the not-found UI replaces the fallback in place.
 */
export function rethrowAsNotFound(error: unknown): never {
  if (isNotFoundError(error)) notFound();
  throw error;
}
```

```tsx
// src/app/not-found.tsx
import { NotFoundMessage } from "@/components/not-found-message";
import { PageContainer } from "@/components/page-container";

/** Rendered by notFound() anywhere below the root, and for URLs that match no route. */
export default function NotFound() {
  return (
    <PageContainer>
      <NotFoundMessage />
    </PageContainer>
  );
}
```

Server Component pages call it in the render path (the `.catch(rethrowAsNotFound)` above). Client Component patterns throw the same GraphQL error in the browser, and `error.tsx` renders the same `NotFoundMessage` when `isNotFoundError` is true.

There is a trade-off to say out loud. A Suspense boundary above a page means the 200 shell is sent before the page runs, so `notFound()` can only render in place: the user sees the 404 UI, the status code says 200. That is why this branch has no root `loading.tsx`: each pattern that streams has its own, and `/revalidate`, which awaits its query before rendering and sits outside any boundary, answers unknown ids with a genuine 404 status. Streaming and true status codes pull in opposite directions; pick per route.

**Check:** `curl -s -o /dev/null -w "%{http_code}" localhost:3000/revalidate/track/nope` prints `404`; the same for `/rsc/track/nope` prints `200` and the page shows the not-found message. Throttle the network on http://localhost:3000/rsc/track/c_0 and reload: two skeletons, then each section fills in. `e2e/not-found-and-streaming.spec.ts` proves the stream order from the raw HTML.

## Step 15: Forms: a Server Action and a client mutation

The card click showed both ways to run a mutation. Forms make the difference easier to see, and they need validation, so each detail page gets a form with a "views to register" field. Install Zod (`pnpm add zod`) and write the schema once:

```ts
// src/lib/schemas/register-view.ts
import { z } from "zod";

/**
 * One schema for both forms and both sides. The browser runs it before submitting so typos
 * never cost a round trip; the Server Action runs it again because the client can be bypassed.
 * FormData values are strings, hence `coerce` on the number; an empty field is treated as
 * missing rather than coerced to 0, so it gets the "enter a value" message.
 */
export const registerViewSchema = z.object({
  trackId: z.string().regex(/^[\w-]{1,64}$/, "Invalid track id"),
  views: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce
      .number({ error: "Enter how many views to register" })
      .int("Whole numbers only")
      .min(1, "Register at least 1 view")
      .max(5, "At most 5 views at a time"),
  ),
});

export type RegisterViewInput = z.infer<typeof registerViewSchema>;
export type RegisterViewFieldErrors = Partial<Record<keyof RegisterViewInput, string>>;

/** Parses FormData and reduces Zod's error tree to one message per field. */
export function parseRegisterView(formData: FormData) {
  const result = registerViewSchema.safeParse(Object.fromEntries(formData));
  if (result.success) {
    return { data: result.data, fieldErrors: undefined } as const;
  }
  const { fieldErrors } = z.flattenError(result.error);
  return {
    data: undefined,
    fieldErrors: { trackId: fieldErrors.trackId?.[0], views: fieldErrors.views?.[0] } as const,
  } as const;
}
```

The same function runs in the browser before a submit and on the server inside the action or, for the client form, next to the GraphQL server's own validation. `FormData` values are strings, which is what `z.coerce` is for.

**The Server Action form.** The action has the `(previousState, formData)` shape that `useActionState` expects, validates again, returns errors as state instead of throwing, and runs one mutation per view with the RSC client. The `revalidatePath` call is not optional: an action that revalidates nothing returns only its value and Next.js does not re-render the route. With it, the same response carries the re-rendered page, so `TrackDetail` shows the new count in one roundtrip. The session check and the `context` on the mutation come from Step 21; ignore them until then.

```ts
// src/lib/actions/register-view.ts
"use server";

import { revalidatePath } from "next/cache";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { getClient } from "@/lib/apollo/rsc-client";
import { auth } from "@/lib/auth/auth";
import { type RegisterViewFieldErrors, parseRegisterView } from "@/lib/schemas/register-view";

/** Returned to useActionState; must be serializable. */
export type RegisterViewState =
  | { status: "idle" }
  | { status: "invalid"; fieldErrors: RegisterViewFieldErrors }
  | { status: "failed"; message: string }
  | { status: "registered"; views: number; numberOfViews: number };

/**
 * Form action for the Server Action form, in the (previousState, formData) shape that
 * useActionState expects. The browser posts the form, Next.js calls this with the FormData,
 * and the mutation runs on the server with the RSC client.
 *
 * Validation and the session check run here even though the page validated and hid the form:
 * every "use server" export is a public endpoint. Errors are returned, not thrown, so the
 * form can show them.
 *
 * The session's token travels as per-operation context rather than through the link chain's
 * getToken: auth() reads cookies, and a link that read cookies on every operation would break
 * the cached and static routes that share the RSC client. The SetContextLink merges these
 * headers with its own.
 *
 * revalidatePath is what makes the page update: an action that revalidates nothing returns
 * only its value and Next.js does not re-render the route. With it, the action response
 * carries the re-rendered page, so TrackDetail shows the new count in the same roundtrip.
 */
export async function registerView(
  _previous: RegisterViewState,
  formData: FormData,
): Promise<RegisterViewState> {
  const { data, fieldErrors } = parseRegisterView(formData);
  if (fieldErrors) {
    return { status: "invalid", fieldErrors };
  }

  const session = await auth();
  if (!session?.user) {
    return { status: "failed", message: "Sign in to register views" };
  }

  const { trackId, views } = data;
  // One client for the whole action: outside a React render, every getClient() call is a new instance.
  const client = getClient();
  let numberOfViews = 0;
  try {
    for (let registered = 0; registered < views; registered += 1) {
      const result = await client.mutate({
        mutation: IncrementTrackViewsDocument,
        variables: { trackId },
        context: { headers: { authorization: `Bearer ${session.accessToken}` } },
      });
      numberOfViews = result.data?.incrementTrackViews.track?.numberOfViews ?? numberOfViews;
    }
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "The mutation failed",
    };
  }

  revalidatePath(`/rsc/track/${trackId}`);
  return { status: "registered", views, numberOfViews };
}
```

The form component is a Client Component because it holds state, but the mutation runs on the server. `onSubmit` validates with Zod and calls `preventDefault` on failure, so invalid input never dispatches the action. With JavaScript disabled the browser submits natively and only the server-side validation runs; the form still works.

It also shows `useOptimistic`, React's counterpart to Apollo's `optimisticResponse` for Server Actions. The hook takes the server-rendered count as its base value and a reducer; calling `addViews` inside the form action shows the expected count immediately, and React discards the optimistic value when the action settles. What replaces it is whatever the re-rendered page passes in: the new count on success, the old one if the action failed. Two rules: the update must happen inside a transition or action, which a form action is, and the base value must come from the server, or there is nothing to fall back to.

The rollback is the part worth understanding. A failed action registers nothing and revalidates nothing, so the page does not re-render and the prop is unchanged; React discards the optimistic value by itself and the count is honest again, with no cleanup code. That is the difference from Apollo's `optimisticResponse`, where the client has to undo a cache write. `e2e/forms.spec.ts` proves it against the real server by signing in, clearing the session cookie, and submitting: the action refuses, the count snaps back, and the refusal shows.

```tsx
// src/components/register-view-form.tsx
"use client";

import { type FormEvent, useActionState, useOptimistic, useState } from "react";
import { type RegisterViewState, registerView } from "@/lib/actions/register-view";
import { type RegisterViewFieldErrors, parseRegisterView } from "@/lib/schemas/register-view";
import { Button } from "./button";
import { ContentSection } from "./content-section";
import styles from "./register-view-form.module.css";

const IDLE: RegisterViewState = { status: "idle" };

interface RegisterViewFormProps {
  trackId: string;
  /** The server-rendered count; the base value for the optimistic one. */
  numberOfViews: number;
}

/**
 * The Server Action form. The component is a Client Component because it holds state
 * (useActionState), but the mutation runs on the server: the form action posts to Next.js,
 * which calls registerView. It still works with JavaScript disabled; the browser then
 * submits the form natively and only the server-side validation runs.
 *
 * Client-side validation happens in onSubmit with the same Zod schema. When it fails,
 * preventDefault stops the action from being dispatched, so no round trip is made.
 *
 * useOptimistic is React's counterpart to Apollo's optimisticResponse for Server Actions:
 * addViews shows the expected count while the action is pending, and React discards the
 * optimistic value when the action settles, replacing it with whatever the re-rendered page
 * passes in as numberOfViews (the new count on success, the old one on failure).
 */
export function RegisterViewForm({ trackId, numberOfViews }: RegisterViewFormProps) {
  const [state, formAction, pending] = useActionState(registerView, IDLE);
  const [optimisticViews, addViews] = useOptimistic(
    numberOfViews,
    (current, added: number) => current + added,
  );
  const [clientErrors, setClientErrors] = useState<RegisterViewFieldErrors>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const { fieldErrors } = parseRegisterView(new FormData(event.currentTarget));
    setClientErrors(fieldErrors ?? {});
    if (fieldErrors) {
      event.preventDefault();
    }
  };

  // The form action runs inside a transition, which is where useOptimistic updates must happen.
  const submit = (formData: FormData) => {
    const { data } = parseRegisterView(formData);
    if (data) {
      addViews(data.views);
    }
    formAction(formData);
  };

  const fieldErrors = state.status === "invalid" ? state.fieldErrors : clientErrors;

  return (
    <ContentSection>
      <form action={submit} onSubmit={handleSubmit} noValidate className={styles.form}>
        <input type="hidden" name="trackId" value={trackId} />
        <p className={styles.label}>
          Server Action form: validated in the browser, validated again and run on the server,
          then Next.js re-renders this page with the new count. The count below is optimistic
          while the action runs.
        </p>
        <p className={styles.count} data-testid="optimistic-views">
          Server count: {`${optimisticViews} view(s)`}
          {pending ? " (pending)" : ""}
        </p>
        <label className={styles.field}>
          Views to register
          <input
            name="views"
            type="number"
            min={1}
            max={5}
            defaultValue={1}
            aria-invalid={fieldErrors.views ? true : undefined}
            aria-describedby={fieldErrors.views ? "server-form-views-error" : undefined}
          />
        </label>
        {fieldErrors.views ? (
          <p id="server-form-views-error" role="alert" className={styles.error}>
            {fieldErrors.views}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Registering..." : "Register views"}
        </Button>
        {state.status === "registered" ? (
          <p className={styles.count}>
            Registered {state.views} view(s). The server now counts {state.numberOfViews}.
          </p>
        ) : null}
        {state.status === "failed" ? (
          <p role="alert" className={styles.error}>
            {state.message}
          </p>
        ) : null}
      </form>
    </ContentSection>
  );
}
```

Render it under `TrackDetail` in `src/app/rsc/track/[trackId]/page.tsx`, passing `numberOfViews` from the query result.

**The all-client form.** This one runs the same mutation from the browser with `useMutation`, once per view, in parallel. Three Apollo features do the work: `useFragment` subscribes to the `Track` entity in the normalized cache, so the count in the form is the same object `TrackDetail` renders; `optimisticResponse` writes the expected result before the server answers, then the real response replaces it, or a failure rolls it back; and the error branch shows the typed errors Apollo Client 4 returns (`CombinedGraphQLErrors` when the GraphQL server rejects the input, `ServerError` for HTTP failures). The fragment is colocated like the others:

```graphql
# src/components/register-view-client-form.graphql
# What the client form reads live from the normalized cache: the entity the mutation updates.
fragment RegisterViewClientForm_track on Track {
  id
  numberOfViews
}
```

```tsx
// src/components/register-view-client-form.tsx
"use client";

import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useFragment, useMutation } from "@apollo/client/react";
import { type FormEvent, useState } from "react";
import {
  IncrementTrackViewsDocument,
  RegisterViewClientForm_TrackFragmentDoc,
} from "@/__generated__/graphql";
import { type RegisterViewFieldErrors, parseRegisterView } from "@/lib/schemas/register-view";
import { Button } from "./button";
import { ContentSection } from "./content-section";
import styles from "./register-view-form.module.css";

/**
 * A form that is entirely a Client Component, wired to Apollo:
 * - the same Zod schema validates in the browser; the GraphQL server validates again and
 *   its errors come back typed (CombinedGraphQLErrors for resolver errors, ServerError
 *   for HTTP failures), all satisfying ErrorLike.
 * - useFragment subscribes to the Track entity in the normalized cache, so the count shown
 *   here is the same object TrackDetail renders and updates the instant the cache changes.
 * - useMutation runs the mutation from the browser. optimisticResponse writes the expected
 *   result into the cache before the server answers; the real response then replaces it,
 *   or a failure rolls it back.
 */
export function RegisterViewClientForm({ trackId }: { trackId: string }) {
  const { data: track, complete } = useFragment({
    fragment: RegisterViewClientForm_TrackFragmentDoc,
    from: { __typename: "Track", id: trackId },
  });
  const [registerView, { loading, error, reset }] = useMutation(IncrementTrackViewsDocument);
  const [fieldErrors, setFieldErrors] = useState<RegisterViewFieldErrors>({});
  const numberOfViews = complete ? (track.numberOfViews ?? 0) : 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { data, fieldErrors: errors } = parseRegisterView(new FormData(event.currentTarget));
    setFieldErrors(errors ?? {});
    if (!data) return;

    // One mutation per view, in parallel. Each optimistic write bumps the count by one more;
    // the server responses then settle on the real total. Rejections surface through `error`.
    void Promise.all(
      Array.from({ length: data.views }, (_, index) =>
        registerView({
          variables: { trackId },
          optimisticResponse: {
            incrementTrackViews: {
              __typename: "IncrementTrackViewsResponse",
              code: 200,
              success: true,
              message: "optimistic",
              track: { __typename: "Track", id: trackId, numberOfViews: numberOfViews + index + 1 },
            },
          },
        }),
      ),
    ).catch(() => undefined);
  };

  return (
    <ContentSection>
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <input type="hidden" name="trackId" value={trackId} />
        <p className={styles.label}>
          Client form: validated in the browser with the same schema, then useMutation runs
          the mutation here and the normalized cache updates every reader of this track,
          optimistically first.
        </p>
        <p className={styles.count} data-testid="cache-views">
          Cache says: {`${numberOfViews} view(s)`}
        </p>
        <label className={styles.field}>
          Views to register
          <input
            name="views"
            type="number"
            min={1}
            max={5}
            defaultValue={1}
            aria-invalid={fieldErrors.views ? true : undefined}
            aria-describedby={fieldErrors.views ? "client-form-views-error" : undefined}
          />
        </label>
        {fieldErrors.views ? (
          <p id="client-form-views-error" role="alert" className={styles.error}>
            {fieldErrors.views}
          </p>
        ) : null}
        <Button type="submit" disabled={loading} aria-busy={loading}>
          {loading ? "Registering..." : "Register views"}
        </Button>
        {error ? (
          <p role="alert" className={styles.error}>
            {CombinedGraphQLErrors.is(error)
              ? `The API rejected it: ${error.errors.map((graphqlError) => graphqlError.message).join(", ")}`
              : error.message}{" "}
            <button type="button" onClick={reset} className={styles.dismiss}>
              Dismiss
            </button>
          </p>
        ) : null}
      </form>
    </ContentSection>
  );
}
```

Run `pnpm generate`, then render it under `TrackDetail` in `src/app/suspense/track/[trackId]/page.tsx`.

**Check:** on http://localhost:3000/rsc/track/c_0, enter `9` and submit: the message appears and the Network tab shows no request. Enter `2` with the network throttled: the form's "Server count" jumps by two at once and says "(pending)", then one POST to the page with a `next-action` header and no GraphQL request from the browser, and the count in the details box goes up by two when the page re-renders. On http://localhost:3000/suspense/track/c_0, enter `2`: two GraphQL POSTs from the browser, and both counts (details box and "Cache says") move at once, before the responses arrive. Stop the API with DevTools offline mode and submit again: the count reverts and the error shows. `e2e/forms.spec.ts` covers both forms; the unit tests cover the schema, the Server Action (with `server-only` and the client mocked), and the optimistic update and rollback with `MockedProvider`.

## Step 16: Transitions: keep the old UI while the new one loads

A transition tells React that a state update may take a while and that the current UI should stay on screen until the new one is ready. Three places on this branch already use `useTransition` without much ceremony: the card click awaits the mutation before navigating, the preload page's **Refresh view count** wraps `refetch()`, and `error.tsx` wraps `retry()`. The two components below make the effect visible.

**A suspense query whose variables change.** This is the case transitions exist for in Apollo. Changing the select gives `useSuspenseQuery` new variables, so the component suspends again. Without `startTransition`, the nearest Suspense fallback replaces the preview until the data arrives. Inside `startTransition`, React keeps the previous preview on screen and only swaps when the new one is ready, and `isPending` lets you dim it. The checkbox switches between the two so you can watch the difference.

```tsx
// src/components/track-preview.tsx
"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { Suspense, useState, useTransition } from "react";
import { GetTrackDocument, GetTracksDocument } from "@/__generated__/graphql";
import { humanReadableTimeFromSeconds } from "@/lib/helpers";
import { ContentSection } from "./content-section";
import styles from "./track-preview.module.css";

/**
 * The case transitions exist for: a Suspense query whose variables change.
 *
 * Without startTransition, setPreviewId makes <Preview> suspend and React shows the Suspense
 * fallback: the old preview disappears until the new data arrives. Inside startTransition,
 * React keeps the old preview on screen and only swaps when the new one is ready, and
 * isPending lets you dim it in the meantime. The checkbox toggles between the two so you
 * can watch the difference; leave it on in real code.
 */
export function TrackPreview({ currentTrackId }: { currentTrackId: string }) {
  const { data } = useSuspenseQuery(GetTracksDocument);
  const others = data.tracksForHome.filter(({ id }) => id !== currentTrackId);
  const [previewId, setPreviewId] = useState(others[0]?.id ?? currentTrackId);
  const [useTransitionForChange, setUseTransitionForChange] = useState(true);
  const [isPending, startTransition] = useTransition();

  const changePreview = (id: string) => {
    if (useTransitionForChange) {
      startTransition(() => setPreviewId(id));
    } else {
      setPreviewId(id);
    }
  };

  return (
    <ContentSection>
      <section className={styles.panel} aria-labelledby="track-preview-heading">
        <h4 id="track-preview-heading">Preview another track</h4>
        <p className={styles.label}>
          Changing the select re-runs useSuspenseQuery with new variables. With the transition
          on, the previous preview stays (dimmed) until the new one is ready; off, the Suspense
          fallback replaces it.
        </p>
        <div className={styles.controls}>
          <label className={styles.field}>
            Track
            <select value={previewId} onChange={(event) => changePreview(event.target.value)}>
              {others.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.title}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={useTransitionForChange}
              onChange={(event) => setUseTransitionForChange(event.target.checked)}
            />
            Wrap the change in startTransition
          </label>
        </div>
        <div className={styles.preview} data-pending={isPending} aria-busy={isPending}>
          <Suspense fallback={<p className={styles.fallback}>Loading preview...</p>}>
            <Preview trackId={previewId} />
          </Suspense>
        </div>
      </section>
    </ContentSection>
  );
}

function Preview({ trackId }: { trackId: string }) {
  const { data } = useSuspenseQuery(GetTrackDocument, { variables: { trackId } });
  const { title, author, modulesCount, length, numberOfViews } = data.track;
  return (
    <p data-testid="track-preview">
      <strong>{title}</strong> by {author.name}: {modulesCount ?? 0} modules,{" "}
      {humanReadableTimeFromSeconds(length ?? 0)}, {numberOfViews ?? 0} view(s)
    </p>
  );
}
```

Render it under the client form in `src/app/suspense/track/[trackId]/page.tsx`.

**A Server Action from a button.** React 19 transitions accept an async function, and `isPending` stays true until everything inside has settled. That fits a Server Action called outside a form: await it, then `router.refresh()` to re-fetch the route's RSC payload in the same transition. The page updates in place, with no form and no fallback.

```tsx
// src/components/quick-view-button.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { incrementTrackViews } from "@/lib/actions/increment-track-views";
import { Button } from "./button";
import { ContentSection } from "./content-section";
import styles from "./register-view-form.module.css";

/**
 * A Server Action called from a button instead of a form. React 19 transitions accept an
 * async function: isPending stays true from the click until everything inside has settled.
 * The action itself revalidates nothing, so router.refresh() re-fetches the RSC payload for
 * this route inside the same transition, and the page updates without a fallback.
 */
export function QuickViewButton({ trackId }: { trackId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const registerOne = () =>
    startTransition(async () => {
      await incrementTrackViews(trackId);
      router.refresh();
    });

  return (
    <ContentSection>
      <div className={styles.form}>
        <p className={styles.label}>
          Server Action from a button: useTransition wraps the call and the router refresh, so
          the count in the details box updates in place, without a form or a fallback.
        </p>
        <Button onClick={registerOne} disabled={isPending} aria-busy={isPending}>
          {isPending ? "Registering..." : "Quick +1 view"}
        </Button>
      </div>
    </ContentSection>
  );
}
```

Render it under `TrackDetail` in `src/app/rsc/track/[trackId]/page.tsx`.

**Check:** on http://localhost:3000/suspense/track/c_0, throttle the network in DevTools, then change the preview select. The old preview dims and stays until the new one lands. Untick the checkbox and change it again: the "Loading preview..." fallback flashes instead. On http://localhost:3000/rsc/track/c_0, click **Quick +1 view**: the button shows its pending label, the Network tab shows the `next-action` POST followed by the RSC refresh, and the count in the details box changes. `e2e/transitions.spec.ts` proves both, slowing GraphQL down with `page.route` so the pending state is observable.

## Step 17: View transitions: continuity between pages

A route change replaces the whole page at once. Nothing on screen says that the thumbnail you clicked and the cover you are now looking at are the same image. React's `<ViewTransition>` drives the browser's View Transitions API declaratively: you name what should persist, or describe how a subtree enters and exits, and React calls `document.startViewTransition` itself. Only Transitions, Suspense, and `useDeferredValue` activate it; App Router navigations are transitions, so most of this works from navigation alone.

Two facts about the API before the code. Inside Next.js, `ViewTransition` is a plain export of `react`, because the App Router bundles React's canary channel: no flag, nothing to install. The npm `react` package and `@types/react` still keep it behind the canary entry, so one file references those types and the test setup gives Vitest a pass-through version. Without browser support nothing breaks: the app works and the animations do not play.

```ts
// src/types/react-canary.d.ts
/**
 * Next.js bundles React's canary channel, where <ViewTransition> and addTransitionType are
 * plain exports of "react". The npm `react` package and `@types/react` still keep their types
 * behind the canary entry, so this reference (needed once, anywhere in the project) adds them.
 */
/// <reference types="react/canary" />
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";

// Next.js bundles React's canary channel, where <ViewTransition> is an export of "react". The
// npm package Vitest resolves (19.2) does not ship it, so components that animate in the app
// would render an undefined element type here. Every other export stays the real one.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<Record<string, unknown>>();
  if ("ViewTransition" in react) return react;
  return { ...react, ViewTransition: ({ children }: { children?: ReactNode }) => children };
});

afterEach(cleanup);
```

The Next.js guide has four patterns. Each lands where it fits this app.

**Shared element: the card cover morphs into the detail cover.** `TrackCard` and `TrackDetail` wrap their image in a `<ViewTransition>` with the same `name`, unique per track. When the destination page renders in the navigation's commit, React pairs the two and the browser animates size and position from one to the other. `share="morph"` names the class the CSS customizes; `default="none"` keeps the named image from crossfading on every unrelated transition. Keep the explicit `share` when you add `default="none"`, or the pair silently stops morphing.

```tsx
// src/components/track-card.tsx
"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, ViewTransition, useTransition } from "react";
import type { TrackCard_TrackFragment } from "@/__generated__/graphql";
import { humanReadableTimeFromSeconds } from "@/lib/helpers";
import { NAV_FORWARD } from "@/lib/navigation-types";
import { FavoriteButton } from "./favorite-button";
import styles from "./track-card.module.css";

interface TrackCardProps {
  track: TrackCard_TrackFragment;
  href: Route;
  /** Increments the view count; the caller decides whether that is useMutation or a Server Action. */
  onOpen: () => Promise<unknown>;
  /** Load the thumbnail eagerly (above-the-fold cards). */
  eager?: boolean;
}

const logOpenFailure = (error: unknown) =>
  console.error("Could not increment the track's view count", error);

/** Upper bound on how long navigation waits for the increment; the request itself keeps running. */
const INCREMENT_WAIT_MS = 2000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Card for the track grid. Client Component only because of the click handler.
 *
 * The increment is awaited (bounded by INCREMENT_WAIT_MS) before navigating so the detail
 * page does not render a count that is stale by one. Modifier clicks (new tab) keep the
 * browser's default navigation and fire the mutation without waiting for it.
 * The favorite button sits next to the link, not inside it: a button inside an anchor is
 * invalid HTML and two click targets would fight.
 *
 * View transitions: the cover is a named <ViewTransition>, and TrackDetail names its cover
 * the same way, so when the detail page renders in the navigation's commit the browser morphs
 * one into the other. The push carries a transition type so the pages slide the right way.
 */
export function TrackCard({ track, href, onOpen, eager = false }: TrackCardProps) {
  const { id, title, thumbnail, author, length, modulesCount } = track;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isPending) {
      // One increment per open: ignore clicks while the previous one is in flight.
      event.preventDefault();
      return;
    }
    const opensElsewhere =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    if (opensElsewhere) {
      void onOpen().catch(logOpenFailure);
      return;
    }
    event.preventDefault();
    startTransition(async () => {
      await Promise.race([onOpen().catch(logOpenFailure), sleep(INCREMENT_WAIT_MS)]);
      router.push(href, { transitionTypes: [NAV_FORWARD] });
    });
  };

  return (
    <article className={styles.card} aria-busy={isPending}>
      <Link href={href} className={styles.link} onClick={handleClick}>
        <div className={styles.content}>
          {/* The name must be unique on the page: the id makes it so, and the detail page reuses it. */}
          <ViewTransition name={`track-cover-${id}`} share="morph" default="none">
            <div className={styles.imageContainer}>
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={title}
                  fill
                  sizes="(min-width: 992px) 340px, (min-width: 768px) 50vw, 90vw"
                  className={styles.image}
                  loading={eager ? "eager" : "lazy"}
                />
              ) : null}
            </div>
          </ViewTransition>
          <div className={styles.body}>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.footer}>
              {author.photo ? (
                <Image
                  src={author.photo}
                  alt=""
                  width={30}
                  height={30}
                  className={styles.authorImage}
                />
              ) : null}
              <div className={styles.authorAndTrack}>
                <div className={styles.authorName}>{author.name}</div>
                <div className={styles.trackLength}>
                  {modulesCount ?? 0} modules - {humanReadableTimeFromSeconds(length ?? 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
      <FavoriteButton trackId={id} title={title} />
    </article>
  );
}
```

Where the pair forms is a caching question, which is why this step belongs in this tutorial. `/revalidate` pages are static and prefetched whole, so the detail renders in the same commit and the morph plays. `/rsc/track/[trackId]` suspends into its skeleton first, so no pair forms and the cover arrives with its section's enter animation. `/suspense` behaves the same way, for an Apollo reason: `GetTrack` selects fields the list query did not fetch, so `useSuspenseQuery` suspends. A cache that already held every field would render in the commit and morph.

**Suspense reveal: the skeleton leaves, the content arrives.** On the RSC detail page each fallback gets an exit class and each section an enter class. Two boundaries rather than one around the `<Suspense>` make the swap an exit plus an enter instead of a crossfade of one snapshot.

```tsx
// src/app/rsc/track/[trackId]/page.tsx
import type { Metadata } from "next";
import { Suspense, ViewTransition } from "react";
import { GetTrackDocument, GetTracksDocument } from "@/__generated__/graphql";
import { BackLink } from "@/components/back-link";
import { MoreTracks } from "@/components/more-tracks";
import { PageContainer } from "@/components/page-container";
import { PageTransition } from "@/components/page-transition";
import { QuickViewButton } from "@/components/quick-view-button";
import { RegisterViewForm } from "@/components/register-view-form";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { MoreTracksSkeleton, TrackDetailSkeleton } from "@/components/skeletons";
import { TrackDetail } from "@/components/track-detail";
import { rethrowAsNotFound } from "@/lib/apollo/not-found";
import { query } from "@/lib/apollo/rsc-client";
import { auth } from "@/lib/auth/auth";
import { trackHref, tracksHref } from "@/lib/patterns";

type Props = PageProps<"/rsc/track/[trackId]">;

/** Unknown ids become a 404 page instead of an error boundary. */
const getTrack = (trackId: string) =>
  query({ query: GetTrackDocument, variables: { trackId }, errorPolicy: "none" }).catch(
    rethrowAsNotFound,
  );

/**
 * generateMetadata and the page both run GetTrack. Because registerApolloClient shares
 * one client per request, the second call is served from that client's cache:
 * one network request, not two. Only RSC data can drive metadata like this.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackId } = await params;
  const { data } = await getTrack(trackId);
  return { title: data.track.title };
}

/**
 * The page itself awaits nothing but params. Each section is an async Server Component in
 * its own Suspense boundary, so the two queries start in parallel and each streams in
 * behind a skeleton shaped like the content, whichever finishes first.
 *
 * Each reveal is animated: the fallback's <ViewTransition> exits downwards and the content's
 * enters from below. They are two boundaries, not one around the Suspense, so React treats
 * the swap as exit plus enter rather than a crossfade of one snapshot. Because this page
 * suspends before its cover renders, the card-to-cover morph never pairs here; it does on
 * the prefetched /revalidate pages.
 */
export default async function RscTrackPage({ params }: Props) {
  const { trackId } = await params;

  return (
    <PageTransition>
      <PageContainer>
        <BackLink href={tracksHref("rsc")}>All tracks</BackLink>
        <Suspense
          fallback={
            <ViewTransition exit="slide-down" default="none">
              <TrackDetailSkeleton />
            </ViewTransition>
          }
        >
          <ViewTransition enter="slide-up" default="none">
            <TrackSection trackId={trackId} />
          </ViewTransition>
        </Suspense>
        <Suspense
          fallback={
            <ViewTransition exit="slide-down" default="none">
              <MoreTracksSkeleton />
            </ViewTransition>
          }
        >
          <ViewTransition enter="slide-up" default="none">
            <MoreTracksSection currentTrackId={trackId} />
          </ViewTransition>
        </Suspense>
      </PageContainer>
    </PageTransition>
  );
}

/**
 * The session is read next to the data, inside the boundary, so the request-time cookie read
 * never blocks the shell. Signed out, the form gives way to a sign-in link; the action would
 * refuse anyway, so this is a courtesy, not the check.
 */
async function TrackSection({ trackId }: { trackId: string }) {
  const [{ data }, session] = await Promise.all([getTrack(trackId), auth()]);
  return (
    <>
      <TrackDetail track={data.track} />
      <QuickViewButton trackId={trackId} />
      {session?.user ? (
        <RegisterViewForm trackId={trackId} numberOfViews={data.track.numberOfViews ?? 0} />
      ) : (
        <SignInPrompt callbackUrl={trackHref("rsc", trackId)} />
      )}
    </>
  );
}

async function MoreTracksSection({ currentTrackId }: { currentTrackId: string }) {
  const { data } = await query({ query: GetTracksDocument, errorPolicy: "none" });
  const others = data.tracksForHome.filter(({ id }) => id !== currentTrackId).slice(0, 4);
  return <MoreTracks tracks={others} href={(id) => trackHref("rsc", id)} />;
}
```

**Directional navigation: transition types.** A type tags a navigation with its meaning. The card attaches `nav-forward` in `router.push`, the back link attaches `nav-back` through `<Link transitionTypes>`, and a wrapper on each participating page maps the types to classes. Browser back and forward, `router.refresh()`, and Suspense reveals carry no type and fall through to `default: "none"`. The wrapper goes in the page, not the layout, because layouts persist across navigations, so enter and exit never fire there.

```ts
// src/lib/navigation-types.ts
/**
 * Transition types tag a navigation with its meaning, so a <ViewTransition> can pick the
 * animation: forward slides the new page in from the right, back from the left. Next.js passes
 * them to React's addTransitionType; `<Link transitionTypes>` and `router.push(href,
 * { transitionTypes })` are the two ways to attach them. Browser back and forward carry none.
 */
export const NAV_FORWARD = "nav-forward";
export const NAV_BACK = "nav-back";
```

```tsx
// src/components/page-transition.tsx
import { type ReactNode, ViewTransition } from "react";
import { NAV_BACK, NAV_FORWARD } from "@/lib/navigation-types";

/** Transition type to view transition class; anything untyped (browser back, refresh) does nothing. */
const BY_TYPE = { [NAV_FORWARD]: "nav-forward", [NAV_BACK]: "nav-back", default: "none" };

/**
 * Directional page animation. The old page slides out and the new one slides in, left for
 * forward and right for back, with the CSS in globals.css. Two placement rules from React:
 * wrap the page's root, not the layout (layouts persist across navigations, so enter and exit
 * never fire there), and put nothing between the <ViewTransition> and the top of the page,
 * because enter and exit only activate when no DOM node sits above the boundary.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={BY_TYPE} exit={BY_TYPE} default="none">
      {children}
    </ViewTransition>
  );
}
```

```tsx
// src/components/back-link.tsx
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { NAV_BACK } from "@/lib/navigation-types";
import styles from "./back-link.module.css";

/** Returns to a list. The transition type makes the pages slide the other way than a card click. */
export function BackLink({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link href={href} className={styles.link} transitionTypes={[NAV_BACK]}>
      {children}
    </Link>
  );
}
```

The header gets a `viewTransitionName` and CSS that pins it, so it stays put while the page slides. One fixed reference is what tells the eye that the content moved, not the viewport.

**Same place, different content: a keyed crossfade.** The client search on `/suspense` keys its results by the deferred query and names them. When the key changes, React deletes the old list and inserts the new one, pairs them by name, and the browser crossfades. `useDeferredValue` is what activates it; no navigation is involved. The cards remount on every change, which is the cost of keying. An `update` class on an unkeyed wrapper would crossfade one snapshot and keep the instances.

```tsx
// src/components/client-search.tsx
"use client";

import { type ReactNode, ViewTransition, useDeferredValue, useState } from "react";
import { filterTracks } from "@/lib/search";
import styles from "./search-box.module.css";

interface ClientSearchProps<T> {
  tracks: readonly T[];
  placeholder: string;
  children: (matches: readonly T[]) => ReactNode;
}

/**
 * Component state instead of URL state: the list is already in the browser, so filtering
 * needs no navigation. useDeferredValue lets the input update on every keystroke while the
 * (potentially expensive) filtered list re-renders at a lower priority; while the list still
 * shows results for the previous value it is marked stale and dimmed. Trade-off against
 * SearchBox: instant, but not shareable and invisible to the server.
 *
 * useDeferredValue is one of the three things that activate <ViewTransition> (with Transitions
 * and Suspense). The results are keyed by the deferred query: when it changes, React deletes
 * the old list and inserts the new one, pairs them by name, and the browser crossfades. That
 * is the same-route pattern from the Next.js guide; the cost is that the cards remount.
 */
export function ClientSearch<T extends { title: string; author: { name: string } }>({
  tracks,
  placeholder,
  children,
}: ClientSearchProps<T>) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const matches = filterTracks(tracks, deferredQuery);
  const isStale = query !== deferredQuery;

  return (
    <>
      <div className={styles.box}>
        <label htmlFor="client-track-search" className={styles.srOnly}>
          Filter tracks
        </label>
        <input
          id="client-track-search"
          type="search"
          className={styles.input}
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className={styles.results} data-stale={isStale}>
        <ViewTransition
          key={deferredQuery}
          name="track-results"
          share="auto"
          enter="auto"
          default="none"
        >
          {children(matches)}
        </ViewTransition>
      </div>
    </>
  );
}
```

All the motion is CSS, in the view-transitions section at the end of `src/app/globals.css`, keyed by the classes the components name. Old content leaves fast and new content arrives more gently, the `::view-transition` overlay lets clicks through, and `prefers-reduced-motion` zeroes every duration.

**Check:** on http://localhost:3000/revalidate click a card: the cover grows into the detail cover while the page slides left. Click **All tracks**: the page slides right and the cover shrinks back into its card. On http://localhost:3000/rsc click a card: the page slides, the skeletons drop away and the sections rise in, and the cover does not morph. On http://localhost:3000/suspense type in the filter box: the results crossfade. Press the browser's back button anywhere: no slide, the browser navigation carries no type. Enable **Emulate CSS media feature prefers-reduced-motion** in DevTools and everything snaps. `e2e/view-transitions.spec.ts` records every `document.startViewTransition` call with its types and, with the durations stretched by an injected stylesheet, catches the running animations by name: `vt-blur` proves the morph pair formed on `/revalidate`, `vt-slide-y` the reveal on `/rsc`.

## Step 18: Effects: useLayoutEffect, useEffect, useEffectEvent, and no effect at all

Effects are for synchronizing with something outside React. Most of the code you have written so far needed none, and that is the point of this step: know the cases that do, keep the reactive part of an effect apart from the part that only needs the latest values, and recognize the cases that do not need an effect at all.

The header's pattern navigation gets a bar that slides under the active link. Positioning it means reading the DOM (`offsetLeft`, `offsetWidth`), which React cannot know during render.

```tsx
// src/components/pattern-nav.tsx
"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { PATTERNS } from "@/lib/patterns";
import styles from "./pattern-nav.module.css";

/**
 * Switch data-fetching pattern while staying on the same page:
 * /rsc/track/c_0 -> /preload/track/c_0. Client Component because it reads the pathname.
 *
 * Under Cache Components the pathname is runtime data, so the header renders this inside a
 * Suspense boundary with PatternNavLinks (no active state) as the prerendered fallback.
 */
export function PatternNav() {
  return <PatternNavLinks pathname={usePathname()} />;
}

/** Where the sliding indicator sits, and which pathname it was measured for. */
interface Indicator {
  pathname: string;
  left: number;
  width: number;
}

export function PatternNavLinks({ pathname }: { pathname: string }) {
  const active = PATTERNS.find(
    ({ slug }) => pathname === `/${slug}` || pathname.startsWith(`/${slug}/`),
  );
  const rest = active ? pathname.slice(active.slug.length + 1) : "";

  const trackRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<Indicator | null>(null);

  const measure = useCallback(() => {
    const link = trackRef.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
    setIndicator(link ? { pathname, left: link.offsetLeft, width: link.offsetWidth } : null);
  }, [pathname]);

  // useLayoutEffect: read the DOM and set state before the browser paints. The indicator is
  // hidden until it has been measured for the current pathname, so with useEffect instead,
  // every navigation would paint one frame without it (or at the old position) and blink.
  useLayoutEffect(measure, [measure]);

  // useEffectEvent: the latest `measure` without making the subscription below depend on it.
  // `measure` changes with the pathname, but a viewport resize has nothing to do with
  // navigation. Listing `measure` as a dependency would remove and re-add the listeners on
  // every navigation; listing nothing would leave the handler measuring the first pathname
  // forever. An Effect Event always sees the latest props and state, never causes the
  // effect to re-run, and may only be called from inside an effect.
  const remeasure = useEffectEvent(measure);

  // useEffect: subscribe to things outside React and clean up. The viewport can resize, and
  // the web font can finish loading after the first measurement, which changes the link's
  // width. Nothing here has to happen before paint, so the cheaper effect is the right one,
  // and with no reactive values inside it, it subscribes once for the component's lifetime.
  useEffect(() => {
    // Test DOMs (happy-dom) have no Font Loading API; browsers do.
    const fonts = "fonts" in document ? document.fonts : undefined;
    window.addEventListener("resize", remeasure);
    fonts?.addEventListener("loadingdone", remeasure);
    return () => {
      window.removeEventListener("resize", remeasure);
      fonts?.removeEventListener("loadingdone", remeasure);
    };
  }, []);

  const measured = indicator?.pathname === pathname;

  return (
    <nav aria-label="Data-fetching pattern">
      <div ref={trackRef} className={styles.track}>
        <ul className={styles.list}>
          {PATTERNS.map((pattern) => (
            <li key={pattern.slug}>
              <Link
                href={`/${pattern.slug}${rest}` as Route}
                className={styles.link}
                aria-current={pattern === active ? "page" : undefined}
              >
                {pattern.title}
              </Link>
            </li>
          ))}
        </ul>
        <span
          aria-hidden="true"
          data-testid="pattern-indicator"
          data-measured={measured}
          className={styles.indicator}
          style={
            indicator
              ? { transform: `translateX(${indicator.left}px)`, width: indicator.width }
              : undefined
          }
        />
      </div>
    </nav>
  );
}
```

**`useLayoutEffect`: read layout, set state, and never paint in between.** It runs after React commits the DOM but before the browser paints. The indicator is hidden until it has been measured for the current pathname, so measuring in a layout effect means the user never sees the unmeasured frame. Change it to `useEffect` and every navigation paints one frame with the bar hidden or at its old position, then a second frame with it moved: a blink. That is the whole rule: `useLayoutEffect` only when a DOM measurement has to change what is painted, because it blocks painting.

**`useEffect`: subscribe to an external system, and clean up.** The resize listener re-measures when the viewport changes. Nothing about it has to happen before paint, so the non-blocking effect is correct, and the returned function removes the listener when the component unmounts. Other legitimate uses: analytics pings, connecting to a socket, syncing with a third-party widget. Neither effect runs on the server; React 19 no longer warns about `useLayoutEffect` during SSR, it simply does nothing there, which is why the server HTML carries `data-measured="false"` and the indicator appears on hydration.

**`useEffectEvent`: the latest values inside an effect, without re-running it.** The listeners need `measure`, and `measure` changes with the pathname. Put it in the dependency array and every navigation removes and re-adds both listeners: busywork here, a reconnect if the external system were a socket or a third-party widget. Leave it out and the handler keeps the `measure` from the first render, so a resize after navigating measures the wrong link. Neither is what you mean. The subscription belongs to the component's lifetime; only the handler's logic is reactive. `useEffectEvent` (stable since React 19.2) wraps `measure` in a function that always calls the latest version and is not a dependency, so the effect runs once and still measures the pathname that is current when the event fires. Three rules: call an Effect Event only from inside an effect (calling it during render throws), never pass it to a child or another hook, and keep the values that should re-run the effect as ordinary dependencies. `src/components/pattern-nav.test.tsx` pins both halves: one `resize` subscription across a navigation, and a resize after it measuring the new pathname.

Not every "latest value" problem is an Effect Event. `src/lib/hooks/use-debounced-callback.ts` also keeps the latest callback, but it is called from an event handler and a timer, never from an effect, so it holds the callback in a ref that an effect updates. That is the older pattern, and outside effects it is still the right one.

**No effect: the cases that look like effects but are not.** Every one of these is already in the repo:

| Temptation | Do this instead | In this repo |
| --- | --- | --- |
| Fetch data in `useEffect` after mount | Fetch during render with Suspense hooks, or in a Server Component | Every pattern page; nothing in `src/` fetches in an effect |
| Compute derived state in an effect and store it | Compute it during render | `others` in `TrackPreview`, `active` in `PatternNav` |
| React to a click or submit in an effect | Do the work in the handler | Both forms and `TrackCard` |
| Reset state when a prop changes | Give the component a `key` so React remounts it | Add `key={trackId}` to a component that keeps per-track state |
| Read an external store's value in an effect | `useSyncExternalStore` | The pattern to reach for if the resize listener ever needs the width as state |
| Notify the parent from an effect | Call the callback in the handler that caused the change | `onOpen` in `TrackCard` |

**Check:** on http://localhost:3000/rsc, the bar sits under **RSC query()**. Click another pattern: the bar slides to it and never blinks. Open React DevTools, change `useLayoutEffect` to `useEffect` in `pattern-nav.tsx`, and navigate again with the browser throttled to a slow CPU: a frame without the bar appears. `e2e/layout-effect.spec.ts` checks that the bar's bounding box matches the active link before and after a client navigation. In the Chrome console, `getEventListeners(window).resize.length` stays at 1 while you navigate between patterns; put `measure` back in the dependency array and watch it get removed and re-added on every click.

## Step 19: Apollo local state: reactive variables and client fields

"How do you handle state that is not on the server?" has two Apollo answers, and the favorites feature uses both.

**A reactive variable.** It lives outside the cache, any code can read or set it, and every subscriber re-renders when it changes. It is a module singleton, so on the server it would be shared by every request; read it only in Client Components.

```ts
// src/lib/apollo/favorites.ts
import { makeVar } from "@apollo/client";

/**
 * Apollo local state, part 1: a reactive variable. It lives outside the cache, any code can
 * read or set it, and every `useReactiveVar` subscriber and every cache field policy that
 * read it re-renders when it changes.
 *
 * It is a module singleton. On the server that would be shared by every request, so it is
 * only read in Client Components, where each browser tab has its own copy.
 */
export const favoriteTrackIdsVar = makeVar<readonly string[]>([]);

export function toggleFavorite(trackId: string) {
  const current = favoriteTrackIdsVar();
  favoriteTrackIdsVar(
    current.includes(trackId) ? current.filter((id) => id !== trackId) : [...current, trackId],
  );
}
```

`useReactiveVar` is the direct subscription. The card button and the header badge use it, and they work on every pattern, including RSC pages whose tracks never enter the browser cache:

```tsx
// src/components/favorite-button.tsx
"use client";

import { useReactiveVar } from "@apollo/client/react";
import { favoriteTrackIdsVar, toggleFavorite } from "@/lib/apollo/favorites";
import styles from "./favorite-button.module.css";

/**
 * Reads local state straight from the reactive variable. useReactiveVar subscribes this
 * component to the variable, so every card and the header count update together, without
 * a provider and without the entity having to exist in the Apollo cache (RSC pages never
 * put their tracks there).
 */
export function FavoriteButton({ trackId, title }: { trackId: string; title: string }) {
  const favorites = useReactiveVar(favoriteTrackIdsVar);
  const isFavorite = favorites.includes(trackId);

  return (
    <button
      type="button"
      className={styles.button}
      aria-pressed={isFavorite}
      aria-label={`${isFavorite ? "Remove" : "Add"} ${title} ${isFavorite ? "from" : "to"} favorites`}
      onClick={() => toggleFavorite(trackId)}
    >
      {isFavorite ? "♥" : "♡"}
    </button>
  );
}
```

**A client-only field.** `Track.isFavorite` exists in no server schema. A field policy on the cache computes it, and because the read function calls the reactive variable, the cache re-broadcasts to every watcher of the field when the variable changes. Both clients share the cache factory:

```ts
// src/lib/apollo/cache.ts
import { InMemoryCache } from "@apollo/client-integration-nextjs";
import { favoriteTrackIdsVar } from "./favorites";

/**
 * Apollo local state, part 2: a client-only field. `Track.isFavorite` exists in no server
 * schema; it is computed by this field policy whenever a query or fragment selects
 * `isFavorite @client`. Apollo strips `@client` fields before sending the request, and
 * because the read function calls the reactive variable, the cache re-broadcasts to every
 * watcher of the field when the variable changes. Codegen learns the field from
 * src/graphql/client-schema.graphql.
 */
export function createCache() {
  return new InMemoryCache({
    typePolicies: {
      Track: {
        fields: {
          isFavorite: {
            read(_, { readField }) {
              const id = readField<string>("id");
              return id !== undefined && favoriteTrackIdsVar().includes(id);
            },
          },
        },
      },
    },
  });
}
```

Fragments select it with `@client`, which Apollo strips before the request leaves. Codegen needs to know the field exists, so the client schema extends the server one:

```graphql
# src/graphql/client-schema.graphql
# Client-only additions to the server schema, so codegen can type `@client` fields.
directive @client on FIELD

extend type Track {
  isFavorite: Boolean!
}
```

```graphql
# src/components/favorite-status.graphql
# A client-only field, resolved by the Track.isFavorite field policy in src/lib/apollo/cache.ts.
fragment FavoriteStatus_track on Track {
  id
  isFavorite @client
}
```

```tsx
// src/components/favorite-status.tsx
"use client";

import { useFragment } from "@apollo/client/react";
import { FavoriteStatus_TrackFragmentDoc } from "@/__generated__/graphql";
import { ContentSection } from "./content-section";
import styles from "./register-view-form.module.css";

/**
 * Reads local state through the cache instead of the variable: the fragment selects
 * `isFavorite @client`, which the Track field policy computes from the reactive variable.
 * This only works where the Track entity is in the browser cache (the Client Component
 * patterns), which is the trade-off against FavoriteButton's direct read.
 */
export function FavoriteStatus({ trackId }: { trackId: string }) {
  const { data, complete } = useFragment({
    fragment: FavoriteStatus_TrackFragmentDoc,
    from: { __typename: "Track", id: trackId },
  });

  return (
    <ContentSection>
      <p className={styles.label} data-testid="favorite-status">
        {complete
          ? data.isFavorite
            ? "♥ In your favorites, read from the cache field Track.isFavorite @client."
            : "♡ Not in your favorites, read from the cache field Track.isFavorite @client."
          : "Track not in the client cache yet."}
      </p>
    </ContentSection>
  );
}
```

The trade-off between the two reads: the variable works anywhere, the cache field only where the entity is in the browser cache, but the cache field composes with queries and fragments like any other field.

**Check:** on http://localhost:3000/rsc, click a heart: the header badge appears. Switch to useSuspenseQuery with the nav and open that track: the status line reads "In your favorites" through the `@client` field. Reload the page: favorites are gone, because a reactive variable is memory, not storage. `src/components/favorite-status.test.tsx` seeds a cache and proves the field re-renders when the variable changes.

## Step 20: The link chain

Every request from either client goes through the same chain of links. Links run left to right on the way out and right to left on the way back, so the order is part of the design.

```ts
// src/lib/apollo/links.ts
import { ApolloLink, HttpLink } from "@apollo/client";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import type { ErrorLike } from "@apollo/client";

interface LinkChainOptions {
  uri: string;
  /** Extra headers, for example a marker that tells the two clients apart in server logs. */
  headers?: Record<string, string>;
  /** Next.js fetch options for the server-side client. */
  fetchOptions?: RequestInit;
  /** Resolves a bearer token per operation; return null when there is no session. */
  getToken?: () => Promise<string | null> | string | null;
}

const operationType = (operation: ApolloLink.Operation) =>
  operation.query.definitions.find((definition) => definition.kind === "OperationDefinition")
    ?.operation;

/**
 * Retry only what is safe to retry: transient network failures and 5xx responses on
 * queries. GraphQL errors are deterministic (same request, same error), 4xx responses are
 * the client's fault, and mutations are not idempotent.
 */
export function shouldRetry(error: ErrorLike, operation: ApolloLink.Operation) {
  if (operationType(operation) === "mutation") return false;
  if (CombinedGraphQLErrors.is(error)) return false;
  if (ServerError.is(error)) return error.statusCode >= 500;
  return true;
}

/**
 * The link chain both Apollo Clients use. Links run left to right on the way out and right
 * to left on the way back, so the order matters:
 *
 *   ErrorLink   observes every failure (logging, metrics); it does not swallow errors
 *   RetryLink   re-sends transient failures with exponential backoff and jitter
 *   SetContextLink   adds headers per operation: the place for an auth token
 *   HttpLink    performs the request; the terminating link must be last
 */
export function createLinkChain({ uri, headers, fetchOptions, getToken }: LinkChainOptions) {
  const errorLink = new ErrorLink(({ error, operation }) => {
    const label = `[Apollo] ${operationType(operation) ?? "operation"} ${operation.operationName}`;
    if (CombinedGraphQLErrors.is(error)) {
      console.error(`${label}: ${error.errors.map((graphqlError) => graphqlError.message).join("; ")}`);
    } else {
      console.error(`${label}: ${error.message}`);
    }
  });

  const retryLink = new RetryLink({
    delay: { initial: 300, max: 2000, jitter: true },
    attempts: { max: 3, retryIf: shouldRetry },
  });

  const authLink = new SetContextLink(async (previousContext) => {
    const token = (await getToken?.()) ?? null;
    return {
      headers: {
        ...previousContext.headers,
        ...headers,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    };
  });

  return ApolloLink.from([errorLink, retryLink, authLink, new HttpLink({ uri, fetchOptions })]);
}
```

- `ErrorLink` observes every failure without swallowing it; the hook or the awaiting caller still receives the error.
- `RetryLink` re-sends transient failures with exponential backoff and jitter. `shouldRetry` is the interesting part: never a mutation (not idempotent), never a GraphQL error (deterministic), never a 4xx (the client's fault).
- `SetContextLink` sets headers per operation, merging whatever the operation's own `context.headers` carries. This is where a session token goes. The `getToken` slot suits a browser client with a token in memory; the RSC client cannot use it, because reading cookies inside a link would drag every cached and static route that shares the client into dynamic rendering. The Server Action in Step 21 passes the token per operation instead. The browser client sets no custom headers otherwise, because each one would need CORS approval from the API.
- `HttpLink` performs the request and must be last.

**Check:** open http://localhost:3000/suspense with DevTools offline, then go back online and reload: the console shows the ErrorLink entries and the request succeeds on a retry. `src/lib/apollo/links.test.ts` pins the retry policy.

## Step 21: Authentication: Auth.js, the proxy, and the session in Server Actions

The Odyssey API is public and ignores an `Authorization` header, so nothing in this step can be enforced by the server you talk to. What it shows is everything on the Next.js side of a login: an Auth.js credentials provider, a session in an HttpOnly cookie, a route kept behind that session by `proxy.ts`, the session read again in a Server Component and in a Server Action, and its token handed to Apollo per operation. Swap the demo user table for a database and the upstream for an API that checks bearer tokens, and the shape does not change.

Install Auth.js v5 (`pnpm add next-auth@beta`). It signs the cookie with `AUTH_SECRET`: `.env.development` carries a development-only value that `next dev` loads, and production sets its own (`npx auth secret`). If the secret is missing, `auth()` logs `MissingSecret` and returns `null`. It fails closed, so a misconfigured app locks everyone out rather than in.

**The user table and the schema.** One demo account, public because the login page prints it. The server never compares plaintext: it keeps a salted scrypt hash from Node's standard library, verifies it in constant time, and hands back a DTO without the hash. `server-only` keeps the module out of every client bundle.

```ts
// src/lib/auth/demo-account.ts
/**
 * The one account the demo knows. It is public on purpose: the login page prints it and the
 * end-to-end tests sign in with it. The server never compares against this plaintext; it keeps
 * a salted hash in users.ts, as a real user table would.
 */
export const DEMO_ACCOUNT = {
  name: "Cadet Kitty",
  email: "cadet@catstronauts.dev",
  password: "space-cat",
} as const;
```

```ts
// src/lib/auth/users.ts
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
```

The login schema works like the register-view one: run in the browser before the submit, again in the Server Action, and once more in the provider. A `redirectTo` that is not a relative path is dropped rather than reported, because a fresh session must never follow an absolute URL to another site.

```ts
// src/lib/schemas/login.ts
import { z } from "zod";
import { isRedirectPath } from "@/lib/auth/paths";

/** What the credentials provider verifies. */
export const credentialsSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }),
  password: z.string().min(1, "Enter your password"),
});

/**
 * What the login form posts. Validated in the browser before the submit and again in the
 * Server Action, like the register-view form. A tampered redirectTo is dropped rather than
 * reported: the user cannot fix it, and the fallback (the account page) is always fine.
 */
export const loginSchema = credentialsSchema.extend({
  redirectTo: z
    .string()
    .refine(isRedirectPath, "Must be a relative path")
    .optional()
    .catch(undefined),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginFieldErrors = Partial<Record<"email" | "password", string>>;

/** Parses FormData and reduces Zod's error tree to one message per field. */
export function parseLogin(formData: FormData) {
  const result = loginSchema.safeParse(Object.fromEntries(formData));
  if (result.success) {
    return { data: result.data, fieldErrors: undefined } as const;
  }
  const { fieldErrors } = z.flattenError(result.error);
  return {
    data: undefined,
    fieldErrors: { email: fieldErrors.email?.[0], password: fieldErrors.password?.[0] } as const,
  } as const;
}
```

```ts
// src/lib/auth/paths.ts
import type { Route } from "next";

export const SIGN_IN_PATH = "/login";
export const ACCOUNT_PATH = "/account";

/** Routes the proxy keeps behind a session. Prefix match, so /account/anything counts too. */
const PROTECTED_PREFIXES = [ACCOUNT_PATH];

export const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/**
 * Only a relative path is accepted as a place to return to after sign-in: an absolute URL
 * would let a crafted link send a fresh session to another site.
 */
export const isRedirectPath = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//");

export const safeRedirectPath = (value: unknown, fallback: string = ACCOUNT_PATH) =>
  isRedirectPath(value) ? value : fallback;

/** The sign-in page, remembering where to go afterwards. */
export const signInHref = (callbackUrl: string): Route =>
  `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}` as Route;
```

**Two halves of one configuration.** Auth.js runs in two places: the proxy, in front of the matched routes, and the Node side (Route Handler, Server Components, Server Actions). The proxy should stay light, so the configuration is split. `auth.config.ts` holds what the proxy needs, `auth.ts` adds the credentials provider, which imports the user table and `node:crypto`.

```ts
// src/lib/auth/auth.config.ts
import type { NextAuthConfig } from "next-auth";
import { ACCOUNT_PATH, SIGN_IN_PATH, isProtectedPath, signInHref } from "./paths";

/**
 * The part of the Auth.js configuration the proxy can run: no provider that needs Node (the
 * credentials check imports node:crypto), no database. auth.ts spreads this and adds the
 * provider; proxy.ts uses it as is.
 */
export const authConfig = {
  pages: { signIn: SIGN_IN_PATH },
  // A JWT in an HttpOnly cookie: no session store, and the proxy can decode it without I/O.
  session: { strategy: "jwt" },
  // The demo runs on whatever host starts it; a deployment sets AUTH_URL instead.
  trustHost: true,
  providers: [],
  callbacks: {
    /**
     * Runs in the proxy for every matched request with nothing but the decoded cookie: an
     * optimistic check. It keeps strangers off /account and signed-in users off /login. The
     * data itself is protected where it is read (auth() in the page and in the Server Action).
     */
    authorized({ auth, request: { nextUrl } }) {
      const signedIn = Boolean(auth?.user);
      if (isProtectedPath(nextUrl.pathname)) {
        if (signedIn) return true;
        // Auth.js would redirect on `false` too, but with an absolute callbackUrl; a path is enough.
        return Response.redirect(new URL(signInHref(nextUrl.pathname + nextUrl.search), nextUrl.origin));
      }
      if (nextUrl.pathname === SIGN_IN_PATH && signedIn) {
        return Response.redirect(new URL(ACCOUNT_PATH, nextUrl.origin));
      }
      return true;
    },
    /**
     * Runs when the JWT is created and whenever it is read; `user` is only set at sign-in.
     * A credentials provider has no identity provider handing out API tokens, so the demo mints
     * an opaque one here. It stands in for the token a real upstream would verify.
     */
    jwt({ token, user }) {
      if (user) {
        token.accessToken = crypto.randomUUID();
      }
      return token;
    },
    /** Shapes what auth() returns. Only copy what the app needs; the JWT itself stays server-side. */
    session({ session, token }) {
      return { ...session, accessToken: token.accessToken ?? "" };
    },
  },
} satisfies NextAuthConfig;
```

The `authorized` callback is the proxy's whole decision. It sees only the decoded cookie, which is the optimistic check the Next.js authentication guide describes: cheap enough to run on every matched request, prefetches included, and not something to trust with data. `jwt` runs when the token is created and every time it is read; `user` is present only at sign-in, which is when the demo mints an opaque access token in place of the one an identity provider would return. `session` shapes what `auth()` gives the app, and the `.d.ts` teaches TypeScript the extra field.

```ts
// src/lib/auth/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { credentialsSchema } from "@/lib/schemas/login";
import { authConfig } from "./auth.config";
import { findUserByEmail, toUser, verifyPassword } from "./users";

/**
 * The full Auth.js instance, for the Node side: Route Handler, Server Components, Server
 * Actions. `auth()` reads the session cookie for the current request; `signIn` and `signOut`
 * are the server-side calls the actions wrap.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      /**
       * Called with the posted fields when the credentials provider runs. Returning null makes
       * Auth.js throw CredentialsSignin; returning a user makes it issue the session. The
       * schema runs again here because this endpoint is reachable without the form.
       */
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = findUserByEmail(parsed.data.email);
        if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) return null;
        return toUser(user);
      },
    }),
  ],
});
```

```ts
// src/lib/auth/next-auth.d.ts
import type { DefaultSession } from "next-auth";

/** Module augmentation: the fields auth.config.ts adds to the session and the JWT. */
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"];
    /** Opaque token for the upstream API, issued at sign-in. */
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}
```

The Route Handler gives Auth.js its endpoints. The proxy is the `auth` function itself, with a matcher that keeps it off every other route:

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth/auth";

/**
 * Auth.js owns everything under /api/auth: the credentials callback, the session endpoint,
 * sign-out, CSRF. The Server Actions in src/lib/actions/auth.ts call into the same handlers
 * in-process, so the browser never posts here directly in this app.
 */
export const { GET, POST } = handlers;
```

```ts
// src/proxy.ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

/**
 * Runs before the matched routes render. Auth.js decodes the session cookie and hands the
 * result to the `authorized` callback in auth.config.ts, which redirects or lets the request
 * through; nothing else happens here. This is the optimistic check from the Next.js auth
 * guide: it costs no I/O and it keeps strangers off /account before anything renders, but it
 * is not the last line of defense. The page and the Server Action call auth() again.
 *
 * The proxy imports auth.config.ts, not auth.ts: the credentials provider pulls in
 * node:crypto and the user table, which a redirect decision does not need. The matcher keeps
 * the proxy off every other route, so the static and cached demos are untouched.
 */
export default NextAuth(authConfig).auth;

export const config = { matcher: ["/account/:path*", "/login"] };
```

**Sign in and sign out.** The action has the `useActionState` shape from Step 15. `signIn` runs the provider and sets the cookie on this response; wrong credentials throw `CredentialsSignin`, which becomes state; then the action calls `redirect()` itself, so the flow reads top to bottom.

```ts
// src/lib/actions/auth.ts
"use server";

import type { Route } from "next";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth/auth";
import { ACCOUNT_PATH } from "@/lib/auth/paths";
import { type LoginFieldErrors, parseLogin } from "@/lib/schemas/login";

/** Returned to useActionState; must be serializable. */
export type LoginState =
  | { status: "idle" }
  | { status: "invalid"; fieldErrors: LoginFieldErrors }
  | { status: "failed"; message: string };

/**
 * Form action behind useActionState. Auth.js's signIn runs the credentials provider and sets
 * the session cookie on this response. Wrong credentials surface as a CredentialsSignin
 * error, which becomes state the form can show; any other error is rethrown to error.tsx.
 *
 * redirect() is called here rather than left to signIn (redirect: false) so the flow is
 * visible: sign in, then navigate to where the user was going. redirect() throws, so nothing
 * runs after it.
 */
export async function authenticate(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const { data, fieldErrors } = parseLogin(formData);
  if (fieldErrors) {
    return { status: "invalid", fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        status: "failed",
        message:
          error.type === "CredentialsSignin" ? "Wrong email or password" : "Could not sign you in",
      };
    }
    throw error;
  }

  redirect((data.redirectTo ?? ACCOUNT_PATH) as Route);
}

/** Clears the session cookie and returns to the home page. Bound to a plain <form action>. */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
```

```tsx
// src/components/login-form.tsx
"use client";

import { type FormEvent, useActionState, useState } from "react";
import { type LoginState, authenticate } from "@/lib/actions/auth";
import { type LoginFieldErrors, parseLogin } from "@/lib/schemas/login";
import { Button } from "./button";
import styles from "./login-form.module.css";

const IDLE: LoginState = { status: "idle" };

interface LoginFormProps {
  /** Where to go after signing in; already checked to be a relative path. */
  redirectTo: string;
}

/**
 * Same shape as the register-view form: useActionState around a Server Action, the Zod
 * schema run in onSubmit so a typo never costs a round trip, and the server's verdict shown
 * from the returned state. The action ends in a redirect, so a successful submit never
 * produces a new state here; the router simply navigates.
 */
export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(authenticate, IDLE);
  const [clientErrors, setClientErrors] = useState<LoginFieldErrors>({});

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const { fieldErrors } = parseLogin(new FormData(event.currentTarget));
    setClientErrors(fieldErrors ?? {});
    if (fieldErrors) {
      event.preventDefault();
    }
  };

  const fieldErrors = state.status === "invalid" ? state.fieldErrors : clientErrors;

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className={styles.form}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label className={styles.field}>
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
        />
      </label>
      {fieldErrors.email ? (
        <p id="login-email-error" role="alert" className={styles.error}>
          {fieldErrors.email}
        </p>
      ) : null}
      <label className={styles.field}>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
        />
      </label>
      {fieldErrors.password ? (
        <p id="login-password-error" role="alert" className={styles.error}>
          {fieldErrors.password}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
      {state.status === "failed" ? (
        <p role="alert" className={styles.error}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
```

```tsx
// src/app/login/page.tsx
import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { PageContainer } from "@/components/page-container";
import { Panel } from "@/components/panel";
import { DEMO_ACCOUNT } from "@/lib/auth/demo-account";
import { safeRedirectPath } from "@/lib/auth/paths";

export const metadata: Metadata = { title: "Sign in" };

/**
 * A Server Component page: it reads callbackUrl from the URL (which makes the route dynamic)
 * and renders the Client Component form. The proxy sends signed-in visitors away from here.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  return (
    <PageContainer>
      <Panel title="Sign in">
        <p>
          The demo account is <code>{DEMO_ACCOUNT.email}</code> with the password{" "}
          <code>{DEMO_ACCOUNT.password}</code>. The session is a JWT in an HttpOnly cookie;
          the Odyssey API ignores it, so signing in only unlocks what this app checks itself.
        </p>
        <LoginForm redirectTo={safeRedirectPath(callbackUrl)} />
      </Panel>
    </PageContainer>
  );
}
```

**The protected page.** The proxy already turned strangers away, but the page calls `auth()` again, next to the data it renders. That is the defense in depth the guide asks for, and it is also what makes the route dynamic: `auth()` reads cookies, so no segment config is needed.

```tsx
// src/app/account/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/button";
import { PageContainer } from "@/components/page-container";
import { Panel } from "@/components/panel";
import { signOutAction } from "@/lib/actions/auth";
import { auth } from "@/lib/auth/auth";
import { ACCOUNT_PATH, signInHref } from "@/lib/auth/paths";

export const metadata: Metadata = { title: "Account" };

/** Enough of the token to see it changes per sign-in, not enough to reuse it. */
const mask = (token: string) => `${token.slice(0, 8)}…`;

/**
 * The proxy already turned strangers away, but it only looked at a cookie. The page checks
 * again with auth(), next to the data it renders: the defense in depth the Next.js auth guide
 * asks for. auth() reads cookies, which makes the route dynamic; no segment config needed.
 */
export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect(signInHref(ACCOUNT_PATH));
  }

  return (
    <PageContainer>
      <Panel title="Mission control">
        {/* One template literal, so the HTML has one text node and can be checked as text. */}
        <p data-testid="signed-in-as">
          {`Signed in as ${session.user.name} (${session.user.email}).`}
        </p>
        <p>
          API token <code>{mask(session.accessToken)}</code>, issued at sign-in. The
          register-views Server Action sends it as a bearer header on its GraphQL mutations
          and refuses to run without a session.
        </p>
        <form action={signOutAction}>
          <Button type="submit">Sign out</Button>
        </form>
      </Panel>
    </PageContainer>
  );
}
```

**The session in a Server Action.** `registerView` from the forms step refuses to run without a session and passes the session's token to Apollo as per-operation `context`; the `SetContextLink` from Step 20 merges those headers with its own. The token does not go through the link's `getToken` slot on purpose: `auth()` reads cookies, and the RSC client is shared with cached and static routes, where a cookie read is a build error or a silent switch to dynamic rendering. Passing it at the call site keeps the decision where the session is.

```ts
// src/lib/actions/register-view.ts
"use server";

import { revalidatePath } from "next/cache";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { getClient } from "@/lib/apollo/rsc-client";
import { auth } from "@/lib/auth/auth";
import { type RegisterViewFieldErrors, parseRegisterView } from "@/lib/schemas/register-view";

/** Returned to useActionState; must be serializable. */
export type RegisterViewState =
  | { status: "idle" }
  | { status: "invalid"; fieldErrors: RegisterViewFieldErrors }
  | { status: "failed"; message: string }
  | { status: "registered"; views: number; numberOfViews: number };

/**
 * Form action for the Server Action form, in the (previousState, formData) shape that
 * useActionState expects. The browser posts the form, Next.js calls this with the FormData,
 * and the mutation runs on the server with the RSC client.
 *
 * Validation and the session check run here even though the page validated and hid the form:
 * every "use server" export is a public endpoint. Errors are returned, not thrown, so the
 * form can show them.
 *
 * The session's token travels as per-operation context rather than through the link chain's
 * getToken: auth() reads cookies, and a link that read cookies on every operation would break
 * the cached and static routes that share the RSC client. The SetContextLink merges these
 * headers with its own.
 *
 * revalidatePath is what makes the page update: an action that revalidates nothing returns
 * only its value and Next.js does not re-render the route. With it, the action response
 * carries the re-rendered page, so TrackDetail shows the new count in the same roundtrip.
 */
export async function registerView(
  _previous: RegisterViewState,
  formData: FormData,
): Promise<RegisterViewState> {
  const { data, fieldErrors } = parseRegisterView(formData);
  if (fieldErrors) {
    return { status: "invalid", fieldErrors };
  }

  const session = await auth();
  if (!session?.user) {
    return { status: "failed", message: "Sign in to register views" };
  }

  const { trackId, views } = data;
  // One client for the whole action: outside a React render, every getClient() call is a new instance.
  const client = getClient();
  let numberOfViews = 0;
  try {
    for (let registered = 0; registered < views; registered += 1) {
      const result = await client.mutate({
        mutation: IncrementTrackViewsDocument,
        variables: { trackId },
        context: { headers: { authorization: `Bearer ${session.accessToken}` } },
      });
      numberOfViews = result.data?.incrementTrackViews.track?.numberOfViews ?? numberOfViews;
    }
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "The mutation failed",
    };
  }

  revalidatePath(`/rsc/track/${trackId}`);
  return { status: "registered", views, numberOfViews };
}
```

The track page reads the session inside the same Suspense boundary as the track, so the cookie read never blocks the shell, and it shows a sign-in link instead of the form when there is no session:

```tsx
// src/components/sign-in-prompt.tsx
import Link from "next/link";
import { signInHref } from "@/lib/auth/paths";
import { Button } from "./button";
import { ContentSection } from "./content-section";
import styles from "./register-view-form.module.css";

/**
 * Shown in place of the Server Action form when there is no session. The action checks the
 * session itself; this prompt only saves a round trip that would fail.
 */
export function SignInPrompt({ callbackUrl }: { callbackUrl: string }) {
  return (
    <ContentSection>
      <div className={styles.form} data-testid="sign-in-prompt">
        <p className={styles.label}>
          Registering views through the Server Action needs a signed-in user: the action
          reads the session with auth() and forwards its token to the API.
        </p>
        <Link href={signInHref(callbackUrl)}>
          <Button>Sign in to register views</Button>
        </Link>
      </div>
    </ContentSection>
  );
}
```

**What is not here, and why.** The header has an **Account** link, not the user's name. A session read in the root layout would make every route dynamic on this branch: `/` is `dynamic = "error"` and would fail the build, `/revalidate` would stop being ISR, `/legacy` would render with an empty cookie jar. Per-user UI in a shared layout is the case Cache Components exists for. The `use-cache` branch streams a `UserMenu` into the header behind a Suspense boundary while the shell stays static.

**Check:** open http://localhost:3000/account: the URL becomes `/login?callbackUrl=%2Faccount` before anything renders (a 302 in the Network tab). Sign in with a wrong password: the message appears and no cookie is set. Sign in with `cadet@catstronauts.dev` and `space-cat`: the account page shows the user and a masked token, and the Server Action response carried a `Set-Cookie` for `authjs.session-token`, HttpOnly. Open http://localhost:3000/rsc/track/c_0: the register-views form is back and a submit succeeds. Sign out: the cookie is gone and `/account` redirects again. `e2e/auth.spec.ts` covers the flow. The unit tests cover the `authorized` decision, the token callbacks, the password hashing, the schema, the action (with `signIn` mocked and the real `CredentialsSignin`), the form, and the session check in `registerView`.

## Step 22: Metadata: file conventions and Open Graph images

`generateMetadata` and the title template exist since Step 7. The rest of the metadata story is files next to the layout: Next.js turns them into routes and `<head>` tags on its own.

- `src/app/favicon.ico` and `src/app/apple-icon.png` become the icon links.
- `src/app/manifest.ts` is served at `/manifest.webmanifest` and linked automatically:

```ts
// src/app/manifest.ts
import type { MetadataRoute } from "next";

/** Served at /manifest.webmanifest and linked from <head> automatically (file convention). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Catstronauts: Apollo Client on the Next.js App Router",
    short_name: "Catstronauts",
    description: "Apollo Client 4 data-fetching patterns on the Next.js App Router",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/logo192.png", sizes: "192x192", type: "image/png" },
      { src: "/logo512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

- `src/app/opengraph-image.tsx` renders the site card with `next/og` (Satori: flexbox-style CSS only, absolute image URLs, one text node per box unless it is `display: flex`):

```tsx
// src/app/opengraph-image.tsx
import { ImageResponse } from "next/og";

// Metadata file convention: this route becomes the og:image (and twitter:image) for the
// whole app, and the exports below become the image's metadata. Rendered on the server with
// Satori, so only flexbox-style CSS and absolute image URLs work in here.
export const alt = "Catstronauts: Apollo Client 4 patterns on the Next.js App Router";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "linear-gradient(135deg, #f25cc1 0%, #7156d9 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1 }}>Catstronauts</div>
      <div style={{ fontSize: 40, marginTop: 24, opacity: 0.9 }}>
        Apollo Client 4 on the Next.js App Router, six data-fetching patterns side by side
      </div>
    </div>,
    size,
  );
}
```

- A dynamic route can have its own. This one is a Route Handler, not a React render, so the RSC client works but React `cache()` memoizes nothing:

```tsx
// src/app/rsc/track/[trackId]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { GetTrackDocument } from "@/__generated__/graphql";
import { query } from "@/lib/apollo/rsc-client";

/**
 * A per-route Open Graph image. This is a Route Handler, not a React render: the RSC client
 * still works (React cache() simply memoizes nothing here), so the image can carry the
 * track's real title, author, and thumbnail.
 */
export const alt = "Track";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  const { data } = await query({ query: GetTrackDocument, variables: { trackId }, errorPolicy: "none" });
  const { title, author, thumbnail, modulesCount } = data.track;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#191c23",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 64, width: 700 }}>
        <div style={{ fontSize: 28, color: "#f25cc1", letterSpacing: 4 }}>CATSTRONAUTS</div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, marginTop: 16 }}>{title}</div>
        {/* Satori wants a single text child per box unless the box is display: flex. */}
        <div style={{ fontSize: 32, marginTop: 24, color: "#b2b9c3" }}>
          {`by ${author.name} · ${modulesCount ?? 0} modules`}
        </div>
      </div>
      {thumbnail ? (
        // Satori renders plain img tags; next/image has no meaning here.
        <img src={thumbnail} alt="" width={500} height={630} style={{ objectFit: "cover" }} />
      ) : null}
    </div>,
    size,
  );
}
```

`metadataBase` in the root layout turns these relative URLs into the absolute ones social cards require; set `NEXT_PUBLIC_SITE_URL` in production.

**Check:** view the source of http://localhost:3000/rsc/track/c_0: `og:image` points at `/rsc/track/c_0/opengraph-image`. Open that URL: a card with the track's title, author, and thumbnail. `/manifest.webmanifest` returns the manifest. `e2e/metadata.spec.ts` covers all of it.

## Step 23: Errors and retry

Suspense hooks and awaited RSC queries throw to the nearest `error.tsx`. `useQuery` returns `error` instead. Next 16.3 gives the boundary `retry()`, which re-fetches the route segment; `reset()` would only re-render it.

There is a trap. Apollo's suspense hooks keep a rejected result in their cache until it auto-disposes, 30 seconds by default, so `retry()` alone re-throws the same error. Refetch what is still watched first:

```tsx
// src/app/error.tsx
"use client";

import { useApolloClient } from "@apollo/client/react";
import { useTransition } from "react";
import { Button } from "@/components/button";
import { NotFoundMessage } from "@/components/not-found-message";
import { PageContainer } from "@/components/page-container";
import { isNotFoundError } from "@/lib/apollo/not-found";
import styles from "./error.module.css";

/**
 * Nearest error boundary for every route. Suspense hooks (useSuspenseQuery, useReadQuery)
 * and awaited RSC queries throw here; useQuery does not, it returns `error` instead.
 *
 * In production, Next.js redacts errors thrown during Server Component rendering
 * (React error #441) and only forwards a digest, so the GraphQL message is visible in
 * development and in Client Component patterns, but not for the RSC pattern.
 */
export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const client = useApolloClient();

  const [isPending, startTransition] = useTransition();

  // A Client Component pattern asked the API for an unknown id: the GraphQL error reaches this
  // boundary in the browser. Server Components call notFound() before it gets this far.
  if (isNotFoundError(error)) {
    return (
      <PageContainer>
        <NotFoundMessage />
      </PageContainer>
    );
  }

  const handleRetry = () =>
    startTransition(async () => {
      // Suspense hooks keep a rejected result in their cache until it auto-disposes
      // (30 s by default), so retry() alone would re-throw the same error. Refetch the
      // queries that are still watched first; a repeated failure surfaces through retry().
      await client.refetchQueries({ include: "active" }).catch(() => undefined);
      // retry() re-fetches the route segment and re-renders it; reset() would only re-render.
      retry();
    });

  return (
    <PageContainer>
      <section className={styles.error}>
        <h2>Houston, something went wrong</h2>
        <pre className={styles.message}>{error.message}</pre>
        {error.digest ? <p className={styles.digest}>Digest: {error.digest}</p> : null}
        <Button onClick={handleRetry} disabled={isPending}>
          {isPending ? "Retrying..." : "Try again"}
        </Button>
      </section>
    </PageContainer>
  );
}
```

**Check:** open http://localhost:3000/rsc/track/does-not-exist. In development the message is the API's `404: Not Found`, a GraphQL error carrying the upstream REST status in its extensions. In a production build it is React error #441 plus a digest: Next.js redacts Server Component errors. Step 24 adds a test that proves recovery from a transient failure.

## Step 24: Tests

Unit tests with Vitest, Testing Library, and happy-dom:

```ts
// vitest.config.mts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // next-auth imports `next/server` without an extension; let Vite resolve it instead of Node.
    server: { deps: { inline: ["next-auth"] } },
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";

// Next.js bundles React's canary channel, where <ViewTransition> is an export of "react". The
// npm package Vitest resolves (19.2) does not ship it, so components that animate in the app
// would render an undefined element type here. Every other export stays the real one.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<Record<string, unknown>>();
  if ("ViewTransition" in react) return react;
  return { ...react, ViewTransition: ({ children }: { children?: ReactNode }) => children };
});

afterEach(cleanup);
```

The most useful unit test asserts what the whole "no refetch, no manual update" argument rests on: after the mutation, the normalized entity in the cache changed. `MockedProvider` moved to `@apollo/client/testing/react` in Apollo Client 4.

```tsx
// src/lib/hooks/use-increment-track-views.test.tsx
import { InMemoryCache, gql } from "@apollo/client";
import { MockedProvider } from "@apollo/client/testing/react";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { useIncrementTrackViews } from "./use-increment-track-views";

const TRACK_VIEWS = gql`
  fragment TrackViews on Track {
    id
    numberOfViews
  }
`;

const mocks = [
  {
    request: { query: IncrementTrackViewsDocument, variables: { trackId: "c_0" } },
    result: {
      data: {
        incrementTrackViews: {
          __typename: "IncrementTrackViewsResponse" as const,
          code: 200,
          success: true,
          message: "Incremented",
          track: { __typename: "Track" as const, id: "c_0", numberOfViews: 52 },
        },
      },
    },
  },
];

describe("useIncrementTrackViews", () => {
  it("runs the mutation and updates the normalized Track entity in the cache", async () => {
    const cache = new InMemoryCache();
    cache.writeFragment({
      id: "Track:c_0",
      fragment: TRACK_VIEWS,
      data: { __typename: "Track", id: "c_0", numberOfViews: 51 },
    });

    const wrapper = ({ children }: PropsWithChildren) => (
      <MockedProvider mocks={mocks} cache={cache}>
        {children}
      </MockedProvider>
    );
    const { result } = renderHook(() => useIncrementTrackViews(), { wrapper });

    const response = await act(() => result.current("c_0"));

    expect(response.data?.incrementTrackViews.success).toBe(true);
    expect(cache.extract()["Track:c_0"]).toMatchObject({ numberOfViews: 52 });
  });
});
```

The other unit tests (`src/components/*.test.tsx`, `src/lib/helpers.test.ts`) cover the presentational components and the card's click semantics. Async Server Components cannot be unit-tested with Vitest, so the pattern differences are proven end to end with Playwright against a production build:

```ts
// playwright.config.ts
import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Same .env resolution as Next.js, so the tests target the endpoint the app talks to.
loadEnvConfig(process.cwd());

/** Override with E2E_PORT when something else (a dev server) holds 3000. */
const PORT = Number(process.env.E2E_PORT ?? 3000);

/** Shared with e2e/revalidate-route.spec.ts; the server only accepts the secret it was started with. */
export const REVALIDATE_SECRET = "e2e-only-secret";

/** Signs the session cookie of the server under test; `next start` does not load .env.development. */
const AUTH_SECRET = "e2e-only-auth-secret";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Always build and start our own server: an existing one may lack these secrets.
    reuseExistingServer: false,
    timeout: 180_000,
    env: { REVALIDATE_SECRET, AUTH_SECRET },
  },
});
```

The suite in `e2e/patterns.spec.ts` checks, per pattern, that the list renders and navigates; that server-rendered routes contain the data in their HTML while `/legacy` contains the spinner; that `/suspense` makes zero browser GraphQL requests while `/legacy` makes one; that the Server Action POST happens and the counter moves; and that the `queryRef` refetch picks up a server-side change. `e2e/error-recovery.spec.ts` blocks GraphQL during a client-side navigation, lifts the block, and expects **Try again** to recover.

**Check:**

```sh
pnpm vitest run       # 25 files, 86 tests
pnpm test:e2e         # builds, starts the server, 40 tests
E2E_PORT=3100 pnpm test:e2e   # when a dev server holds port 3000
```

## Step 25: Build and ship

```sh
pnpm build
pnpm start
```

Read the route table the build prints; every rendering mode of the classic model is in it.

| Symbol | Routes | Why |
| --- | --- | --- |
| `ƒ (Dynamic)` | `/rsc`, `/suspense`, `/preload`, `/background` and their detail pages, `/api/revalidate`, `/rsc/track/[trackId]/opengraph-image` | `dynamic = "force-dynamic"` in the pattern's layout; route handlers with `POST` or dynamic params are dynamic |
| `○ (Static)` | `/`, `/legacy`, `/legacy/track/[trackId]`, `/opengraph-image`, `/manifest.webmanifest`, `/apple-icon.png` | `dynamic = "error"` and `dynamic = "force-static"`; nothing fetches on the server; metadata files prerender |
| `○ (Static)` with `1m` | `/revalidate` | `revalidate = 60` on the page segment: ISR |
| `● (SSG)` with `1m` | `/revalidate/track/c_0` … | `generateStaticParams` prerendered every track; each fetch is cached for a minute under its tag |

This is the classic rendering model. Next.js 16's Cache Components (`cacheComponents: true`) inverts it: everything is dynamic unless a function or component says `"use cache"`, with `cacheLife` and `cacheTag` replacing `revalidate` and `next.tags`, and the `dynamic` segment config disappears. The `use-cache` branch of this repo shows the same app under that model.

The `.github/workflows/ci.yml` on this branch runs lint, typecheck, unit tests, and the build on every push.

**Check:** `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/rsc` prints `200` and the view counts on `/rsc` match the ones on `/suspense`.

## What you learned

- Two Apollo Clients: a per-request one for Server Components and Server Actions (`registerApolloClient`), and a provider-based one for Client Components that runs on the server for SSR and again in the browser (`ApolloNextAppProvider`). Never read the same data from both.
- `"use client"` is an import-graph boundary. Server-rendered `children` pass through Client Components untouched, which is why one provider in the root layout costs the RSC pattern nothing.
- Suspense hooks turn streaming SSR on. `useQuery` ships a spinner; `useSuspenseQuery` ships the data and a warm cache.
- `PreloadQuery` and `useBackgroundQuery` start a request before the component that needs it renders. Same idea, different side of the boundary.
- A mutation that returns the entity's `id` and the changed fields updates the normalized cache by itself; `optimisticResponse` moves it before the server answers, and `useFragment` lets any component read the entity live. When there is no browser cache, use a Server Action, from a click or a `<form action>`, validate on both sides, revalidate so Next.js re-renders the route, and use `useOptimistic` for the same instant feedback.
- `startTransition` keeps the current UI while a suspense query re-runs with new variables or a Server Action runs from a button; `isPending` is the dim-or-disable signal.
- `useLayoutEffect` is for DOM measurements that must change what gets painted; `useEffect` is for subscribing to things outside React; fetching, derived state, and event handling need neither.
- `errorPolicy: "none"` narrows types; `error.tsx` catches thrown errors; suspense error recovery needs a refetch before `retry()`.
- The URL is the default home for list state: the server reads `searchParams`, the box rewrites the URL. Component state with `useDeferredValue` is for filtering data the browser already holds.
- Independent sections stream behind content-shaped skeletons; a route group scopes `loading.tsx`; a boundary above a page trades a real 404 status for streaming.
- Apollo local state: reactive variables for anything, `@client` fields through a field policy where the entity is in the cache; codegen learns them from a client schema.
- The link chain is a pipeline: observe errors, retry only what is safe, attach headers, then send.
- Metadata is mostly files: icons, manifest, and Open Graph images, with `metadataBase` making URLs absolute.
- Next.js caching is decided per route and per fetch: `dynamic` for the rendering mode, `revalidate` at the segment or the fetch, `generateStaticParams` for known paths, and three invalidation APIs: `updateTag` (immediate, Server Actions), `revalidatePath` (by route), `revalidateTag(tag, "max")` (stale-while-revalidate, also from route handlers).

Where to go next: read [docs/patterns.md](docs/patterns.md) for the talking points, compare with the `use-cache` branch, then try Apollo's data masking with `useFragment` and `@defer` with `SSRMultipartLink`.

The README is generated from `docs/tutorial.template.md` by `pnpm docs:readme`, which inlines the source files. Edit the template or the code, then regenerate; do not edit README.md by hand.

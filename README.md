# Tutorial: Catstronauts on the Next.js App Router with Apollo Client 4

You finished Apollo Odyssey's [Client-side GraphQL with React & Apollo](https://odyssey.apollographql.com/client-side-graphql-react). That app is a Vite single-page app: every query runs in the browser with `useQuery`. This tutorial rebuilds it on the **Next.js 16 App Router** with **Apollo Client 4** and [`@apollo/client-integration-nextjs`](https://github.com/apollographql/apollo-client-integrations), and renders the same two pages (track list, track detail) **six times, once per data-fetching pattern**, so you can compare them on live data.

By the end you will be able to:

- set up the two Apollo Client instances an App Router app needs, and explain why there are two
- fetch in a Server Component with `query()`, in a Client Component with `useSuspenseQuery`, hand a request from server to client with `PreloadQuery`, avoid waterfalls with `useBackgroundQuery`, and say when `useQuery` is still the right tool
- decide per route whether Next.js renders on every request or serves the Data Cache, with `dynamic`, `revalidate`, tags, and `updateTag`
- run a mutation with `useMutation` and with a Server Action, and let the normalized cache do the update
- handle errors, loading, and a trap in suspense error recovery
- test all of it with Vitest, Apollo's `MockedProvider`, and Playwright

**Starting point:** the finished course app on the `main` branch of this repo. **Finished result:** the `nextjs-app-router` branch. Every step names the finished file so you can compare when stuck. **Time:** about three hours. **Prerequisites:** Node 24, pnpm 11, and the course itself.

Run the finished app any time:

```sh
git checkout nextjs-app-router
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # unit tests
pnpm test:e2e     # Playwright against a production build
```

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
13. [Errors and retry](#step-13-errors-and-retry)
14. [Tests](#step-14-tests)
15. [Build and ship](#step-15-build-and-ship)
16. [What you learned](#what-you-learned)

Each step ends with a **Check**. Do the check before moving on.

## Step 1: Start from the course app

```sh
git checkout main
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
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-markdown": "^10.1.0",
    "rxjs": "^7.8.2",
    "server-only": "^0.0.1"
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
  title: {
    default: "Catstronauts",
    template: "%s | Catstronauts",
  },
  description: "Apollo Client 4 data-fetching patterns on the Next.js App Router",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo192.png",
  },
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
import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  InMemoryCache,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { GRAPHQL_URI } from "@/lib/graphql-uri";

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
 * Data Cache (see /cached), or export `dynamic = "force-dynamic"` to render per request
 * (see the layout.tsx of /rsc). Without either, Next.js fetches once at build time.
 */
export const { getClient, query, PreloadQuery } = registerApolloClient(
  () =>
    new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({ uri: GRAPHQL_URI }),
    }),
);
```

The Client Component client. `ApolloNextAppProvider` calls `makeClient` on the server for the SSR pass and again in the browser. The `ApolloClient` and `InMemoryCache` from the integration package are subclasses that record every query result during SSR, stream it into the HTML, and replay it into the browser cache, so hydration does not refetch.

```tsx
// src/lib/apollo/apollo-wrapper.tsx
"use client";

import "./dev-messages";
import { HttpLink } from "@apollo/client";
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import type { PropsWithChildren } from "react";
import { GRAPHQL_URI } from "@/lib/graphql-uri";

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
    cache: new InMemoryCache(),
    link: new HttpLink({ uri: GRAPHQL_URI }),
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
  | "cached";

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
    slug: "cached",
    title: "RSC + Data Cache",
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

`PatternNav` (`src/components/pattern-nav.tsx`) is the one Client Component in the header: it reads `usePathname()` and links every pattern to the same sub-path, so you can jump from `/rsc/track/c_0` to `/preload/track/c_0`. The index page (`src/app/page.tsx`) lists the registry; replace the placeholder from Step 3 with the finished file.

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
import { type MouseEvent, useTransition } from "react";
import type { TrackCard_TrackFragment } from "@/__generated__/graphql";
import { humanReadableTimeFromSeconds } from "@/lib/helpers";
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
 */
export function TrackCard({ track, href, onOpen, eager = false }: TrackCardProps) {
  const { title, thumbnail, author, length, modulesCount } = track;
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
      router.push(href);
    });
  };

  return (
    <Link href={href} className={styles.card} onClick={handleClick} aria-busy={isPending}>
      <div className={styles.content}>
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
  );
}
```

Three details to notice: the click is intercepted so the increment completes before `router.push`, otherwise the detail page can render a count that is stale by one; the wait is bounded because `HttpLink` has no timeout; and modifier clicks are left to the browser so open-in-new-tab keeps working. Styles are in `src/components/track-card.module.css`.

**Check:** `pnpm typecheck` passes. Nothing renders tracks yet.

## Step 7: Pattern 1: RSC `query()` and a Server Action

The page is an `async` Server Component. It awaits `query()`, and the HTML arrives complete. No Apollo code or data for this page is shipped to the browser, and the browser cache knows nothing about it.

```tsx
// src/app/rsc/page.tsx
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { incrementTrackViews } from "@/lib/actions/increment-track-views";
import { query } from "@/lib/apollo/rsc-client";

/**
 * Pattern 1: React Server Component.
 * The GraphQL request happens on the server during render. The HTML arrives complete,
 * no Apollo code or data is shipped for this page, and the browser cache knows nothing about it.
 * The mutation therefore runs through a Server Action instead of useMutation.
 *
 * errorPolicy "none" is the default, but stating it narrows `data` to a defined value:
 * GraphQL errors reject the promise and land in error.tsx.
 */
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

import { updateTag } from "next/cache";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { getClient } from "@/lib/apollo/rsc-client";
import { TRACKS_TAG, trackTag } from "@/lib/cache-tags";

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
 * Same mutation, for routes that cache GraphQL responses in the Next.js Data Cache.
 * updateTag expires the tagged entries immediately, so the render triggered by this
 * click reads the new count (read-your-own-writes). revalidateTag(tag, "max") would
 * instead serve the stale entry once more while refreshing in the background.
 */
export async function incrementTrackViewsAndUpdateCache(trackId: string) {
  const result = await incrementTrackViews(trackId);
  updateTag(TRACKS_TAG);
  updateTag(trackTag(trackId));
  return result;
}
```

The detail page shows the payoff of one client per request. `generateMetadata` and the page both run `GetTrack`, and only one request leaves the server, because the second call is served from that client's cache.

```tsx
// src/app/rsc/track/[trackId]/page.tsx
import type { Metadata } from "next";
import { GetTrackDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackDetail } from "@/components/track-detail";
import { query } from "@/lib/apollo/rsc-client";
import { cache } from 'react'
type Props = PageProps<"/rsc/track/[trackId]">;

const getTrack = cache((trackId: string) =>
  query({ query: GetTrackDocument, variables: { trackId }, errorPolicy: "none" })
)
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

A route-level `loading.tsx` is the Suspense boundary. The shell streams first, the data follows.

```tsx
// src/app/loading.tsx
import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";

// Route-level Suspense boundary: the shell (header, footer) streams first, the page content follows.
export default function RouteLoading() {
  return (
    <PageContainer>
      <Loading />
    </PageContainer>
  );
}
```

This pattern needs the same `layout.tsx` with `dynamic = "force-dynamic"` as Step 7: its SSR request goes through the Client Component link, which has no Next.js options, so without the segment config the route would be prerendered at build with a stale transported cache. Copy `src/app/rsc/layout.tsx` to `src/app/suspense/layout.tsx` and rename the component.

```tsx
// src/app/suspense/page.tsx
"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { useIncrementTrackViews } from "@/lib/hooks/use-increment-track-views";

/**
 * Pattern 2: Client Component with useSuspenseQuery.
 * Rendered twice: during streaming SSR (the request runs on the server and the result is
 * streamed into the HTML alongside the markup) and in the browser, where the transported
 * result hydrates the cache so no second request is made. The route-level loading.tsx is
 * the Suspense boundary. Errors throw to error.tsx.
 */
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
// src/app/suspense/track/[trackId]/page.tsx
"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { use } from "react";
import { GetTrackDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackDetail } from "@/components/track-detail";

/**
 * Client pages receive `params` as a Promise too; unwrap it with React's `use()`.
 * If the card on the list page was clicked, the mutation response already updated
 * `Track:<id>.numberOfViews` in the cache, and cache-first serves it here.
 */
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

No `layout.tsx` here: nothing fetches on the server, so letting Next.js prerender the spinner shell at build time is correct.

**Check:** `curl -s http://localhost:3000/legacy | grep -c "Cat-stronomy"` prints `0`, and `curl -s http://localhost:3000/legacy | grep -c progressbar` prints `1`: the HTML has the spinner, not the data. In the browser, the Network tab shows a GraphQL request after hydration.

## Step 12: Pattern 6: RSC and the Next.js Data Cache

Everything so far renders on every request. Next.js can also cache the GraphQL response itself. On the server, `HttpLink` hands `fetchOptions` to Next's patched `fetch`, so the Next-only options `next.revalidate` and `next.tags` work, per query, through `context.fetchOptions`. Tags let a Server Action expire exactly the entries a mutation touched:

```ts
// src/lib/cache-tags.ts
/** Next.js Data Cache tags used by the /cached pattern and its Server Action. */
export const TRACKS_TAG = "tracks";

export const trackTag = (trackId: string) => `track:${trackId}`;
```

```tsx
// src/app/cached/page.tsx
import { GetTracksDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackGrid } from "@/components/track-grid";
import { incrementTrackViewsAndUpdateCache } from "@/lib/actions/increment-track-views";
import { query } from "@/lib/apollo/rsc-client";
import { TRACKS_TAG } from "@/lib/cache-tags";

/**
 * Pattern 6: RSC + the Next.js Data Cache.
 * Same client and query as /rsc, but the response is stored in Next's Data Cache for a
 * minute and tagged. Next.js serves the cached response and refreshes it in the background
 * (stale-while-revalidate), and the route itself is prerendered: check the build output.
 * A click runs a Server Action that calls updateTag, so the next render is fresh.
 */
export default async function CachedTracksPage() {
  const { data } = await query({
    query: GetTracksDocument,
    errorPolicy: "none",
    context: { fetchOptions: { next: { revalidate: 60, tags: [TRACKS_TAG] } } },
  });

  return (
    <PageContainer grid>
      <TrackGrid
        tracks={data.tracksForHome}
        pattern="cached"
        onOpenTrack={incrementTrackViewsAndUpdateCache}
      />
    </PageContainer>
  );
}
```

The detail page tags each track on its own:

```tsx
// src/app/cached/track/[trackId]/page.tsx
import type { Metadata } from "next";
import { GetTrackDocument } from "@/__generated__/graphql";
import { PageContainer } from "@/components/page-container";
import { TrackDetail } from "@/components/track-detail";
import { query } from "@/lib/apollo/rsc-client";
import { trackTag } from "@/lib/cache-tags";

type Props = PageProps<"/cached/track/[trackId]">;

/** One tag per track, so a Server Action can expire exactly this page. */
const getTrack = (trackId: string) =>
  query({
    query: GetTrackDocument,
    variables: { trackId },
    errorPolicy: "none",
    context: { fetchOptions: { next: { revalidate: 60, tags: [trackTag(trackId)] } } },
  });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trackId } = await params;
  const { data } = await getTrack(trackId);
  return { title: data.track.title };
}

export default async function CachedTrackPage({ params }: Props) {
  const { trackId } = await params;
  const { data } = await getTrack(trackId);

  return (
    <PageContainer>
      <TrackDetail track={data.track} />
    </PageContainer>
  );
}
```

Add the second Server Action to `src/lib/actions/increment-track-views.ts`. `updateTag` is the read-your-own-writes tool: it expires the tag immediately, so the render caused by this click is fresh. `revalidateTag(tag, "max")` is the softer alternative: serve the stale entry once more and refresh in the background.

```ts
// src/lib/actions/increment-track-views.ts
"use server";

import { updateTag } from "next/cache";
import { IncrementTrackViewsDocument } from "@/__generated__/graphql";
import { getClient } from "@/lib/apollo/rsc-client";
import { TRACKS_TAG, trackTag } from "@/lib/cache-tags";

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
 * Same mutation, for routes that cache GraphQL responses in the Next.js Data Cache.
 * updateTag expires the tagged entries immediately, so the render triggered by this
 * click reads the new count (read-your-own-writes). revalidateTag(tag, "max") would
 * instead serve the stale entry once more while refreshing in the background.
 */
export async function incrementTrackViewsAndUpdateCache(trackId: string) {
  const result = await incrementTrackViews(trackId);
  updateTag(TRACKS_TAG);
  updateTag(trackTag(trackId));
  return result;
}
```

Register the pattern in `src/lib/patterns.ts` (slug `cached`) and the header, index page, and tests pick it up.

No `layout.tsx` for this folder. The only fetch is cached, and no request-time API is read, so Next.js prerenders the route and revalidates it in the background: Incremental Static Regeneration, by opting a single fetch into the cache.

**Check:** open http://localhost:3000/cached/track/c_0 twice, incrementing the count between the two loads with the `curl` from Step 9. The second load still shows the old count: it came from the Data Cache. Now go to `/cached` and click the card. The detail page shows the fresh count: the Server Action expired the tag. `e2e/data-cache.spec.ts` automates exactly this.

## Step 13: Errors and retry

Suspense hooks and awaited RSC queries throw to the nearest `error.tsx`. `useQuery` returns `error` instead. Next 16.3 gives the boundary `retry()`, which re-fetches the route segment; `reset()` would only re-render it.

There is a trap. Apollo's suspense hooks keep a rejected result in their cache until it auto-disposes, 30 seconds by default, so `retry()` alone re-throws the same error. Refetch what is still watched first:

```tsx
// src/app/error.tsx
"use client";

import { useApolloClient } from "@apollo/client/react";
import { useTransition } from "react";
import { Button } from "@/components/button";
import { PageContainer } from "@/components/page-container";
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

**Check:** open http://localhost:3000/rsc/track/does-not-exist. In development the message is the API's `404: Not Found`. In a production build it is React error #441 plus a digest: Next.js redacts Server Component errors. Step 14 adds a test that proves recovery from a transient failure.

## Step 14: Tests

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
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

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

const PORT = 3000;

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
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

The suite in `e2e/patterns.spec.ts` checks, per pattern, that the list renders and navigates; that server-rendered routes contain the data in their HTML while `/legacy` contains the spinner; that `/suspense` makes zero browser GraphQL requests while `/legacy` makes one; that the Server Action POST happens and the counter moves; and that the `queryRef` refetch picks up a server-side change. `e2e/error-recovery.spec.ts` blocks GraphQL during a client-side navigation, lifts the block, and expects **Try again** to recover.

**Check:**

```sh
pnpm vitest run       # 6 files, 20 tests
pnpm test:e2e         # builds, starts the server, 12 tests
```

## Step 15: Build and ship

```sh
pnpm build
pnpm start
```

Read the route table the build prints. `/rsc`, `/suspense`, `/preload`, and `/background` are `ƒ (Dynamic)` because of their layout's `dynamic = "force-dynamic"`. `/`, `/legacy`, and `/cached` are static: prerendered at build, and `/cached` is refreshed in the background because its fetch opted into the Data Cache with `revalidate`. This is the classic rendering model. Next.js 16's Cache Components (`cacheComponents: true`) inverts it: everything is dynamic unless a function or component says `"use cache"`, with `cacheLife` and `cacheTag` replacing `revalidate` and `next.tags`. The `cache-components` branch of this repo shows the same app under that model.

The `.github/workflows/ci.yml` on this branch runs lint, typecheck, unit tests, and the build on every push.

**Check:** `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/rsc` prints `200` and the view counts on `/rsc` match the ones on `/suspense`.

## What you learned

- Two Apollo Clients: a per-request one for Server Components and Server Actions (`registerApolloClient`), and a provider-based one for Client Components that runs on the server for SSR and again in the browser (`ApolloNextAppProvider`). Never read the same data from both.
- `"use client"` is an import-graph boundary. Server-rendered `children` pass through Client Components untouched, which is why one provider in the root layout costs the RSC pattern nothing.
- Suspense hooks turn streaming SSR on. `useQuery` ships a spinner; `useSuspenseQuery` ships the data and a warm cache.
- `PreloadQuery` and `useBackgroundQuery` start a request before the component that needs it renders. Same idea, different side of the boundary.
- A mutation that returns the entity's `id` and the changed fields updates the normalized cache by itself. When there is no browser cache, use a Server Action.
- `errorPolicy: "none"` narrows types; `error.tsx` catches thrown errors; suspense error recovery needs a refetch before `retry()`.
- Next.js caching is decided per route and per fetch: `dynamic = "force-dynamic"` for live data, `next.revalidate` plus tags for cached data, `updateTag` in a Server Action to read your own writes.

Where to go next: read [docs/patterns.md](docs/patterns.md) for the talking points, compare with the `cache-components` branch, then try Apollo's data masking with `useFragment` and `@defer` with `SSRMultipartLink`.

The README is generated from `docs/tutorial.template.md` by `pnpm docs:readme`, which inlines the source files. Edit the template or the code, then regenerate; do not edit README.md by hand.

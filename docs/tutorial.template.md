# Tutorial: Catstronauts on the Next.js App Router with Apollo Client 4

You finished Apollo Odyssey's [Client-side GraphQL with React & Apollo](https://odyssey.apollographql.com/client-side-graphql-react). That app is a Vite single-page app: every query runs in the browser with `useQuery`. This tutorial rebuilds it on the **Next.js 16 App Router** with **Apollo Client 4** and [`@apollo/client-integration-nextjs`](https://github.com/apollographql/apollo-client-integrations), and renders the same two pages (track list, track detail) **six times, once per data-fetching pattern**, so you can compare them on live data.

By the end you will be able to:

- set up the two Apollo Client instances an App Router app needs, and explain why there are two
- fetch in a Server Component with `query()`, in a Client Component with `useSuspenseQuery`, hand a request from server to client with `PreloadQuery`, avoid waterfalls with `useBackgroundQuery`, and say when `useQuery` is still the right tool
- use every caching lever of Cache Components on purpose: `"use cache"` on a function and on a page, built-in and custom `cacheLife` profiles, `cacheTag`, `generateStaticParams`, `io()`, and the three invalidation APIs `updateTag`, `revalidatePath`, and `revalidateTag`
- run a mutation with `useMutation` and with a Server Action, from a click and from a form, validate with one Zod schema on both sides, and let the normalized cache do the update
- keep search and pagination in the URL so the server can read them, and know when component state with `useDeferredValue` is the better fit
- stream independent sections behind content-shaped skeletons, scope `loading.tsx` with a route group, and turn an API miss into a real 404
- compose an Apollo link chain (error, retry, auth headers) and manage local state with reactive variables and `@client` fields
- add a login with Better Auth: revocable sessions in SQLite, a route kept behind the session by `proxy.ts`, the session read again in a Server Component and a Server Action, and a server-owned API token handed to Apollo per operation
- ship metadata through file conventions, including Open Graph images generated from GraphQL data
- use transitions to change a suspense query's variables or call a Server Action without dropping the current UI
- animate navigations with React's `<ViewTransition>`: a shared-element morph, Suspense reveals, directional slides from transition types, and a same-route crossfade, and say why the morph only pairs on prefetched pages
- tell the cases apart: `useLayoutEffect` for DOM measurement, `useEffect` for external subscriptions, `useEffectEvent` for the latest state inside a subscription, and no effect for everything else
- handle errors, loading, and a trap in suspense error recovery
- test all of it with Vitest, Apollo's `MockedProvider`, and Playwright

**Starting point:** the finished course app on the `course` branch of this repo. **Finished result:** this `use-cache` branch, which runs the app under Next.js 16 Cache Components (`cacheComponents: true`). The `dynamic` branch is the same app under the classic rendering model with `export const dynamic`; the two cannot coexist in one app, so this tutorial marks every step where the models differ. Every step names the finished file so you can compare when stuck. **Time:** about three hours. **Prerequisites:** Node 24, pnpm 11, and the course itself.

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
| `use-cache` | The same rebuild under Cache Components: `"use cache"`, `cacheLife`, `cacheTag`, `io()`, route `/use-cache` | `git checkout use-cache` |

You are reading the `use-cache` branch. The two rendering models cannot coexist in one app, which is why they are branches; `git diff dynamic use-cache -- src` shows everything the model changes.

The reference material (pattern table, architecture diagram, interview talking points, known quirks) lives in [docs/patterns.md](docs/patterns.md).

## Contents

@@contents@@

Each step ends with a **Check**. Do the check before moving on.

## Step: Start from the course app

```sh
git checkout course
git checkout -b my-app-router
```

Look around before changing anything. The pieces you will replace: `vite.config.ts` and `index.html` (the build), `src/pages` and `react-router-dom` (routing), `@emotion/styled` and `@apollo/space-kit` (styling), Apollo Client 3 with `uri` in the constructor, and codegen's `client-preset` with its `gql()` function.

**Check:** `pnpm start` still serves the course app on port 3000. Stop it.

## Step: Replace the toolchain

Delete the files that only made sense for Vite:

```sh
git rm -r index.html vite.config.ts src/index.tsx src/pages src/react-app-env.d.ts \
  package-lock.json public/_redirects src/__generated__ src/styles.tsx \
  src/components/index.ts src/components/layout.tsx src/components/__tests__ \
  src/containers src/utils src/components/module-detail.tsx src/components/modules-navigation.tsx
```

`module-detail` and `modules-navigation` were never reachable from a route in the finished course, so they go too, together with `react-player` and the window-size hook.

Replace the dependency blocks in `package.json`. The versions here are the ones the finished branch uses; take the latest when you follow along.

@@include(package.json)@@

pnpm blocks postinstall scripts unless allowed:

@@include(pnpm-workspace.yaml)@@

Install, then add the three config files.

```sh
pnpm install
```

@@include(next.config.ts)@@

`cacheComponents: true` is the Next.js 16 rendering model: nothing is cached unless it says `"use cache"`, every route gets a prerendered static shell, dynamic data streams in under Suspense boundaries, and the old route segment configs (`dynamic`, `revalidate`, `fetchCache`) are build errors. `typedRoutes` makes `<Link href>` type-checked against the route tree. `remotePatterns` is required for `next/image` with remote URLs; restrict the paths, or the image optimizer becomes an open proxy.

@@include(tsconfig.json)@@

@@include(eslint.config.mjs)@@

`next lint` was removed in Next 16; run `eslint` directly. Finally the env example, so the endpoint can be overridden without code changes:

@@include(.env.example)@@

**Check:** `pnpm exec next --version` prints `Next.js 16.x`, and `pnpm lint` runs without complaining about the config.

## Step: Root layout and global styles

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

@@include(src/app/layout.tsx)@@

`ApolloWrapper` does not exist yet; you write it in @@step(Two Apollo Clients)@@. Leave the import in and keep going, or comment it out until then.

Port the presentational components next. Each one gets a `.module.css` next to it. None of them needs `"use client"`:

| Component | Finished file | Notes |
| --- | --- | --- |
| Header | `src/components/header.tsx` | Renders `PatternNav` (@@step(Shared UI and the pattern registry)@@). Logo through `next/image` with a static import. |
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

## Step: Describe the data: `.graphql` files and codegen

The course generated types with `client-preset` and a `gql()` function. The Apollo Client 4 recommendation is `typescript` + `typescript-operations` + `typed-document-node`, with operations in `.graphql` files. Hooks then infer their types from the document, and you never write `useQuery<Data, Vars>` generics again.

One endpoint constant, shared by codegen and both clients:

@@include(src/lib/graphql-uri.ts)@@

@@include(codegen.ts)@@

Each component owns a fragment named `Component_prop`, colocated with the component. Page queries spread those fragments, so the query mirrors the component tree.

@@include(src/components/track-card.graphql)@@

@@include(src/components/track-detail.graphql)@@

@@include(src/graphql/tracks.graphql)@@

Generate:

```sh
pnpm generate
```

**Check:** `src/__generated__/graphql.ts` exports `GetTracksDocument`, `GetTrackDocument`, `IncrementTrackViewsDocument`, and the fragment types `TrackCard_TrackFragment` and `TrackDetail_TrackFragment`. Commit the generated file; the app must build without the live API.

## Step: Two Apollo Clients

An App Router app has two module graphs. Server Components run once per request on the server and have no React context. Client Components run twice: on the server during streaming SSR, and again in the browser. Each world needs its own Apollo Client.

First, Apollo's dev messages, loaded outside production only:

@@include(src/lib/apollo/dev-messages.ts)@@

The Server Component client. `registerApolloClient` wraps your factory in React's `cache()`, so every Server Component and Server Action in one request shares an instance and identical queries are deduplicated. `import "server-only"` turns any accidental client import into a build error.

@@include(src/lib/apollo/rsc-client.ts)@@

The Client Component client. `ApolloNextAppProvider` calls `makeClient` on the server for the SSR pass and again in the browser. The `ApolloClient` and `InMemoryCache` from the integration package are subclasses that record every query result during SSR, stream it into the HTML, and replay it into the browser cache, so hydration does not refetch.

@@include(src/lib/apollo/apollo-wrapper.tsx)@@

Both factories call `createCache()` and `createLinkChain()` instead of `new InMemoryCache()` and `new HttpLink()`. Treat them as exactly that for now; @@step(Apollo local state: reactive variables and client fields)@@ and @@step(The link chain)@@ open them up.

You already render `<ApolloWrapper>{children}</ApolloWrapper>` in the layout from @@step(Root layout and global styles)@@. A common worry: does a Client Component wrapper in the root layout turn every page into a Client Component? No. `"use client"` is a boundary in the module **import** graph. A Client Component makes what it imports client code; what it receives as `children` was rendered on the server already and arrives as a slot. Context never reaches Server Components, so the provider is invisible to them.

**Check:** `pnpm build` succeeds. Then try it the wrong way: import `getClient` from `rsc-client.ts` inside `apollo-wrapper.tsx`. The build fails with a `server-only` error. Remove the import.

## Step: Shared UI and the pattern registry

All five patterns render the same components. The registry is the single source of truth for routes, the header navigation, the index page, and the end-to-end tests:

@@include(src/lib/patterns.ts)@@

`PatternNav` (`src/components/pattern-nav.tsx`) is the one Client Component in the header: it reads `usePathname()` and links every pattern to the same sub-path, so you can jump from `/rsc/track/c_0` to `/preload/track/c_0`. The pathname is runtime data, and the header is part of every route's prerendered shell, so the build fails unless the hook sits inside a Suspense boundary. `header.tsx` wraps it in `<Suspense fallback={<PatternNavLinks pathname="/" />}>`: the links prerender, the active state streams in. The index page (`src/app/page.tsx`) lists the registry; replace the placeholder from @@step(Root layout and global styles)@@ with the finished file.

`TrackDetail` (`src/components/track-detail.tsx`) is a plain Server Component that takes a `TrackDetail_TrackFragment`. The card and grid are Client Components, and the reason is instructive:

@@include(src/components/track-grid.tsx)@@

A Server Component cannot pass a closure to a Client Component; only serializable props and Server Actions cross the boundary. So the grid is a Client Component that builds the per-card closures itself, and the page passes it either the `useMutation` callback or the Server Action.

@@include(src/components/track-card.tsx)@@

Three details to notice: the click is intercepted so the increment completes before `router.push`, otherwise the detail page can render a count that is stale by one; the wait is bounded because `HttpLink` has no timeout; and modifier clicks are left to the browser so open-in-new-tab keeps working. Styles are in `src/components/track-card.module.css`.

**Check:** `pnpm typecheck` passes. Nothing renders tracks yet.

## Step: Pattern 1: RSC `query()` and a Server Action

The page is an `async` Server Component. It awaits `query()`, and the HTML arrives complete. No Apollo code or data for this page is shipped to the browser, and the browser cache knows nothing about it.

```tsx
// src/app/rsc/(list)/page.tsx, first version. The finished file also reads searchParams;
// @@step(URL state: search and pagination)@@ adds that. The (list) folder is a route group, explained in
// @@step(Streaming sections, skeletons, route groups, and not found)@@.
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

@@include(src/lib/actions/increment-track-views.ts)@@

The detail page shows the payoff of one client per request. `generateMetadata` and the page both run `GetTrack`, and only one request leaves the server, because the second call is served from that client's cache.

```tsx
// src/app/rsc/track/[trackId]/page.tsx, first version. The finished file streams two sections and
// maps unknown ids to a 404; @@step(Streaming sections, skeletons, route groups, and not found)@@ shows it.
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

Nothing else is needed for this pattern. Under Cache Components, an uncached `query()` is dynamic by definition: the build prerenders the shell (header, footer, the `loading.tsx` spinner) and streams the page in at request time. The build output marks it `◐ (Partial Prerender)`.

**Check:**

```sh
pnpm dev
curl -s http://localhost:3000/rsc | grep -c "Cat-stronomy"   # at least 1: the data is in the HTML
```

Open http://localhost:3000/rsc with the Network tab filtered to the GraphQL host: no request. Click a card. The detail page shows the view count, and the count went up (the Server Action ran).

## Step: Pattern 2: `useSuspenseQuery` and streaming SSR

The Client Component version. Add the mutation hook the client patterns share. The mutation response selects `track { id numberOfViews }`, so `InMemoryCache` updates the `Track:<id>` entity and every component reading it re-renders. No `refetchQueries`, no manual `update`.

@@include(src/lib/hooks/use-increment-track-views.ts)@@

A root `loading.tsx` is the Suspense boundary. The shell streams first, the data follows. On this branch it has to sit at the root: Cache Components require a boundary above every read of request-time data, and the pattern layouts read it with `io()` (next step), so the boundary must be above the layouts. The `dynamic` branch moves it into the pattern folders to keep a real 404 status possible on non-streamed routes; here the prerendered shell makes that moot.

@@include(src/app/loading.tsx)@@

This pattern needs one extra file, and the reason is subtle. Its SSR request goes through the Client Component link, which Cache Components cannot see, so the build would treat the route as fully static and bake the data in (try it: remove the file and read the build output). A layout that awaits `io()` keeps everything below it out of the static shell. `io()` (Next.js 16.3) suspends during prerendering and resolves at once on a request, which is all this needs. The older answer was `connection()`, and it still works, but it stays suspended until a real user navigation reaches the server, so it also blocks prefetches and any `"use cache"` content below it; the docs now say to prefer `io()` and keep `connection()` for the rare case where rendering must wait for a real user request.

@@include(src/app/suspense/layout.tsx)@@

```tsx
// src/app/suspense/page.tsx, first version. The finished file adds a client-side search;
// @@step(URL state: search and pagination)@@ shows it.
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

## Step: Pattern 3: `PreloadQuery`

Use this when the data belongs to a Client Component (it must stay live, or it drives interaction) but you want the request to start as early as possible: in the Server Component, before any client code runs, with no waterfall and no duplicate fetch.

Form one: start the query in RSC, read it with `useSuspenseQuery` using the same document and variables.

@@include(src/app/preload/page.tsx)@@

@@include(src/app/preload/tracks-client.tsx)@@

Form two: the render prop hands a `queryRef` to the child, which reads it with `useReadQuery` and gets `refetch` from `useQueryRefHandlers`. Call `useQueryRefHandlers` before `useReadQuery`.

@@include(src/app/preload/track/[trackId]/page.tsx)@@

@@include(src/app/preload/track/[trackId]/track-client.tsx)@@

Data that arrives this way is client data. Never read it from a Server Component; the integration creates a separate client for `PreloadQuery` to make that hard to do by accident. Note the `await io()` in both pages: `PreloadQuery` mints a request-scoped id with `crypto.randomUUID()`, which Cache Components reject during prerendering. That is the exact example in the `io()` reference: call it before reading a value like `Math.random()` or `crypto.randomUUID()`, and the read stays out of the static shell without holding the route hostage to a real user navigation the way `connection()` would.

**Check:** open http://localhost:3000/preload/track/c_0. Note the view count. Increment it from outside the app:

```sh
curl -s -X POST https://odyssey-lift-off-server.herokuapp.com/ \
  -H 'content-type: application/json' \
  -d '{"query":"mutation { incrementTrackViews(id: \"c_0\") { success } }"}'
```

Click **Refresh view count**. The number goes up without a full reload. You will also see a console warning about a duplicate fragment name on these pages; it is a cosmetic upstream quirk, explained in [docs/patterns.md](docs/patterns.md#known-quirks).

## Step: Pattern 4: `useBackgroundQuery`

The client-only version of preloading: the parent starts the request without suspending and passes a `queryRef` to a child that suspends on it. Use it when a parent must render before its data-bound children, or to start several queries in parallel.

@@include(src/app/background/page.tsx)@@

@@include(src/app/background/track/[trackId]/page.tsx)@@

Add `src/app/background/layout.tsx` with the same `io()` layout as @@step(Pattern 2: `useSuspenseQuery` and streaming SSR)@@.

**Check:** http://localhost:3000/background behaves like @@step(Pattern 2: `useSuspenseQuery` and streaming SSR)@@: data in the SSR HTML, no browser GraphQL request after load.

## Step: Pattern 5: `useQuery`, the course way

`useQuery` never suspends. The SSR pass renders the loading state, and the request only happens in the browser after hydration. It is still right for polling, lazy queries, and anything that must not block rendering. The course's `QueryResult` helper comes back with a render prop, so `data` is narrowed by the time your children run:

@@include(src/components/query-result.tsx)@@

@@include(src/app/legacy/page.tsx)@@

@@include(src/app/legacy/track/[trackId]/page.tsx)@@

No layout here: nothing fetches on the server, so the spinner shell is prerendered with no data in it. The build still marks the route `◐ (Partial Prerender)`, like every page, because the header's user menu streams the session in behind the shell; the page itself contributes nothing dynamic.

**Check:** `curl -s http://localhost:3000/legacy | grep -c "Cat-stronomy"` prints `0`, and `curl -s http://localhost:3000/legacy | grep -c progressbar` prints `1`: the HTML has the spinner, not the data. In the browser, the Network tab shows a GraphQL request after hydration.

## Step: Pattern 6: RSC and `"use cache"`

Everything so far streams at request time. Cache Components cache at the function or component level: mark an async function or component `"use cache"`, give it a lifetime with `cacheLife`, and a name with `cacheTag`. The return value is memoized across requests, keyed by the arguments (or props), and on a hit the body, including the GraphQL request, does not run at all. This pattern uses each lever once so you can compare them.

**Page-level `"use cache"` with a built-in profile.** The list page caches its own rendered output. `cacheLife("minutes")` is one of the built-in profiles (`seconds`, `minutes`, `hours`, `days`, `weeks`, `max`).

@@include(src/app/use-cache/page.tsx)@@

**Function-level `"use cache"` with a custom profile.** The detail data lives in a cached function tagged per track. `cacheLife("track")` is a profile declared in `next.config.ts`: `stale` is how long a client may reuse the value without asking, `revalidate` how often the server refreshes in the background, `expire` when a stale entry must block instead.

@@include(src/lib/cache-tags.ts)@@

@@include(src/lib/data/tracks.ts)@@

The detail page also exports `generateStaticParams`, which runs the list query once at build. Combined with the cached function, every known track page has its data baked in at build, which is the `1m 1h` next to each `/use-cache/track/c_*` path in the route table; unknown ids render on first request.

@@include(src/app/use-cache/track/[trackId]/page.tsx)@@

**On demand, from inside the app.** Add the second Server Action to `src/lib/actions/increment-track-views.ts`. `updateTag` expires the track's entry immediately, so the render caused by this click is fresh (read-your-own-writes). `revalidatePath` regenerates the cached list page on its next request; `updateTag(TRACKS_TAG)` through the page's `cacheTag` would do the same.

@@include(src/lib/actions/increment-track-views.ts)@@

**On demand, from outside the app.** A CMS or the GraphQL backend would call a webhook after data changes. This route handler is that webhook: `revalidateTag(tag, "max")` is stale-while-revalidate, so the next request still gets the cached entry while a fresh one is computed in the background. Next 16 requires the profile argument. Set `REVALIDATE_SECRET` in `.env.local` to enable it.

@@include(src/app/api/revalidate/route.ts)@@

Register the pattern in `src/lib/patterns.ts` (slug `use-cache`) and the header, index page, and tests pick it up.

Three rules from the docs that matter here: a `"use cache"` scope cannot read `cookies()`, `headers()`, or `searchParams`, so read them outside and pass them as arguments (`"use cache: private"` exists for the rare case where you cannot); return values must be serializable, which JSX and plain data are and an Apollo client or queryRef is not; and `React.cache` cannot pass data into the scope, which is fine for `registerApolloClient` because it only memoizes the client, and a fresh one inside the scope makes the same request.

**Check:** open http://localhost:3000/use-cache/track/c_0 twice, incrementing the count between the two loads with the `curl` from @@step(Pattern 3: `PreloadQuery`)@@. The second load still shows the old count: the cached function did not run. Now go to `/use-cache` and click the card. The detail page shows the fresh count: the Server Action expired the tag. Then, with `REVALIDATE_SECRET=test` in `.env.local` and the server restarted, increment again and run:

```sh
curl -s -X POST "http://localhost:3000/api/revalidate?tag=track:c_0&secret=test"
```

Reload the detail page twice: the first load may still be stale, the second is fresh. `e2e/data-cache.spec.ts` and `e2e/revalidate-route.spec.ts` automate both flows.

## Step: URL state: search and pagination

The list has thirteen tracks and the API has no arguments, so filtering and paging happen in the app. Where the current query lives is the design decision, and both answers are on the branch.

**URL state, read on the server.** On `/rsc` the query string is the state. The Server Component reads `searchParams` (a Promise in Next 16), filters and slices the list, and renders. The search box only rewrites the URL; the page re-renders because the URL changed. The result is shareable, bookmarkable, and visible to the server, which is what makes it the default choice. The pure helpers first:

@@include(src/lib/search.ts)@@

A debounce keeps a keystroke from becoming a server round trip; it fits in one hook:

@@include(src/lib/hooks/use-debounced-callback.ts)@@

The search box uses `router.replace` so typing does not fill the history, resets the page so a shorter result set cannot land on an empty page, and reads its initial value from the URL. `useSearchParams` is request-time data, so the page renders it inside a Suspense boundary with a same-size fallback.

@@include(src/components/search-box.tsx)@@

Pagination is navigation, so it is plain links: they work before hydration and with JavaScript off.

@@include(src/components/pagination.tsx)@@

@@include(src/app/rsc/(list)/page.tsx)@@

**Component state, filtered in the browser.** On `/suspense` the whole list is already in the browser cache, so a filter needs no navigation. `useDeferredValue` lets the input update on every keystroke while the filtered list re-renders at lower priority, and the stale results are dimmed until the new ones are ready. Instant, but invisible to the server and not shareable.

@@include(src/components/client-search.tsx)@@

@@include(src/app/suspense/page.tsx)@@

**Check:** on http://localhost:3000/rsc, page links show at the bottom and `/rsc?page=2` renders the second page. Type "kitty": after a pause the URL becomes `/rsc?query=kitty` and the Network tab shows the RSC request that re-rendered the page. On http://localhost:3000/suspense, typing filters immediately with no request and no URL change. `e2e/search.spec.ts` computes its expectations from the live catalog with the same filter.

## Step: Streaming sections, skeletons, route groups, and not found

Four App Router conventions, on the RSC detail page and its list.

**Sections that stream on their own.** The page awaits nothing but `params`. Each section is an async Server Component in its own `<Suspense>`, so the two queries start in parallel and each streams in behind a fallback shaped like the content, whichever finishes first. If one component needed both results, `await Promise.all([...])` is the way; two sequential `await`s in one component is the Server Component waterfall.

@@include(src/app/rsc/track/[trackId]/page.tsx)@@

**Skeletons.** A fallback that has the content's dimensions keeps the layout from jumping when the real markup arrives. These are Server Components: no state, no handlers.

@@include(src/components/skeletons.tsx)@@

**A route group to scope `loading.tsx`.** The list page moved into `src/app/rsc/(list)/page.tsx`. Folders in parentheses never appear in the URL; the page is still `/rsc`. The point is that a `loading.tsx` inside the group wraps only the list, so the grid skeleton does not also wrap `/rsc/track/[trackId]`, which has its own boundaries.

@@include(src/app/rsc/(list)/loading.tsx)@@

**Not found.** The Odyssey API is Apollo Server in front of a REST service, so an unknown id is an HTTP 200 carrying a GraphQL error whose `extensions.response.status` is 404. Map that to Next's `notFound()`:

@@include(src/lib/apollo/not-found.ts)@@

@@include(src/app/not-found.tsx)@@

Server Component pages call it in the render path (the `.catch(rethrowAsNotFound)` above). Client Component patterns throw the same GraphQL error in the browser, and `error.tsx` renders the same `NotFoundMessage` when `isNotFoundError` is true.

One more rule on this branch: errors leave a `"use cache"` scope as plain errors, so Apollo's branded class cannot be checked outside it, and `notFound()` must not be thrown inside one. `getCachedTrack` in `src/lib/data/tracks.ts` therefore catches the 404 inside the scope and returns `null`, a perfectly cacheable answer, and the `/use-cache` page calls `notFound()` when it sees it.

There is a trade-off to say out loud. Under Cache Components every route with request-time data has a prerendered shell that is served with a 200 before anything runs, so a data-driven `notFound()` can only render in place: the user sees the 404 UI, the status code says 200. The classic model's escape hatch, `dynamicParams = false`, is not available here (the build rejects it); the migration guide's answer is exactly this `notFound()` in the page. If a route genuinely needs a 404 status, keep it on the classic model, as the `dynamic` branch does with `/revalidate`. The root `loading.tsx` stays; the list and the RSC detail route override it with skeleton-shaped `loading.tsx` files (`src/app/rsc/(list)/loading.tsx`, `src/app/rsc/track/[trackId]/loading.tsx`).

**Check:** `curl -s -o /dev/null -w "%{http_code}" localhost:3000/use-cache/track/nope` and `/rsc/track/nope` both print `200`, and both pages show the not-found message in place. Compare `/revalidate/track/nope` on the `dynamic` branch, which prints `404`. Throttle the network on http://localhost:3000/rsc/track/c_0 and reload: two skeletons, then each section fills in. `e2e/not-found-and-streaming.spec.ts` proves the stream order from the raw HTML.

## Step: Forms: a Server Action and a client mutation

The card click showed both ways to run a mutation. Forms make the difference easier to see, and they need validation, so each detail page gets a form with a "views to register" field. Install Zod (`pnpm add zod`) and write the schema once:

@@include(src/lib/schemas/register-view.ts)@@

The same function runs in the browser before a submit and on the server inside the action or, for the client form, next to the GraphQL server's own validation. `FormData` values are strings, which is what `z.coerce` is for.

**The Server Action form.** The action has the `(previousState, formData)` shape that `useActionState` expects, validates again, returns errors as state instead of throwing, and runs one mutation per view with the RSC client. The `revalidatePath` call is not optional: an action that revalidates nothing returns only its value and Next.js does not re-render the route. With it, the same response carries the re-rendered page, so `TrackDetail` shows the new count in one roundtrip. Under Cache Components the RSC route is a Partial Prerender; the re-render streams the dynamic part again. The session check and the `context` on the mutation come from @@step(Authentication: Better Auth, the proxy, and the session in Server Actions)@@; ignore them until then.

@@include(src/lib/actions/register-view.ts)@@

The form component is a Client Component because it holds state, but the mutation runs on the server. `onSubmit` validates with Zod and calls `preventDefault` on failure, so invalid input never dispatches the action. With JavaScript disabled the browser submits natively and only the server-side validation runs; the form still works.

It also shows `useOptimistic`, React's counterpart to Apollo's `optimisticResponse` for Server Actions. The hook takes the server-rendered count as its base value and a reducer; calling `addViews` inside the form action shows the expected count immediately, and React discards the optimistic value when the action settles. What replaces it is whatever the re-rendered page passes in: the new count on success, the old one if the action failed. Two rules: the update must happen inside a transition or action, which a form action is, and the base value must come from the server, or there is nothing to fall back to.

The rollback is the part worth understanding. A failed action registers nothing and revalidates nothing, so the page does not re-render and the prop is unchanged; React discards the optimistic value by itself and the count is honest again, with no cleanup code. That is the difference from Apollo's `optimisticResponse`, where the client has to undo a cache write. `e2e/forms.spec.ts` proves it against the real server by signing in, clearing the session cookie, and submitting: the action refuses, the count snaps back, and the refusal shows.

@@include(src/components/register-view-form.tsx)@@

Render it under `TrackDetail` in `src/app/rsc/track/[trackId]/page.tsx`, passing `numberOfViews` from the query result.

**The all-client form.** This one runs the same mutation from the browser with `useMutation`, once per view, in parallel. Three Apollo features do the work: `useFragment` subscribes to the `Track` entity in the normalized cache, so the count in the form is the same object `TrackDetail` renders; `optimisticResponse` writes the expected result before the server answers, then the real response replaces it, or a failure rolls it back; and the error branch shows the typed errors Apollo Client 4 returns (`CombinedGraphQLErrors` when the GraphQL server rejects the input, `ServerError` for HTTP failures). The fragment is colocated like the others:

@@include(src/components/register-view-client-form.graphql)@@

@@include(src/components/register-view-client-form.tsx)@@

Run `pnpm generate`, then render it under `TrackDetail` in `src/app/suspense/track/[trackId]/page.tsx`.

**Check:** on http://localhost:3000/rsc/track/c_0, enter `9` and submit: the message appears and the Network tab shows no request. Enter `2` with the network throttled: the form's "Server count" jumps by two at once and says "(pending)", then one POST to the page with a `next-action` header and no GraphQL request from the browser, and the count in the details box goes up by two when the page re-renders. On http://localhost:3000/suspense/track/c_0, enter `2`: two GraphQL POSTs from the browser, and both counts (details box and "Cache says") move at once, before the responses arrive. Stop the API with DevTools offline mode and submit again: the count reverts and the error shows. `e2e/forms.spec.ts` covers both forms; the unit tests cover the schema, the Server Action (with `server-only` and the client mocked), and the optimistic update and rollback with `MockedProvider`.

## Step: Transitions: keep the old UI while the new one loads

A transition tells React that a state update may take a while and that the current UI should stay on screen until the new one is ready. Three places on this branch already use `useTransition` without much ceremony: the card click awaits the mutation before navigating, the preload page's **Refresh view count** wraps `refetch()`, and `error.tsx` wraps `retry()`. The two components below make the effect visible.

**A suspense query whose variables change.** This is the case transitions exist for in Apollo. Changing the select gives `useSuspenseQuery` new variables, so the component suspends again. Without `startTransition`, the nearest Suspense fallback replaces the preview until the data arrives. Inside `startTransition`, React keeps the previous preview on screen and only swaps when the new one is ready, and `isPending` lets you dim it. The checkbox switches between the two so you can watch the difference.

@@include(src/components/track-preview.tsx)@@

Render it under the client form in `src/app/suspense/track/[trackId]/page.tsx`.

**A Server Action from a button.** React 19 transitions accept an async function, and `isPending` stays true until everything inside has settled. That fits a Server Action called outside a form: await it, then `router.refresh()` to re-fetch the route's RSC payload in the same transition. The page updates in place, with no form and no fallback. Under Cache Components the refresh re-streams the route's dynamic part; the static shell is untouched.

@@include(src/components/quick-view-button.tsx)@@

Render it under `TrackDetail` in `src/app/rsc/track/[trackId]/page.tsx`.

**Check:** on http://localhost:3000/suspense/track/c_0, throttle the network in DevTools, then change the preview select. The old preview dims and stays until the new one lands. Untick the checkbox and change it again: the "Loading preview..." fallback flashes instead. On http://localhost:3000/rsc/track/c_0, click **Quick +1 view**: the button shows its pending label, the Network tab shows the `next-action` POST followed by the RSC refresh, and the count in the details box changes. `e2e/transitions.spec.ts` proves both, slowing GraphQL down with `page.route` so the pending state is observable.

## Step: View transitions: continuity between pages

A route change replaces the whole page at once. Nothing on screen says that the thumbnail you clicked and the cover you are now looking at are the same image. React's `<ViewTransition>` drives the browser's View Transitions API declaratively: you name what should persist, or describe how a subtree enters and exits, and React calls `document.startViewTransition` itself. Only Transitions, Suspense, and `useDeferredValue` activate it; App Router navigations are transitions, so most of this works from navigation alone.

Two facts about the API before the code. Inside Next.js, `ViewTransition` is a plain export of `react`, because the App Router bundles React's canary channel: no flag, nothing to install. The npm `react` package and `@types/react` still keep it behind the canary entry, so one file references those types and the test setup gives Vitest a pass-through version. Without browser support nothing breaks: the app works and the animations do not play.

@@include(src/types/react-canary.d.ts)@@

@@include(vitest.setup.ts)@@

The Next.js guide has four patterns. Each lands where it fits this app.

**Shared element: the card cover morphs into the detail cover.** `TrackCard` and `TrackDetail` wrap their image in a `<ViewTransition>` with the same `name`, unique per track. When the destination page renders in the navigation's commit, React pairs the two and the browser animates size and position from one to the other. `share="morph"` names the class the CSS customizes; `default="none"` keeps the named image from crossfading on every unrelated transition. Keep the explicit `share` when you add `default="none"`, or the pair silently stops morphing.

@@include(src/components/track-card.tsx)@@

Where the pair forms is a caching question, which is why this step belongs in this tutorial. `/use-cache` pages are cached output inside the static shell and prefetched whole, so the detail renders in the same commit and the morph plays. `/rsc/track/[trackId]` suspends into its skeleton first, so no pair forms and the cover arrives with its section's enter animation. `/suspense` behaves the same way, for an Apollo reason: `GetTrack` selects fields the list query did not fetch, so `useSuspenseQuery` suspends. A cache that already held every field would render in the commit and morph.

**Suspense reveal: the skeleton leaves, the content arrives.** On the RSC detail page each fallback gets an exit class and each section an enter class. Two boundaries rather than one around the `<Suspense>` make the swap an exit plus an enter instead of a crossfade of one snapshot.

Where the boundary sits decides which reveal you can animate. On this branch a `loading.tsx` sits above this page, because Cache Components needs a boundary over its request-time reads, so a navigation shows that fallback first and the page usually lands with its sections already resolved: the reveal is one untyped transition, a plain crossfade, and the inner exit and enter classes only get to play when the API is slower than the page. The `dynamic` branch has no boundary above this page; there the navigation commits the page with its skeletons and each section's reveal animates on its own.

@@include(src/app/rsc/track/[trackId]/page.tsx)@@

**Directional navigation: transition types.** A type tags a navigation with its meaning. The card attaches `nav-forward` in `router.push`, the back link attaches `nav-back` through `<Link transitionTypes>`, and a wrapper on each participating page maps the types to classes. Browser back and forward, `router.refresh()`, and Suspense reveals carry no type and fall through to `default: "none"`. The wrapper goes in the page, not the layout, because layouts persist across navigations, so enter and exit never fire there.

@@include(src/lib/navigation-types.ts)@@

@@include(src/components/page-transition.tsx)@@

@@include(src/components/back-link.tsx)@@

The header gets a `viewTransitionName` and CSS that pins it, so it stays put while the page slides. One fixed reference is what tells the eye that the content moved, not the viewport.

**Same place, different content: a keyed crossfade.** The client search on `/suspense` keys its results by the deferred query and names them. When the key changes, React deletes the old list and inserts the new one, pairs them by name, and the browser crossfades. `useDeferredValue` is what activates it; no navigation is involved. The cards remount on every change, which is the cost of keying. An `update` class on an unkeyed wrapper would crossfade one snapshot and keep the instances.

@@include(src/components/client-search.tsx)@@

All the motion is CSS, in the view-transitions section at the end of `src/app/globals.css`, keyed by the classes the components name. Old content leaves fast and new content arrives more gently, the `::view-transition` overlay lets clicks through, and `prefers-reduced-motion` zeroes every duration.

**Check:** on http://localhost:3000/use-cache click a card: the cover grows into the detail cover while the page slides left. Click **All tracks**: the page slides right and the cover shrinks back into its card. On http://localhost:3000/rsc click a card: the page slides in showing the route's loading skeleton, the content crossfades over it, and the cover does not morph. On http://localhost:3000/suspense type in the filter box: the results crossfade. Press the browser's back button anywhere: no slide, the browser navigation carries no type. Enable **Emulate CSS media feature prefers-reduced-motion** in DevTools and everything snaps. `e2e/view-transitions.spec.ts` records every `document.startViewTransition` call with its types and, with the durations stretched by an injected stylesheet, catches the running animations by name: `vt-blur` proves the morph pair formed on `/use-cache`; on `/rsc` it checks the slide and the second, untyped transition of the reveal.

## Step: Activity: hide a component instead of destroying it

`{isOpen && <Panel />}` is the reflex for showing and hiding, and it is destructive: unmounting throws away the component's state, its DOM, and anything it had fetched. React's `<Activity>` is the non-destructive version. `mode="hidden"` keeps the children mounted, hides them with `display: none`, and cleans up their Effects, so conceptually they are unmounted, except that everything is still there when you come back.

That buys two separate things, and the component below is built so you can watch both against the unmounting version with one checkbox.

**State and DOM survive.** The draft note is an uncontrolled `<textarea>`: React is not holding that string anywhere, it lives in the DOM node. Unmount the panel and it is gone; hide it and the same node is still in the document with the text still in it. This is why Activity suits tabs, filter panels, and wizards, where throwing away what the user typed is the wrong default.

**Hidden content still renders, so its data arrives early.** Children of a hidden Activity render at a lower priority, and a query underneath one starts while the tab is still hidden. The quick look suspends on `GetTrack` for a track this page has not fetched, so Apollo is already in flight before the first click and there is nothing left to wait for. Note where the Suspense boundary sits: above both Activities, as in React's own example. A hidden Activity that suspends does not trip it, which is what keeps the pre-render invisible.

@@include(src/components/activity-tabs.tsx)@@

Render it under the detail on `src/app/background/track/[trackId]/page.tsx`, in its own Suspense boundary so the detail above does not wait for the track list.

This is the same goal as this route's `useBackgroundQuery`, reached from the other end. `useBackgroundQuery` starts a request early by hoisting the hook; Activity starts it early by rendering the whole component early. Reach for the hook when you know exactly which query to warm, and for the boundary when you want a whole subtree ready.

One honest limit, and it is Apollo's rather than React's: unmounting does not reliably send the quick look back to a loading state. Apollo keeps a resolved query ref in its suspense cache for a while after unmount, so remounting inside that window does not suspend. The difference you can always rely on is structural, and it is the one the tests assert: with Activity the hidden panel exists, and without it there is no panel at all.

**Check:** on http://localhost:3000/background/track/c_0, open the Network tab and reload. A `GetTrack` request goes out for a track you have not opened: that is the hidden tab. Type into the draft note, switch to **Quick look** (it appears with no fallback), and switch back: the draft is still there. Untick the box and repeat: the draft is gone, and in the Elements panel the hidden panel is no longer in the document at all. `e2e/activity.spec.ts` asserts all three, and `src/components/activity-tabs.test.tsx` covers the same behaviour in jsdom.

Next.js is already doing this for you one level up on this branch: Cache Components hides whole routes with Activity instead of unmounting them, so page state survives back and forward navigation with no work from you. That is the router's doing, not this component's. Using `<Activity>` directly is what you reach for inside a page, and it is why this step behaves identically on the `dynamic` branch, where the router does none of it.

## Step: Effects: useLayoutEffect, useEffect, useEffectEvent, and no effect at all

Effects are for synchronizing with something outside React. Most of the code you have written so far needed none, and that is the point of this step: know the cases that do, keep the reactive part of an effect apart from the part that only needs the latest values, and recognize the cases that do not need an effect at all.

The header's pattern navigation gets a bar that slides under the active link. Positioning it means reading the DOM (`offsetLeft`, `offsetWidth`), which React cannot know during render.

@@include(src/components/pattern-nav.tsx)@@

**`useLayoutEffect`: read layout, set state, and never paint in between.** It runs after React commits the DOM but before the browser paints. The indicator is hidden until it has been measured for the current pathname, so measuring in a layout effect means the user never sees the unmeasured frame. Change it to `useEffect` and every navigation paints one frame with the bar hidden or at its old position, then a second frame with it moved: a blink. That is the whole rule: `useLayoutEffect` only when a DOM measurement has to change what is painted, because it blocks painting.

**`useEffect`: subscribe to an external system, and clean up.** The resize listener re-measures when the viewport changes. Nothing about it has to happen before paint, so the non-blocking effect is correct, and the returned function removes the listener when the component unmounts. Other legitimate uses: analytics pings, connecting to a socket, syncing with a third-party widget. Neither effect runs on the server; React 19 no longer warns about `useLayoutEffect` during SSR, it simply does nothing there, which is why the server HTML carries `data-measured="false"` and the indicator appears on hydration. Under Cache Components the static shell contains the prerendered fallback nav, so the bar appears once the real nav streams in and hydrates.

**`useEffectEvent`: the latest values inside an effect, without re-running it.** The listeners need `measure`, and `measure` changes with the pathname. Put it in the dependency array and every navigation removes and re-adds both listeners: busywork here, a reconnect if the external system were a socket or a third-party widget. Leave it out and the handler keeps the `measure` from the first render, so a resize after navigating measures the wrong link. Neither is what you mean. The subscription belongs to the component's lifetime; only the handler's logic is reactive. `useEffectEvent` (stable since React 19.2) wraps `measure` in a function that always calls the latest version and is not a dependency, so the effect runs once and still measures the pathname that is current when the event fires. Three rules: call an Effect Event only from inside an effect (calling it during render throws), never pass it to a child or another hook, and keep the values that should re-run the effect as ordinary dependencies. `src/components/pattern-nav.test.tsx` pins both halves: one `resize` subscription across a navigation, and a resize after it measuring the new pathname.

Not every "latest value" problem is an Effect Event. `src/lib/hooks/use-debounced-callback.ts` also keeps the latest callback, but it is called from an event handler and a timer, never from an effect, so it holds the callback in a ref that an effect updates. That is the older pattern, and outside effects it is still the right one.

**No effect: the cases that look like effects but are not.** Every one of these is already in the repo:

| Temptation | Do this instead | In this repo |
| --- | --- | --- |
| Fetch data in `useEffect` after mount | Fetch during render with Suspense hooks, or in a Server Component | Every pattern page; nothing in `src/` fetches in an effect |
| Compute derived state in an effect and store it | Compute it during render | `others` in `TrackPreview`, `active` in `PatternNav` |
| React to a click or submit in an effect | Do the work in the handler | Both forms and `TrackCard` |
| Reset state when a prop changes | Give the component a `key` so React remounts it | Add `key={trackId}` to a component that keeps per-track state |
| Read an external store's value in an effect | `useSyncExternalStore` | `src/lib/viewport-store.ts`, read by `ViewportPanel`, below |
| Notify the parent from an effect | Call the callback in the handler that caused the change | `onOpen` in `TrackCard` |

**`useSyncExternalStore`: state that lives outside React.** The last row deserves its own component, because the App Router makes it sharper than the React docs do. An external store is state React does not own and is not told about: the viewport, `localStorage`, a socket, anything with its own listeners. The instinct is an effect that reads the value and calls `setState`, which renders once with a placeholder and corrects itself after paint, and lets two components reading the same store disagree inside one commit. `useSyncExternalStore` closes both: React reads the store during render and re-checks it before committing.

The store is a plain object, and nothing about it is React-specific.

@@include(src/lib/viewport-store.ts)@@

Note what is *not* at module scope. `window.matchMedia` runs on first use, because this module is reachable from the server's module graph and touching `matchMedia` on import would crash the render.

The hook takes three arguments and the third is the one that matters here.

@@include(src/components/viewport-panel.tsx)@@

Render it under `QueryResult` in `src/app/legacy/track/[trackId]/page.tsx`.

**`getServerSnapshot` is not optional, and it is a decision.** Omit it and React throws during SSR: *"Missing getServerSnapshot, which is required for server-rendered content."* It cannot guess, because there is no browser. But supplying it does not make the problem go away, it just moves it somewhere you control: the server emits one HTML document that any screen may hydrate, so whatever constant you return will be wrong for some visitors. React hydrates with the server value, re-reads `getSnapshot`, and re-renders with the truth, which the user sees as a flash of the wrong layout. Choose the value most of your traffic hydrates into, and keep anything that must be correct on first paint in a CSS media query, which needs no JavaScript and no snapshot.

The other trap is `getSnapshot`. It must return the same value, by `Object.is`, for as long as the store has not changed. Returning `{ isNarrow: mql.matches }` builds a new object every call, React decides the store changed, and it renders forever. A boolean is safe for free; an object has to be cached.

**Check:** on http://localhost:3000/legacy/track/c_11, both readouts say **wide** on a desktop. Narrow the window past 768px: **This browser, now** flips to narrow while **Server snapshot** does not, and nothing in the component holds state. Now run `curl -s localhost:3000/legacy/track/c_11 | grep data-viewport` from a terminal: the markup says `wide` no matter what your window is doing, because the server was never asked. `e2e/viewport-store.spec.ts` proves exactly that pair, fetching the HTML with no browser and then loading the same URL in a 480px one. `src/components/viewport-panel.test.tsx` renders it with `renderToString` and no `matchMedia` at all, so if the server render ever reached for the browser the test would throw.

**Check:** on http://localhost:3000/rsc, the bar sits under **RSC query()**. Click another pattern: the bar slides to it and never blinks. Open React DevTools, change `useLayoutEffect` to `useEffect` in `pattern-nav.tsx`, and navigate again with the browser throttled to a slow CPU: a frame without the bar appears. `e2e/layout-effect.spec.ts` checks that the bar's bounding box matches the active link before and after a client navigation. In the Chrome console, `getEventListeners(window).resize.length` stays at 1 while you navigate between patterns; put `measure` back in the dependency array and watch it get removed and re-added on every click.

## Step: Apollo local state: reactive variables and client fields

"How do you handle state that is not on the server?" has two Apollo answers, and the favorites feature uses both.

**A reactive variable.** It lives outside the cache, any code can read or set it, and every subscriber re-renders when it changes. It is a module singleton, so on the server it would be shared by every request; read it only in Client Components.

@@include(src/lib/apollo/favorites.ts)@@

`useReactiveVar` is the direct subscription. The card button and the header badge use it, and they work on every pattern, including RSC pages whose tracks never enter the browser cache:

@@include(src/components/favorite-button.tsx)@@

**A client-only field.** `Track.isFavorite` exists in no server schema. A field policy on the cache computes it, and because the read function calls the reactive variable, the cache re-broadcasts to every watcher of the field when the variable changes. Both clients share the cache factory:

@@include(src/lib/apollo/cache.ts)@@

Fragments select it with `@client`, which Apollo strips before the request leaves. Codegen needs to know the field exists, so the client schema extends the server one:

@@include(src/graphql/client-schema.graphql)@@

@@include(src/components/favorite-status.graphql)@@

@@include(src/components/favorite-status.tsx)@@

The trade-off between the two reads: the variable works anywhere, the cache field only where the entity is in the browser cache, but the cache field composes with queries and fragments like any other field.

**Check:** on http://localhost:3000/rsc, click a heart: the header badge appears. Switch to useSuspenseQuery with the nav and open that track: the status line reads "In your favorites" through the `@client` field. Reload the page: favorites are gone, because a reactive variable is memory, not storage. `src/components/favorite-status.test.tsx` seeds a cache and proves the field re-renders when the variable changes.

## Step: The link chain

Every request from either client goes through the same chain of links. Links run left to right on the way out and right to left on the way back, so the order is part of the design.

@@include(src/lib/apollo/links.ts)@@

- `ErrorLink` observes every failure without swallowing it; the hook or the awaiting caller still receives the error.
- `RetryLink` re-sends transient failures with exponential backoff and jitter. `shouldRetry` is the interesting part: never a mutation (not idempotent), never a GraphQL error (deterministic), never a 4xx (the client's fault).
- `SetContextLink` merges this client's fixed headers with whatever the operation carried in its own `context.headers`. That per-operation slot is where a session token goes, and it is the only place auth enters the chain: configuring a token on the client itself would mean reading cookies on every operation, which would drag every cached and static route that shares the RSC client into dynamic rendering. The Server Action in @@step(Authentication: Better Auth, the proxy, and the session in Server Actions)@@ attaches it at the call site instead. The browser client sets no custom headers at all, because each one would need CORS approval from the API and it has no token to send.
- `HttpLink` performs the request and must be last.

**Check:** open http://localhost:3000/suspense with DevTools offline, then go back online and reload: the console shows the ErrorLink entries and the request succeeds on a retry. `src/lib/apollo/links.test.ts` pins the retry policy.

## Step: Authentication: Better Auth, the proxy, and the session in Server Actions

The Odyssey API is public and ignores an `Authorization` header, so nothing in this step can be enforced by the server you talk to. What it shows is everything on the Next.js side of a login: email-and-password sign-in, a session stored as a row and keyed by an HttpOnly cookie, a route kept behind that session by `proxy.ts`, the session read again in a Server Component and in a Server Action, and an API token handed to Apollo per operation. Swap SQLite for Postgres and the upstream for an API that checks bearer tokens, and the shape does not change.

Install Better Auth (`pnpm add better-auth`). It signs the cookie with `BETTER_AUTH_SECRET`: `.env.development` carries a development-only value that `next dev` loads, and production sets its own (`npx auth secret`). Unlike Auth.js, a missing secret throws at startup rather than degrading, so a misconfigured deployment does not boot at all.

**Sessions are rows, not a cookie payload.** This is the decision worth understanding before any code. Auth.js with a credentials provider can only use its JWT strategy: the session lives in the cookie as an encrypted JWE, which is genuinely opaque to the browser but cannot be revoked, because there is nothing on the server to delete. Better Auth stores sessions in a table and the cookie holds an identifier, so signing out is a `DELETE`, `revokeSession` exists, and a role change takes effect on the next request. The cost is a database, and a lookup per verified read.

`node:sqlite` makes that cost small enough for a demo: it ships with Node 22.5+, so there is no dependency to install and no native build.

@@include(src/lib/auth/db.ts)@@

@@include(src/lib/auth/demo-account.ts)@@

The login schema works like the register-view one: run in the browser before the submit and again in the Server Action. A `redirectTo` that is not a relative path is dropped rather than reported, because a fresh session must never follow an absolute URL to another site. `paths.ts` also holds `proxyRedirect`, the proxy's entire decision as a pure function.

@@include(src/lib/schemas/login.ts)@@

@@include(src/lib/auth/paths.ts)@@

**One configuration, not two.** The Auth.js version split its config so the proxy could run half of it without dragging in the credentials provider. Nothing here needs that: `proxy.ts` decides from the cookie with a pure function and imports none of this, so the config is one file.

The `accessToken` field is the heart of this step, so read its comment before moving on. `input: false, returned: false` makes it genuinely server-owned: never accepted from a request body, never written to a response body. The `session.create.before` hook mints it once per sign-in, which is where the Auth.js `jwt` callback used to do the same job.

@@include(src/lib/auth/auth.ts)@@

`auth.api` is the whole surface: every endpoint Better Auth serves over HTTP is also a function, which is why the Server Actions never post to their own app.

Reading a session takes the request headers, so one helper stands in for the single `auth()` export Auth.js had. It lives in its own module to keep `next/headers` out of `auth.ts`, which `instrumentation.ts` imports at server start, outside any request:

@@include(src/lib/auth/session.ts)@@

**Why the token is not on the session object.** The obvious place for an API token is the session, and under Auth.js that was a trap. One `session` callback fed both `auth()` and the public `GET /api/auth/session`, with no way to tell them apart, so a field added for a Server Action was published to the browser in the same move: the HttpOnly cookie protected a session whose own endpoint handed out the credential derived from it. Better Auth's `returned: false` is the thing Auth.js had no way to say.

It is thorough, too. The field is hidden from `auth.api.getSession()` as well, so reading it has to be deliberate:

@@include(src/lib/auth/access-token.ts)@@

One warning for later. `customSession`, Better Auth's plugin for reshaping the session response, has exactly the same shape as the old Auth.js callback and would reintroduce the leak in full. The schema flag is the mechanism that fixes it; the plugin is not.

**Schema and seed, once per server.** Better Auth needs its four tables before anything reads a session. `instrumentation.ts` runs once per server instance and finishes before the first request, which is the right hook for it, and it lets Next.js resolve the imports. The migration diffs rather than guesses, so adding a field to `auth.ts` is picked up by the next start; that is also why `validateSchema` is off, since a check that runs before this function can only ever fire spuriously.

@@include(src/lib/auth/migrate.ts)@@

@@include(src/instrumentation.ts)@@

**The Route Handler and the proxy.** The handler is mounted unwrapped, which is only safe because of `returned: false`; the proxy reads the cookie and nothing else. Mounting the catch-all publishes every endpoint the config enables, so it is worth reading that list once: `emailAndPassword` brings a sign-up route with it, which the credentials provider never had, and `disabledPaths` closes it without disabling the feature the seed needs.

@@include(src/app/api/auth/[...all]/route.ts)@@

@@include(src/proxy.ts)@@

`getSessionCookie` does not verify the cookie or touch the database, and that is correct twice over: it is the optimistic check both auth guides describe, and the Next.js docs warn that `proxy.ts` may be deployed to a CDN and should not rely on shared modules, which a `node:sqlite` handle very much is.

Notice what the proxy does *not* do: it never redirects a cookie-holder away from `/login`. The temptation is strong, and it is a trap, because the signal is presence and not validity. A cookie whose row is gone (signed out elsewhere, the gitignored database recreated) still reads as signed in here, so that redirect would send it to `/account`, which verifies for real, finds nothing, and sends it back to `/login`: a loop with the sign-in form on the far side of it. The rule that falls out is worth keeping: an unverified check may send someone *to* a verification, never away from one. The login page does its own check, below.

**Sign in and sign out.** The action has the `useActionState` shape from @@step(Forms: a Server Action and a client mutation)@@. `auth.api.signInEmail` runs in-process; wrong credentials arrive as an `APIError` with status `UNAUTHORIZED`, which becomes state; then the action calls `redirect()` itself, so the flow reads top to bottom. The `nextCookies()` plugin is what actually lands the cookie, because a Server Action cannot set one by returning a header.

One thing to know before copying this shape into something real: calling `auth.api.*` in-process skips the router, and the router is where Better Auth's rate limiting lives. The HTTP endpoints are throttled in production and this action is not, so a real login would add its own throttle here. The demo's credentials are printed on the page, so there is nothing to guess.

@@include(src/lib/actions/auth.ts)@@

@@include(src/components/login-form.tsx)@@

@@include(src/app/login/page.tsx)@@

**The protected page.** The proxy already turned strangers away, but the page calls `getSession` again, next to the data it renders. That is the defense in depth the guide asks for, and here it is load-bearing rather than ceremonial: this call verifies the signature and loads the row, so a session revoked since the last request fails here even though its cookie satisfied the proxy.

@@include(src/app/account/page.tsx)@@

**The session in a Server Action.** `registerView` from the forms step refuses to run without a session, reads the API token with `readAccessToken`, and passes it to Apollo as per-operation `context`; the `SetContextLink` from @@step(The link chain)@@ merges those headers with its own. The token is attached at the call site rather than configured on the client on purpose: reading the session reads cookies, and the RSC client is shared with cached and static routes, where a cookie read is a build error or a silent switch to dynamic rendering. Passing it per operation keeps the decision where the session is.

@@include(src/lib/actions/register-view.ts)@@

The track page reads the session inside the same Suspense boundary as the track, so the cookie read never blocks the shell, and it shows a sign-in link instead of the form when there is no session:

@@include(src/components/sign-in-prompt.tsx)@@

**The user in the header.** This is where Cache Components pays off. The header is part of every route's static shell, and a session read is request data, so `UserMenu` sits in a Suspense boundary: the shell prerenders with a plain **Account** link and the user's name streams in behind it, on static and cached routes alike. The `dynamic` branch cannot do this; a cookie read in the root layout would make every route dynamic there, so it keeps the plain link.

@@include(src/components/user-menu.tsx)@@

The login page reads `searchParams` and the account page reads cookies, both request data; the root `loading.tsx` from @@step(Streaming sections, skeletons, route groups, and not found)@@ is the boundary above them.

**Check:** open http://localhost:3000/account: the URL becomes `/login?callbackUrl=%2Faccount` before anything renders (a 307 in the Network tab). Sign in with a wrong password: the message appears and no cookie is set. Sign in with `cadet@catstronauts.dev` and `space-cat`: the account page shows the user and a masked token, the header now shows the name, and the Server Action response carried a `Set-Cookie` for `better-auth.session_token`, HttpOnly. Now confirm the point of the step: `curl -s -b <cookie> localhost:3000/api/auth/get-session` returns the user and no `accessToken`, while `sqlite3 .auth.sqlite 'select accessToken from session'` shows the token the page just rendered. Open http://localhost:3000/: the name is still there, streamed into a page whose shell was prerendered without it. Open http://localhost:3000/rsc/track/c_0: the register-views form is back and a submit succeeds. Sign out and check the table: the row is gone, not merely the cookie. `e2e/auth.spec.ts` covers the flow, including a replay of a cookie captured before sign-out and the assertion that the session endpoint leaks nothing; flip `returned` to `true` and that one test fails while everything else stays green, which is how quietly the original bug hid. The unit tests cover `proxyRedirect`, the schema, the action (with `signInEmail` mocked and a real `APIError`), the form, and the session and token checks in `registerView`.

## Step: Metadata: file conventions and Open Graph images

`generateMetadata` and the title template exist since @@step(Pattern 1: RSC `query()` and a Server Action)@@. The rest of the metadata story is files next to the layout: Next.js turns them into routes and `<head>` tags on its own.

- `src/app/favicon.ico` and `src/app/apple-icon.png` become the icon links.
- `src/app/manifest.ts` is served at `/manifest.webmanifest` and linked automatically:

@@include(src/app/manifest.ts)@@

- `src/app/opengraph-image.tsx` renders the site card with `next/og` (Satori: flexbox-style CSS only, absolute image URLs, one text node per box unless it is `display: flex`):

@@include(src/app/opengraph-image.tsx)@@

- A dynamic route can have its own. This one is a Route Handler, not a React render, so the RSC client works but React `cache()` memoizes nothing:

@@include(src/app/rsc/track/[trackId]/opengraph-image.tsx)@@

`metadataBase` in the root layout turns these relative URLs into the absolute ones social cards require; set `NEXT_PUBLIC_SITE_URL` in production.

**Check:** view the source of http://localhost:3000/rsc/track/c_0: `og:image` points at `/rsc/track/c_0/opengraph-image`. Open that URL: a card with the track's title, author, and thumbnail. `/manifest.webmanifest` returns the manifest. `e2e/metadata.spec.ts` covers all of it.

## Step: Errors and retry

Suspense hooks and awaited RSC queries throw to the nearest `error.tsx`. `useQuery` returns `error` instead. Next 16.3 gives the boundary `retry()`, which re-fetches the route segment; `reset()` would only re-render it.

There is a trap. Apollo's suspense hooks keep a rejected result in their cache until it auto-disposes, 30 seconds by default, so `retry()` alone re-throws the same error. Refetch what is still watched first:

@@include(src/app/error.tsx)@@

**Check:** open http://localhost:3000/rsc/track/does-not-exist. In development the message is the API's `404: Not Found`, a GraphQL error carrying the upstream REST status in its extensions. In a production build it is React error #441 plus a digest: Next.js redacts Server Component errors. @@step(Tests)@@ adds a test that proves recovery from a transient failure.

## Step: Tests

Unit tests with Vitest, Testing Library, and happy-dom:

@@include(vitest.config.mts)@@

@@include(vitest.setup.ts)@@

The most useful unit test asserts what the whole "no refetch, no manual update" argument rests on: after the mutation, the normalized entity in the cache changed. `MockedProvider` moved to `@apollo/client/testing/react` in Apollo Client 4.

@@include(src/lib/hooks/use-increment-track-views.test.tsx)@@

The other unit tests (`src/components/*.test.tsx`, `src/lib/helpers.test.ts`) cover the presentational components and the card's click semantics. Async Server Components cannot be unit-tested with Vitest, so the pattern differences are proven end to end with Playwright against a production build:

@@include(playwright.config.ts)@@

The suite in `e2e/patterns.spec.ts` checks, per pattern, that the list renders and navigates; that server-rendered routes contain the data in their HTML while `/legacy` contains the spinner; that `/suspense` makes zero browser GraphQL requests while `/legacy` makes one; that the Server Action POST happens and the counter moves; and that the `queryRef` refetch picks up a server-side change. `e2e/error-recovery.spec.ts` blocks GraphQL during a client-side navigation, lifts the block, and expects **Try again** to recover.

**Check:**

```sh
pnpm vitest run       # 25 files, 88 tests
pnpm test:e2e         # builds, starts the server, 49 tests
E2E_PORT=3100 pnpm test:e2e   # when a dev server holds port 3000
```

## Step: Build and ship

```sh
pnpm build
pnpm start
```

Read the route table the build prints; every rendering mode of Cache Components is in it.

| Symbol | Routes | Why |
| --- | --- | --- |
| `◐ (Partial Prerender)` | every page: `/`, `/login`, `/account`, `/rsc`, `/suspense`, `/preload`, `/background`, `/legacy` and their detail pages | The shell is static HTML; uncached data (or `params`) streams in at request time under `loading.tsx`. The header's user menu reads the session on every route, so no page is `○`; before the auth step, `/` and `/legacy` were |
| `◐ (Partial Prerender)` with `1m 1h` | `/use-cache`, `/use-cache/track/c_0` … | Page-level `"use cache"` with the `minutes` profile; `generateStaticParams` plus the cached function with the custom `track` profile. The cached page is the shell, the user menu is the hole in it |
| `○ (Static)` | `/opengraph-image`, `/manifest.webmanifest`, `/apple-icon.png` | Metadata files read nothing at request time |
| `ƒ (Dynamic)` | `/api/auth/[...all]`, `/api/revalidate`, `/rsc/track/[trackId]/opengraph-image` | Route handlers with `POST` or dynamic params are dynamic |
| `ƒ Proxy (Middleware)` | `src/proxy.ts` | Runs before the cache for the routes in its `matcher` |

Nothing had to be marked dynamic; the two `io()` layouts exist only because the Client Component patterns fetch through a link Next.js cannot observe. Compare with the `dynamic` branch, where the same routes are `ƒ (Dynamic)` because of `export const dynamic = "force-dynamic"`, `/revalidate` uses segment `revalidate` and fetch `next.revalidate` instead of `"use cache"`, and `dynamic = "force-static"` / `"error"` guard the static routes.

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
- Under Cache Components nothing is cached by default. `"use cache"` plus `cacheLife` (built-in or custom profile) and `cacheTag` cache a function or a page across requests, `generateStaticParams` prerenders known paths, `io()` keeps work Next.js cannot see out of the static shell (`connection()` does too, but blocks prefetches; keep it for renders that must wait for a real user request), and three invalidation APIs exist: `updateTag` (immediate, Server Actions), `revalidatePath` (by route), `revalidateTag(tag, "max")` (stale-while-revalidate, also from route handlers).

Where to go next: read [docs/patterns.md](docs/patterns.md) for the talking points, diff this branch against `dynamic` to see everything the rendering model changes, then try Apollo's data masking with `useFragment` and `@defer` with `SSRMultipartLink`.

The README is generated from `docs/tutorial.template.md` by `pnpm docs:readme`, which inlines the source files. Edit the template or the code, then regenerate; do not edit README.md by hand.

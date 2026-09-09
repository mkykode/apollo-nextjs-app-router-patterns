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
- tell the three cases apart: `useLayoutEffect` for DOM measurement, `useEffect` for external subscriptions, and no effect for everything else
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

`typedRoutes` makes `<Link href>` type-checked against the route tree. `remotePatterns` is required for `next/image` with remote URLs; restrict the paths, or the image optimizer becomes an open proxy.

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

`PatternNav` (`src/components/pattern-nav.tsx`) is the one Client Component in the header: it reads `usePathname()` and links every pattern to the same sub-path, so you can jump from `/rsc/track/c_0` to `/preload/track/c_0`. The index page (`src/app/page.tsx`) lists the registry; replace the placeholder from @@step(Root layout and global styles)@@ with the finished file. It exports `dynamic = "error"`: the page has no request-time data, and this turns that into a build-time guarantee instead of a silent fallback to dynamic rendering.

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

One more file. Next.js's default for a `fetch` with no options is `auto no cache`: it fetches once during `next build` and prerenders the route with that data, unless the route reads a request-time API. Nothing here does, so the view counts would freeze at build time. A segment config in the folder's layout makes every route below it render per request:

@@include(src/app/rsc/layout.tsx)@@

**Check:**

```sh
pnpm dev
curl -s http://localhost:3000/rsc | grep -c "Cat-stronomy"   # at least 1: the data is in the HTML
```

Open http://localhost:3000/rsc with the Network tab filtered to the GraphQL host: no request. Click a card. The detail page shows the view count, and the count went up (the Server Action ran).

## Step: Pattern 2: `useSuspenseQuery` and streaming SSR

The Client Component version. Add the mutation hook the client patterns share. The mutation response selects `track { id numberOfViews }`, so `InMemoryCache` updates the `Track:<id>` entity and every component reading it re-renders. No `refetchQueries`, no manual `update`.

@@include(src/lib/hooks/use-increment-track-views.ts)@@

A `loading.tsx` in the pattern's folder is the Suspense boundary. The shell streams first, the data follows. It lives in the pattern folder rather than at the root on purpose: a boundary above a page sends the 200 shell before the page runs, which makes a real 404 status impossible for the routes underneath (the not-found step shows both outcomes).

@@include(src/app/suspense/loading.tsx)@@

This pattern needs the same `layout.tsx` with `dynamic = "force-dynamic"` as @@step(Pattern 1: RSC `query()` and a Server Action)@@: its SSR request goes through the Client Component link, which has no Next.js options, so without the segment config the route would be prerendered at build with a stale transported cache. Copy `src/app/rsc/layout.tsx` to `src/app/suspense/layout.tsx` and rename the component.

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

Data that arrives this way is client data. Never read it from a Server Component; the integration creates a separate client for `PreloadQuery` to make that hard to do by accident. Add the same `layout.tsx` segment config as the previous steps (`src/app/preload/layout.tsx`).

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

Add `src/app/background/layout.tsx` with the segment config, like @@step(Pattern 2: `useSuspenseQuery` and streaming SSR)@@.

**Check:** http://localhost:3000/background behaves like @@step(Pattern 2: `useSuspenseQuery` and streaming SSR)@@: data in the SSR HTML, no browser GraphQL request after load.

## Step: Pattern 5: `useQuery`, the course way

`useQuery` never suspends. The SSR pass renders the loading state, and the request only happens in the browser after hydration. It is still right for polling, lazy queries, and anything that must not block rendering. The course's `QueryResult` helper comes back with a render prop, so `data` is narrowed by the time your children run:

@@include(src/components/query-result.tsx)@@

@@include(src/app/legacy/page.tsx)@@

@@include(src/app/legacy/track/[trackId]/page.tsx)@@

This pattern gets a layout too, with the opposite setting. Nothing fetches on the server, so the spinner shell is prerendered, and `force-static` keeps it that way even if a request-time API sneaks in later (it would return empty values rather than flip the route to dynamic):

@@include(src/app/legacy/layout.tsx)@@

**Check:** `curl -s http://localhost:3000/legacy | grep -c "Cat-stronomy"` prints `0`, and `curl -s http://localhost:3000/legacy | grep -c progressbar` prints `1`: the HTML has the spinner, not the data. In the browser, the Network tab shows a GraphQL request after hydration.

## Step: Pattern 6: RSC and the Next.js Data Cache

Everything so far renders on every request. This pattern uses the caching side of the classic model, and it uses each lever once so you can compare them.

**Segment-level: `revalidate`.** The list page exports `revalidate = 60`. The whole page is prerendered and regenerated at most once a minute (Incremental Static Regeneration). The fetch inside needs no options; it runs whenever the page regenerates.

@@include(src/app/revalidate/page.tsx)@@

**Fetch-level: `next.revalidate` and `next.tags`.** On the server, `HttpLink` hands `fetchOptions` to Next's patched `fetch`, so Next-only options work per query through `context.fetchOptions`. The detail page caches each track's response under its own tag. It also exports `generateStaticParams`, which runs the list query once at build and prerenders a page per track, and `dynamicParams`, which decides what happens for ids that were not in that list.

@@include(src/lib/cache-tags.ts)@@

@@include(src/app/revalidate/track/[trackId]/page.tsx)@@

**On demand, from inside the app.** Add the second Server Action to `src/lib/actions/increment-track-views.ts`. `updateTag` expires the track's fetch entry immediately, so the render caused by this click is fresh (read-your-own-writes). `revalidatePath` marks the segment-cached list page for regeneration on its next request.

@@include(src/lib/actions/increment-track-views.ts)@@

**On demand, from outside the app.** A CMS or the GraphQL backend would call a webhook after data changes. This route handler is that webhook: `revalidateTag(tag, "max")` is stale-while-revalidate, so the next request still gets the cached entry while a fresh one is fetched in the background. Next 16 requires the profile argument. Set `REVALIDATE_SECRET` in `.env.local` to enable it.

@@include(src/app/api/revalidate/route.ts)@@

Register the pattern in `src/lib/patterns.ts` (slug `revalidate`) and the header, index page, and tests pick it up.

No `layout.tsx` for this folder: nothing reads request-time data, so the segment config on the page and the fetch options decide everything. `fetchCache` is the one lever not used here. It changes the default `cache` option for every fetch in a segment; with one query per page it adds nothing over setting the option on the query.

**Check:** open http://localhost:3000/revalidate/track/c_0 twice, incrementing the count between the two loads with the `curl` from @@step(Pattern 3: `PreloadQuery`)@@. The second load still shows the old count: it came from the Data Cache. Now go to `/revalidate` and click the card. The detail page shows the fresh count: the Server Action expired the tag. Then, with `REVALIDATE_SECRET=test` in `.env.local` and the server restarted, increment again and run:

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

There is a trade-off to say out loud. A Suspense boundary above a page means the 200 shell is sent before the page runs, so `notFound()` can only render in place: the user sees the 404 UI, the status code says 200. That is why this branch has no root `loading.tsx`: each pattern that streams has its own, and `/revalidate`, which awaits its query before rendering and sits outside any boundary, answers unknown ids with a genuine 404 status. Streaming and true status codes pull in opposite directions; pick per route.

**Check:** `curl -s -o /dev/null -w "%{http_code}" localhost:3000/revalidate/track/nope` prints `404`; the same for `/rsc/track/nope` prints `200` and the page shows the not-found message. Throttle the network on http://localhost:3000/rsc/track/c_0 and reload: two skeletons, then each section fills in. `e2e/not-found-and-streaming.spec.ts` proves the stream order from the raw HTML.

## Step: Forms: a Server Action and a client mutation

The card click showed both ways to run a mutation. Forms make the difference easier to see, and they need validation, so each detail page gets a form with a "views to register" field. Install Zod (`pnpm add zod`) and write the schema once:

@@include(src/lib/schemas/register-view.ts)@@

The same function runs in the browser before a submit and on the server inside the action or, for the client form, next to the GraphQL server's own validation. `FormData` values are strings, which is what `z.coerce` is for.

**The Server Action form.** The action has the `(previousState, formData)` shape that `useActionState` expects, validates again, returns errors as state instead of throwing, and runs one mutation per view with the RSC client. The `revalidatePath` call is not optional: an action that revalidates nothing returns only its value and Next.js does not re-render the route. With it, the same response carries the re-rendered page, so `TrackDetail` shows the new count in one roundtrip. The session check and the `context` on the mutation come from @@step(Authentication: Auth.js, the proxy, and the session in Server Actions)@@; ignore them until then.

@@include(src/lib/actions/register-view.ts)@@

The form component is a Client Component because it holds state, but the mutation runs on the server. `onSubmit` validates with Zod and calls `preventDefault` on failure, so invalid input never dispatches the action. With JavaScript disabled the browser submits natively and only the server-side validation runs; the form still works.

It also shows `useOptimistic`, React's counterpart to Apollo's `optimisticResponse` for Server Actions. The hook takes the server-rendered count as its base value and a reducer; calling `addViews` inside the form action shows the expected count immediately, and React discards the optimistic value when the action settles. What replaces it is whatever the re-rendered page passes in: the new count on success, the old one if the action failed. Two rules: the update must happen inside a transition or action, which a form action is, and the base value must come from the server, or there is nothing to fall back to.

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

**A Server Action from a button.** React 19 transitions accept an async function, and `isPending` stays true until everything inside has settled. That fits a Server Action called outside a form: await it, then `router.refresh()` to re-fetch the route's RSC payload in the same transition. The page updates in place, with no form and no fallback.

@@include(src/components/quick-view-button.tsx)@@

Render it under `TrackDetail` in `src/app/rsc/track/[trackId]/page.tsx`.

**Check:** on http://localhost:3000/suspense/track/c_0, throttle the network in DevTools, then change the preview select. The old preview dims and stays until the new one lands. Untick the checkbox and change it again: the "Loading preview..." fallback flashes instead. On http://localhost:3000/rsc/track/c_0, click **Quick +1 view**: the button shows its pending label, the Network tab shows the `next-action` POST followed by the RSC refresh, and the count in the details box changes. `e2e/transitions.spec.ts` proves both, slowing GraphQL down with `page.route` so the pending state is observable.

## Step: Effects: useLayoutEffect, useEffect, and no effect at all

Effects are for synchronizing with something outside React. Most of the code you have written so far needed none, and that is the point of this step: know the two cases that do, and recognize the cases that do not.

The header's pattern navigation gets a bar that slides under the active link. Positioning it means reading the DOM (`offsetLeft`, `offsetWidth`), which React cannot know during render.

@@include(src/components/pattern-nav.tsx)@@

**`useLayoutEffect`: read layout, set state, and never paint in between.** It runs after React commits the DOM but before the browser paints. The indicator is hidden until it has been measured for the current pathname, so measuring in a layout effect means the user never sees the unmeasured frame. Change it to `useEffect` and every navigation paints one frame with the bar hidden or at its old position, then a second frame with it moved: a blink. That is the whole rule: `useLayoutEffect` only when a DOM measurement has to change what is painted, because it blocks painting.

**`useEffect`: subscribe to an external system, and clean up.** The resize listener re-measures when the viewport changes. Nothing about it has to happen before paint, so the non-blocking effect is correct, and the returned function removes the listener when the component unmounts or `measure` changes. Other legitimate uses: analytics pings, connecting to a socket, syncing with a third-party widget. Neither effect runs on the server; React 19 no longer warns about `useLayoutEffect` during SSR, it simply does nothing there, which is why the server HTML carries `data-measured="false"` and the indicator appears on hydration.

**No effect: the cases that look like effects but are not.** Every one of these is already in the repo:

| Temptation | Do this instead | In this repo |
| --- | --- | --- |
| Fetch data in `useEffect` after mount | Fetch during render with Suspense hooks, or in a Server Component | Every pattern page; nothing in `src/` fetches in an effect |
| Compute derived state in an effect and store it | Compute it during render | `others` in `TrackPreview`, `active` in `PatternNav` |
| React to a click or submit in an effect | Do the work in the handler | Both forms and `TrackCard` |
| Reset state when a prop changes | Give the component a `key` so React remounts it | Add `key={trackId}` to a component that keeps per-track state |
| Read an external store's value in an effect | `useSyncExternalStore` | The pattern to reach for if the resize listener ever needs the width as state |
| Notify the parent from an effect | Call the callback in the handler that caused the change | `onOpen` in `TrackCard` |

**Check:** on http://localhost:3000/rsc, the bar sits under **RSC query()**. Click another pattern: the bar slides to it and never blinks. Open React DevTools, change `useLayoutEffect` to `useEffect` in `pattern-nav.tsx`, and navigate again with the browser throttled to a slow CPU: a frame without the bar appears. `e2e/layout-effect.spec.ts` checks that the bar's bounding box matches the active link before and after a client navigation.

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
- `SetContextLink` sets headers per operation, merging whatever the operation's own `context.headers` carries. This is where a session token goes. The `getToken` slot suits a browser client with a token in memory; the RSC client cannot use it, because reading cookies inside a link would drag every cached and static route that shares the client into dynamic rendering. The Server Action in @@step(Authentication: Auth.js, the proxy, and the session in Server Actions)@@ passes the token per operation instead. The browser client sets no custom headers otherwise, because each one would need CORS approval from the API.
- `HttpLink` performs the request and must be last.

**Check:** open http://localhost:3000/suspense with DevTools offline, then go back online and reload: the console shows the ErrorLink entries and the request succeeds on a retry. `src/lib/apollo/links.test.ts` pins the retry policy.

## Step: Authentication: Auth.js, the proxy, and the session in Server Actions

The Odyssey API is public and ignores an `Authorization` header, so nothing in this step can be enforced by the server you talk to. What it shows is everything on the Next.js side of a login: an Auth.js credentials provider, a session in an HttpOnly cookie, a route kept behind that session by `proxy.ts`, the session read again in a Server Component and in a Server Action, and its token handed to Apollo per operation. Swap the demo user table for a database and the upstream for an API that checks bearer tokens, and the shape does not change.

Install Auth.js v5 (`pnpm add next-auth@beta`). It signs the cookie with `AUTH_SECRET`: `.env.development` carries a development-only value that `next dev` loads, and production sets its own (`npx auth secret`). If the secret is missing, `auth()` logs `MissingSecret` and returns `null`. It fails closed, so a misconfigured app locks everyone out rather than in.

**The user table and the schema.** One demo account, public because the login page prints it. The server never compares plaintext: it keeps a salted scrypt hash from Node's standard library, verifies it in constant time, and hands back a DTO without the hash. `server-only` keeps the module out of every client bundle.

@@include(src/lib/auth/demo-account.ts)@@

@@include(src/lib/auth/users.ts)@@

The login schema works like the register-view one: run in the browser before the submit, again in the Server Action, and once more in the provider. A `redirectTo` that is not a relative path is dropped rather than reported, because a fresh session must never follow an absolute URL to another site.

@@include(src/lib/schemas/login.ts)@@

@@include(src/lib/auth/paths.ts)@@

**Two halves of one configuration.** Auth.js runs in two places: the proxy, in front of the matched routes, and the Node side (Route Handler, Server Components, Server Actions). The proxy should stay light, so the configuration is split. `auth.config.ts` holds what the proxy needs, `auth.ts` adds the credentials provider, which imports the user table and `node:crypto`.

@@include(src/lib/auth/auth.config.ts)@@

The `authorized` callback is the proxy's whole decision. It sees only the decoded cookie, which is the optimistic check the Next.js authentication guide describes: cheap enough to run on every matched request, prefetches included, and not something to trust with data. `jwt` runs when the token is created and every time it is read; `user` is present only at sign-in, which is when the demo mints an opaque access token in place of the one an identity provider would return. `session` shapes what `auth()` gives the app, and the `.d.ts` teaches TypeScript the extra field.

@@include(src/lib/auth/auth.ts)@@

@@include(src/lib/auth/next-auth.d.ts)@@

The Route Handler gives Auth.js its endpoints. The proxy is the `auth` function itself, with a matcher that keeps it off every other route:

@@include(src/app/api/auth/[...nextauth]/route.ts)@@

@@include(src/proxy.ts)@@

**Sign in and sign out.** The action has the `useActionState` shape from @@step(Forms: a Server Action and a client mutation)@@. `signIn` runs the provider and sets the cookie on this response; wrong credentials throw `CredentialsSignin`, which becomes state; then the action calls `redirect()` itself, so the flow reads top to bottom.

@@include(src/lib/actions/auth.ts)@@

@@include(src/components/login-form.tsx)@@

@@include(src/app/login/page.tsx)@@

**The protected page.** The proxy already turned strangers away, but the page calls `auth()` again, next to the data it renders. That is the defense in depth the guide asks for, and it is also what makes the route dynamic: `auth()` reads cookies, so no segment config is needed.

@@include(src/app/account/page.tsx)@@

**The session in a Server Action.** `registerView` from the forms step refuses to run without a session and passes the session's token to Apollo as per-operation `context`; the `SetContextLink` from @@step(The link chain)@@ merges those headers with its own. The token does not go through the link's `getToken` slot on purpose: `auth()` reads cookies, and the RSC client is shared with cached and static routes, where a cookie read is a build error or a silent switch to dynamic rendering. Passing it at the call site keeps the decision where the session is.

@@include(src/lib/actions/register-view.ts)@@

The track page reads the session inside the same Suspense boundary as the track, so the cookie read never blocks the shell, and it shows a sign-in link instead of the form when there is no session:

@@include(src/components/sign-in-prompt.tsx)@@

**What is not here, and why.** The header has an **Account** link, not the user's name. A session read in the root layout would make every route dynamic on this branch: `/` is `dynamic = "error"` and would fail the build, `/revalidate` would stop being ISR, `/legacy` would render with an empty cookie jar. Per-user UI in a shared layout is the case Cache Components exists for. The `use-cache` branch streams a `UserMenu` into the header behind a Suspense boundary while the shell stays static.

**Check:** open http://localhost:3000/account: the URL becomes `/login?callbackUrl=%2Faccount` before anything renders (a 302 in the Network tab). Sign in with a wrong password: the message appears and no cookie is set. Sign in with `cadet@catstronauts.dev` and `space-cat`: the account page shows the user and a masked token, and the Server Action response carried a `Set-Cookie` for `authjs.session-token`, HttpOnly. Open http://localhost:3000/rsc/track/c_0: the register-views form is back and a submit succeeds. Sign out: the cookie is gone and `/account` redirects again. `e2e/auth.spec.ts` covers the flow. The unit tests cover the `authorized` decision, the token callbacks, the password hashing, the schema, the action (with `signIn` mocked and the real `CredentialsSignin`), the form, and the session check in `registerView`.

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
pnpm vitest run       # 25 files, 84 tests
pnpm test:e2e         # builds, starts the server, 36 tests
E2E_PORT=3100 pnpm test:e2e   # when a dev server holds port 3000
```

## Step: Build and ship

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

# Tutorial: Catstronauts on the Next.js App Router with Apollo Client 4

You finished Apollo Odyssey's [Client-side GraphQL with React & Apollo](https://odyssey.apollographql.com/client-side-graphql-react). That app is a Vite single-page app: every query runs in the browser with `useQuery`. This tutorial rebuilds it on the **Next.js 16 App Router** with **Apollo Client 4** and [`@apollo/client-integration-nextjs`](https://github.com/apollographql/apollo-client-integrations), and renders the same two pages (track list, track detail) **six times, once per data-fetching pattern**, so you can compare them on live data.

By the end you will be able to:

- set up the two Apollo Client instances an App Router app needs, and explain why there are two
- fetch in a Server Component with `query()`, in a Client Component with `useSuspenseQuery`, hand a request from server to client with `PreloadQuery`, avoid waterfalls with `useBackgroundQuery`, and say when `useQuery` is still the right tool
- decide per route what Next.js prerenders and what streams at request time, with `connection()`, `"use cache"`, `cacheLife`, `cacheTag`, and `updateTag`
- run a mutation with `useMutation` and with a Server Action, and let the normalized cache do the update
- handle errors, loading, and a trap in suspense error recovery
- test all of it with Vitest, Apollo's `MockedProvider`, and Playwright

**Starting point:** the finished course app on the `main` branch of this repo. **Finished result:** this `cache-components` branch, which runs the app under Next.js 16 Cache Components (`cacheComponents: true`). The `nextjs-app-router` branch is the same app under the classic rendering model with `export const dynamic`; the two cannot coexist in one app, so this tutorial marks every step where the models differ. Every step names the finished file so you can compare when stuck. **Time:** about three hours. **Prerequisites:** Node 24, pnpm 11, and the course itself.

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

@@include(src/app/layout.tsx)@@

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

## Step 5: Two Apollo Clients

An App Router app has two module graphs. Server Components run once per request on the server and have no React context. Client Components run twice: on the server during streaming SSR, and again in the browser. Each world needs its own Apollo Client.

First, Apollo's dev messages, loaded outside production only:

@@include(src/lib/apollo/dev-messages.ts)@@

The Server Component client. `registerApolloClient` wraps your factory in React's `cache()`, so every Server Component and Server Action in one request shares an instance and identical queries are deduplicated. `import "server-only"` turns any accidental client import into a build error.

@@include(src/lib/apollo/rsc-client.ts)@@

The Client Component client. `ApolloNextAppProvider` calls `makeClient` on the server for the SSR pass and again in the browser. The `ApolloClient` and `InMemoryCache` from the integration package are subclasses that record every query result during SSR, stream it into the HTML, and replay it into the browser cache, so hydration does not refetch.

@@include(src/lib/apollo/apollo-wrapper.tsx)@@

You already render `<ApolloWrapper>{children}</ApolloWrapper>` in the layout from Step 3. A common worry: does a Client Component wrapper in the root layout turn every page into a Client Component? No. `"use client"` is a boundary in the module **import** graph. A Client Component makes what it imports client code; what it receives as `children` was rendered on the server already and arrives as a slot. Context never reaches Server Components, so the provider is invisible to them.

**Check:** `pnpm build` succeeds. Then try it the wrong way: import `getClient` from `rsc-client.ts` inside `apollo-wrapper.tsx`. The build fails with a `server-only` error. Remove the import.

## Step 6: Shared UI and the pattern registry

All five patterns render the same components. The registry is the single source of truth for routes, the header navigation, the index page, and the end-to-end tests:

@@include(src/lib/patterns.ts)@@

`PatternNav` (`src/components/pattern-nav.tsx`) is the one Client Component in the header: it reads `usePathname()` and links every pattern to the same sub-path, so you can jump from `/rsc/track/c_0` to `/preload/track/c_0`. The pathname is runtime data, and the header is part of every route's prerendered shell, so the build fails unless the hook sits inside a Suspense boundary. `header.tsx` wraps it in `<Suspense fallback={<PatternNavLinks pathname="/" />}>`: the links prerender, the active state streams in. The index page (`src/app/page.tsx`) lists the registry; replace the placeholder from Step 3 with the finished file.

`TrackDetail` (`src/components/track-detail.tsx`) is a plain Server Component that takes a `TrackDetail_TrackFragment`. The card and grid are Client Components, and the reason is instructive:

@@include(src/components/track-grid.tsx)@@

A Server Component cannot pass a closure to a Client Component; only serializable props and Server Actions cross the boundary. So the grid is a Client Component that builds the per-card closures itself, and the page passes it either the `useMutation` callback or the Server Action.

@@include(src/components/track-card.tsx)@@

Three details to notice: the click is intercepted so the increment completes before `router.push`, otherwise the detail page can render a count that is stale by one; the wait is bounded because `HttpLink` has no timeout; and modifier clicks are left to the browser so open-in-new-tab keeps working. Styles are in `src/components/track-card.module.css`.

**Check:** `pnpm typecheck` passes. Nothing renders tracks yet.

## Step 7: Pattern 1: RSC `query()` and a Server Action

The page is an `async` Server Component. It awaits `query()`, and the HTML arrives complete. No Apollo code or data for this page is shipped to the browser, and the browser cache knows nothing about it.

@@include(src/app/rsc/page.tsx)@@

Passing `errorPolicy: "none"` is the default, but stating it narrows `data` from `TData | undefined` to `TData` in the types.

Because there is no browser cache to update, the mutation runs in a Server Action with the same RSC client. Every `"use server"` export is a public endpoint, so validate the input:

@@include(src/lib/actions/increment-track-views.ts)@@

The detail page shows the payoff of one client per request. `generateMetadata` and the page both run `GetTrack`, and only one request leaves the server, because the second call is served from that client's cache.

@@include(src/app/rsc/track/[trackId]/page.tsx)@@

`params` is a Promise in Next 16; `PageProps<"/rsc/track/[trackId]">` is a global helper generated by `next typegen`.

Nothing else is needed for this pattern. Under Cache Components, an uncached `query()` is dynamic by definition: the build prerenders the shell (header, footer, the `loading.tsx` spinner) and streams the page in at request time. The build output marks it `◐ (Partial Prerender)`.

**Check:**

```sh
pnpm dev
curl -s http://localhost:3000/rsc | grep -c "Cat-stronomy"   # at least 1: the data is in the HTML
```

Open http://localhost:3000/rsc with the Network tab filtered to the GraphQL host: no request. Click a card. The detail page shows the view count, and the count went up (the Server Action ran).

## Step 8: Pattern 2: `useSuspenseQuery` and streaming SSR

The Client Component version. Add the mutation hook the client patterns share. The mutation response selects `track { id numberOfViews }`, so `InMemoryCache` updates the `Track:<id>` entity and every component reading it re-renders. No `refetchQueries`, no manual `update`.

@@include(src/lib/hooks/use-increment-track-views.ts)@@

A route-level `loading.tsx` is the Suspense boundary. The shell streams first, the data follows.

@@include(src/app/loading.tsx)@@

This pattern needs one extra file, and the reason is subtle. Its SSR request goes through the Client Component link, which Cache Components cannot see, so the build would treat the route as fully static and bake the data in (try it: remove the file and read the build output). A layout that awaits `connection()` defers everything below it to request time:

@@include(src/app/suspense/layout.tsx)@@

@@include(src/app/suspense/page.tsx)@@

Client pages get `params` as a Promise too. Unwrap it with React's `use()`:

@@include(src/app/suspense/track/[trackId]/page.tsx)@@

**Check:** `curl -s http://localhost:3000/suspense | grep -c "Cat-stronomy"` finds the data: the request ran on the server during SSR. In the browser, the Network tab shows no GraphQL request after load: the transported result hydrated the cache. Click a card, then use the browser back button. The list renders instantly from the cache, and the card you clicked already carries the new view count on the detail page.

## Step 9: Pattern 3: `PreloadQuery`

Use this when the data belongs to a Client Component (it must stay live, or it drives interaction) but you want the request to start as early as possible: in the Server Component, before any client code runs, with no waterfall and no duplicate fetch.

Form one: start the query in RSC, read it with `useSuspenseQuery` using the same document and variables.

@@include(src/app/preload/page.tsx)@@

@@include(src/app/preload/tracks-client.tsx)@@

Form two: the render prop hands a `queryRef` to the child, which reads it with `useReadQuery` and gets `refetch` from `useQueryRefHandlers`. Call `useQueryRefHandlers` before `useReadQuery`.

@@include(src/app/preload/track/[trackId]/page.tsx)@@

@@include(src/app/preload/track/[trackId]/track-client.tsx)@@

Data that arrives this way is client data. Never read it from a Server Component; the integration creates a separate client for `PreloadQuery` to make that hard to do by accident. Note the `await connection()` in both pages: `PreloadQuery` mints a request-scoped id with `crypto.randomUUID()`, which Cache Components reject during prerendering, and `connection()` is the documented way to move that render to request time.

**Check:** open http://localhost:3000/preload/track/c_0. Note the view count. Increment it from outside the app:

```sh
curl -s -X POST https://odyssey-lift-off-server.herokuapp.com/ \
  -H 'content-type: application/json' \
  -d '{"query":"mutation { incrementTrackViews(id: \"c_0\") { success } }"}'
```

Click **Refresh view count**. The number goes up without a full reload. You will also see a console warning about a duplicate fragment name on these pages; it is a cosmetic upstream quirk, explained in [docs/patterns.md](docs/patterns.md#known-quirks).

## Step 10: Pattern 4: `useBackgroundQuery`

The client-only version of preloading: the parent starts the request without suspending and passes a `queryRef` to a child that suspends on it. Use it when a parent must render before its data-bound children, or to start several queries in parallel.

@@include(src/app/background/page.tsx)@@

@@include(src/app/background/track/[trackId]/page.tsx)@@

Add `src/app/background/layout.tsx` with the same `connection()` layout as Step 8.

**Check:** http://localhost:3000/background behaves like Step 8: data in the SSR HTML, no browser GraphQL request after load.

## Step 11: Pattern 5: `useQuery`, the course way

`useQuery` never suspends. The SSR pass renders the loading state, and the request only happens in the browser after hydration. It is still right for polling, lazy queries, and anything that must not block rendering. The course's `QueryResult` helper comes back with a render prop, so `data` is narrowed by the time your children run:

@@include(src/components/query-result.tsx)@@

@@include(src/app/legacy/page.tsx)@@

@@include(src/app/legacy/track/[trackId]/page.tsx)@@

No layout here: nothing fetches on the server, so a fully static spinner shell is correct, and the build output shows `○ (Static)`.

**Check:** `curl -s http://localhost:3000/legacy | grep -c "Cat-stronomy"` prints `0`, and `curl -s http://localhost:3000/legacy | grep -c progressbar` prints `1`: the HTML has the spinner, not the data. In the browser, the Network tab shows a GraphQL request after hydration.

## Step 12: Pattern 6: RSC and `"use cache"`

Everything so far streams at request time. Cache Components let you cache at the function level instead of the fetch level: mark an async function `"use cache"`, give it a lifetime with `cacheLife`, and a name with `cacheTag`. The return value is memoized across requests, keyed by the arguments, and on a hit the function body, including the GraphQL request, does not run at all. Tags let a Server Action expire exactly the entries a mutation touched:

@@include(src/lib/cache-tags.ts)@@

@@include(src/lib/data/tracks.ts)@@

The pages only call the cached functions. Because the data is cached, `/cached` is prerendered as fully static; `/cached/track/[trackId]` reads `params`, so its shell prerenders and the cached content streams in.

@@include(src/app/cached/page.tsx)@@

@@include(src/app/cached/track/[trackId]/page.tsx)@@

Add the second Server Action to `src/lib/actions/increment-track-views.ts`. `updateTag` is the read-your-own-writes tool: it expires the tag immediately, so the render caused by this click is fresh. `revalidateTag(tag, "max")` is the softer alternative: serve the stale entry once more and refresh in the background.

@@include(src/lib/actions/increment-track-views.ts)@@

Register the pattern in `src/lib/patterns.ts` (slug `cached`) and the header, index page, and tests pick it up.

Two rules from the docs that matter here: a `"use cache"` function cannot read `cookies()`, `headers()`, or `searchParams`, so read them outside and pass them as arguments; and `React.cache` cannot pass data into the scope, which is fine for `registerApolloClient` because it only memoizes the client, and a fresh one inside the scope makes the same request.

**Check:** open http://localhost:3000/cached/track/c_0 twice, incrementing the count between the two loads with the `curl` from Step 9. The second load still shows the old count: it came from the Data Cache. Now go to `/cached` and click the card. The detail page shows the fresh count: the Server Action expired the tag. `e2e/data-cache.spec.ts` automates exactly this.

## Step 13: Errors and retry

Suspense hooks and awaited RSC queries throw to the nearest `error.tsx`. `useQuery` returns `error` instead. Next 16.3 gives the boundary `retry()`, which re-fetches the route segment; `reset()` would only re-render it.

There is a trap. Apollo's suspense hooks keep a rejected result in their cache until it auto-disposes, 30 seconds by default, so `retry()` alone re-throws the same error. Refetch what is still watched first:

@@include(src/app/error.tsx)@@

**Check:** open http://localhost:3000/rsc/track/does-not-exist. In development the message is the API's `404: Not Found`. In a production build it is React error #441 plus a digest: Next.js redacts Server Component errors. Step 14 adds a test that proves recovery from a transient failure.

## Step 14: Tests

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
pnpm vitest run       # 6 files, 20 tests
pnpm test:e2e         # builds, starts the server, 12 tests
```

## Step 15: Build and ship

```sh
pnpm build
pnpm start
```

Read the route table the build prints. `/`, `/legacy`, and `/cached` are `○ (Static)`: fully prerendered, and `/cached` shows its `cacheLife` window (revalidate 1m, expire 1h). Every other route is `◐ (Partial Prerender)`: the shell is static HTML and the data streams in at request time. Nothing had to be marked dynamic; the two `connection()` layouts exist only because the Client Component patterns fetch through a link Next.js cannot observe. Compare with the `nextjs-app-router` branch, where the same routes are `ƒ (Dynamic)` because of `export const dynamic = "force-dynamic"` and `/cached` uses `next.revalidate` on the fetch instead of `"use cache"`.

The `.github/workflows/ci.yml` on this branch runs lint, typecheck, unit tests, and the build on every push.

**Check:** `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/rsc` prints `200` and the view counts on `/rsc` match the ones on `/suspense`.

## What you learned

- Two Apollo Clients: a per-request one for Server Components and Server Actions (`registerApolloClient`), and a provider-based one for Client Components that runs on the server for SSR and again in the browser (`ApolloNextAppProvider`). Never read the same data from both.
- `"use client"` is an import-graph boundary. Server-rendered `children` pass through Client Components untouched, which is why one provider in the root layout costs the RSC pattern nothing.
- Suspense hooks turn streaming SSR on. `useQuery` ships a spinner; `useSuspenseQuery` ships the data and a warm cache.
- `PreloadQuery` and `useBackgroundQuery` start a request before the component that needs it renders. Same idea, different side of the boundary.
- A mutation that returns the entity's `id` and the changed fields updates the normalized cache by itself. When there is no browser cache, use a Server Action.
- `errorPolicy: "none"` narrows types; `error.tsx` catches thrown errors; suspense error recovery needs a refetch before `retry()`.
- Under Cache Components nothing is cached by default. `"use cache"` plus `cacheLife` and `cacheTag` cache a function across requests, `connection()` forces request-time rendering where Next.js cannot detect it, and `updateTag` in a Server Action reads your own writes.

Where to go next: read [docs/patterns.md](docs/patterns.md) for the talking points, diff this branch against `nextjs-app-router` to see everything the rendering model changes, then try Apollo's data masking with `useFragment` and `@defer` with `SSRMultipartLink`.

The README is generated from `docs/tutorial.template.md` by `pnpm docs:readme`, which inlines the source files. Edit the template or the code, then regenerate; do not edit README.md by hand.

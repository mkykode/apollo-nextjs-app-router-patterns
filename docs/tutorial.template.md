# Tutorial: Catstronauts on the Next.js App Router with Apollo Client 4

You finished Apollo Odyssey's [Client-side GraphQL with React & Apollo](https://odyssey.apollographql.com/client-side-graphql-react). That app is a Vite single-page app: every query runs in the browser with `useQuery`. This tutorial rebuilds it on the **Next.js 16 App Router** with **Apollo Client 4** and [`@apollo/client-integration-nextjs`](https://github.com/apollographql/apollo-client-integrations), and renders the same two pages (track list, track detail) **six times, once per data-fetching pattern**, so you can compare them on live data.

By the end you will be able to:

- set up the two Apollo Client instances an App Router app needs, and explain why there are two
- fetch in a Server Component with `query()`, in a Client Component with `useSuspenseQuery`, hand a request from server to client with `PreloadQuery`, avoid waterfalls with `useBackgroundQuery`, and say when `useQuery` is still the right tool
- use every caching lever of the classic Next.js model on purpose: `dynamic` (`force-dynamic`, `force-static`, `error`), segment `revalidate`, fetch `next.revalidate` and tags, `generateStaticParams`, `dynamicParams`, `updateTag`, `revalidatePath`, and `revalidateTag`
- run a mutation with `useMutation` and with a Server Action, from a click and from a form, validate with one Zod schema on both sides, and let the normalized cache do the update
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
13. [Forms: a Server Action and a client mutation](#step-13-forms-a-server-action-and-a-client-mutation)
14. [Transitions: keep the old UI while the new one loads](#step-14-transitions-keep-the-old-ui-while-the-new-one-loads)
15. [Effects: useLayoutEffect, useEffect, and no effect at all](#step-15-effects-uselayouteffect-useeffect-and-no-effect-at-all)
16. [Errors and retry](#step-16-errors-and-retry)
17. [Tests](#step-17-tests)
18. [Build and ship](#step-18-build-and-ship)
19. [What you learned](#what-you-learned)

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

`PatternNav` (`src/components/pattern-nav.tsx`) is the one Client Component in the header: it reads `usePathname()` and links every pattern to the same sub-path, so you can jump from `/rsc/track/c_0` to `/preload/track/c_0`. The index page (`src/app/page.tsx`) lists the registry; replace the placeholder from Step 3 with the finished file. It exports `dynamic = "error"`: the page has no request-time data, and this turns that into a build-time guarantee instead of a silent fallback to dynamic rendering.

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

One more file. Next.js's default for a `fetch` with no options is `auto no cache`: it fetches once during `next build` and prerenders the route with that data, unless the route reads a request-time API. Nothing here does, so the view counts would freeze at build time. A segment config in the folder's layout makes every route below it render per request:

@@include(src/app/rsc/layout.tsx)@@

**Check:**

```sh
pnpm dev
curl -s http://localhost:3000/rsc | grep -c "Cat-stronomy"   # at least 1: the data is in the HTML
```

Open http://localhost:3000/rsc with the Network tab filtered to the GraphQL host: no request. Click a card. The detail page shows the view count, and the count went up (the Server Action ran).

## Step 8: Pattern 2: `useSuspenseQuery` and streaming SSR

The Client Component version. Add the mutation hook the client patterns share. The mutation response selects `track { id numberOfViews }`, so `InMemoryCache` updates the `Track:<id>` entity and every component reading it re-renders. No `refetchQueries`, no manual `update`.

@@include(src/lib/hooks/use-increment-track-views.ts)@@

A `loading.tsx` in the pattern's folder is the Suspense boundary. The shell streams first, the data follows. It lives in the pattern folder rather than at the root on purpose: a boundary above a page sends the 200 shell before the page runs, which makes a real 404 status impossible for the routes underneath (the not-found step shows both outcomes).

@@include(src/app/suspense/loading.tsx)@@

This pattern needs the same `layout.tsx` with `dynamic = "force-dynamic"` as Step 7: its SSR request goes through the Client Component link, which has no Next.js options, so without the segment config the route would be prerendered at build with a stale transported cache. Copy `src/app/rsc/layout.tsx` to `src/app/suspense/layout.tsx` and rename the component.

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

@@include(src/app/background/page.tsx)@@

@@include(src/app/background/track/[trackId]/page.tsx)@@

Add `src/app/background/layout.tsx` with the segment config, like Step 8.

**Check:** http://localhost:3000/background behaves like Step 8: data in the SSR HTML, no browser GraphQL request after load.

## Step 11: Pattern 5: `useQuery`, the course way

`useQuery` never suspends. The SSR pass renders the loading state, and the request only happens in the browser after hydration. It is still right for polling, lazy queries, and anything that must not block rendering. The course's `QueryResult` helper comes back with a render prop, so `data` is narrowed by the time your children run:

@@include(src/components/query-result.tsx)@@

@@include(src/app/legacy/page.tsx)@@

@@include(src/app/legacy/track/[trackId]/page.tsx)@@

This pattern gets a layout too, with the opposite setting. Nothing fetches on the server, so the spinner shell is prerendered, and `force-static` keeps it that way even if a request-time API sneaks in later (it would return empty values rather than flip the route to dynamic):

@@include(src/app/legacy/layout.tsx)@@

**Check:** `curl -s http://localhost:3000/legacy | grep -c "Cat-stronomy"` prints `0`, and `curl -s http://localhost:3000/legacy | grep -c progressbar` prints `1`: the HTML has the spinner, not the data. In the browser, the Network tab shows a GraphQL request after hydration.

## Step 12: Pattern 6: RSC and the Next.js Data Cache

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

**Check:** open http://localhost:3000/revalidate/track/c_0 twice, incrementing the count between the two loads with the `curl` from Step 9. The second load still shows the old count: it came from the Data Cache. Now go to `/revalidate` and click the card. The detail page shows the fresh count: the Server Action expired the tag. Then, with `REVALIDATE_SECRET=test` in `.env.local` and the server restarted, increment again and run:

```sh
curl -s -X POST "http://localhost:3000/api/revalidate?tag=track:c_0&secret=test"
```

Reload the detail page twice: the first load may still be stale, the second is fresh. `e2e/data-cache.spec.ts` and `e2e/revalidate-route.spec.ts` automate both flows.

## Step 13: Forms: a Server Action and a client mutation

The card click showed both ways to run a mutation. Forms make the difference easier to see, and they need validation, so each detail page gets a form with a "views to register" field. Install Zod (`pnpm add zod`) and write the schema once:

@@include(src/lib/schemas/register-view.ts)@@

The same function runs in the browser before a submit and on the server inside the action or, for the client form, next to the GraphQL server's own validation. `FormData` values are strings, which is what `z.coerce` is for.

**The Server Action form.** The action has the `(previousState, formData)` shape that `useActionState` expects, validates again, returns errors as state instead of throwing, and runs one mutation per view with the RSC client. The `revalidatePath` call is not optional: an action that revalidates nothing returns only its value and Next.js does not re-render the route. With it, the same response carries the re-rendered page, so `TrackDetail` shows the new count in one roundtrip.

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

## Step 14: Transitions: keep the old UI while the new one loads

A transition tells React that a state update may take a while and that the current UI should stay on screen until the new one is ready. Three places on this branch already use `useTransition` without much ceremony: the card click awaits the mutation before navigating, the preload page's **Refresh view count** wraps `refetch()`, and `error.tsx` wraps `retry()`. The two components below make the effect visible.

**A suspense query whose variables change.** This is the case transitions exist for in Apollo. Changing the select gives `useSuspenseQuery` new variables, so the component suspends again. Without `startTransition`, the nearest Suspense fallback replaces the preview until the data arrives. Inside `startTransition`, React keeps the previous preview on screen and only swaps when the new one is ready, and `isPending` lets you dim it. The checkbox switches between the two so you can watch the difference.

@@include(src/components/track-preview.tsx)@@

Render it under the client form in `src/app/suspense/track/[trackId]/page.tsx`.

**A Server Action from a button.** React 19 transitions accept an async function, and `isPending` stays true until everything inside has settled. That fits a Server Action called outside a form: await it, then `router.refresh()` to re-fetch the route's RSC payload in the same transition. The page updates in place, with no form and no fallback.

@@include(src/components/quick-view-button.tsx)@@

Render it under `TrackDetail` in `src/app/rsc/track/[trackId]/page.tsx`.

**Check:** on http://localhost:3000/suspense/track/c_0, throttle the network in DevTools, then change the preview select. The old preview dims and stays until the new one lands. Untick the checkbox and change it again: the "Loading preview..." fallback flashes instead. On http://localhost:3000/rsc/track/c_0, click **Quick +1 view**: the button shows its pending label, the Network tab shows the `next-action` POST followed by the RSC refresh, and the count in the details box changes. `e2e/transitions.spec.ts` proves both, slowing GraphQL down with `page.route` so the pending state is observable.

## Step 15: Effects: useLayoutEffect, useEffect, and no effect at all

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

## Step 16: Errors and retry

Suspense hooks and awaited RSC queries throw to the nearest `error.tsx`. `useQuery` returns `error` instead. Next 16.3 gives the boundary `retry()`, which re-fetches the route segment; `reset()` would only re-render it.

There is a trap. Apollo's suspense hooks keep a rejected result in their cache until it auto-disposes, 30 seconds by default, so `retry()` alone re-throws the same error. Refetch what is still watched first:

@@include(src/app/error.tsx)@@

**Check:** open http://localhost:3000/rsc/track/does-not-exist. In development the message is the API's `404: Not Found`, a GraphQL error carrying the upstream REST status in its extensions. In a production build it is React error #441 plus a digest: Next.js redacts Server Component errors. Step 17 adds a test that proves recovery from a transient failure.

## Step 17: Tests

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
pnpm vitest run       # 11 files, 38 tests
pnpm test:e2e         # builds, starts the server, 19 tests
E2E_PORT=3100 pnpm test:e2e   # when a dev server holds port 3000
```

## Step 18: Build and ship

```sh
pnpm build
pnpm start
```

Read the route table the build prints; every rendering mode of the classic model is in it.

| Symbol | Routes | Why |
| --- | --- | --- |
| `ƒ (Dynamic)` | `/rsc`, `/suspense`, `/preload`, `/background` and their detail pages, `/api/revalidate` | `dynamic = "force-dynamic"` in the pattern's layout; route handlers with `POST` are always dynamic |
| `○ (Static)` | `/`, `/legacy`, `/legacy/track/[trackId]` | `dynamic = "error"` and `dynamic = "force-static"`; nothing fetches on the server |
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
- Next.js caching is decided per route and per fetch: `dynamic` for the rendering mode, `revalidate` at the segment or the fetch, `generateStaticParams` for known paths, and three invalidation APIs: `updateTag` (immediate, Server Actions), `revalidatePath` (by route), `revalidateTag(tag, "max")` (stale-while-revalidate, also from route handlers).

Where to go next: read [docs/patterns.md](docs/patterns.md) for the talking points, compare with the `use-cache` branch, then try Apollo's data masking with `useFragment` and `@defer` with `SSRMultipartLink`.

The README is generated from `docs/tutorial.template.md` by `pnpm docs:readme`, which inlines the source files. Edit the template or the code, then regenerate; do not edit README.md by hand.

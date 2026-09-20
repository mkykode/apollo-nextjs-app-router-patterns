/**
 * An external store, in the precise sense `useSyncExternalStore` means: state that lives
 * outside React and changes without React being told. The viewport is the canonical example.
 * `matchMedia` owns the value, the browser decides when it changes, and React only finds out
 * because we subscribe.
 *
 * The usual instinct is an Effect: read `window.innerWidth`, `setState`, add a listener. That
 * works, but it renders once with the wrong value and corrects it after paint, and during
 * concurrent rendering two components can read the store at different times and disagree
 * within a single commit. `useSyncExternalStore` exists to close both holes: React reads the
 * store during render and re-checks it before committing.
 */

/** Matches the layout's narrow breakpoint. */
const NARROW = "(max-width: 767px)";

/**
 * Created on first use, never at module scope. This module is imported by Server Components'
 * module graph, where `window` does not exist, so touching `matchMedia` on import would crash
 * the server render. Only `subscribe` and `getSnapshot` reach for it, and React calls neither
 * on the server.
 */
let mediaQuery: MediaQueryList | undefined;
const media = () => (mediaQuery ??= window.matchMedia(NARROW));

export const viewportStore = {
  /**
   * React hands this a callback and expects a clean-up function. One `MediaQueryList` is
   * shared by every subscriber, so a second component reading this store costs a listener,
   * not another query.
   */
  subscribe(onStoreChange: () => void) {
    const mql = media();
    mql.addEventListener("change", onStoreChange);
    return () => mql.removeEventListener("change", onStoreChange);
  },

  /**
   * Must return a value React can compare with `Object.is`, and must return the *same* value
   * while the store has not changed. A boolean is safe for free. Returning a fresh object or
   * array here, say `{ isNarrow: mql.matches }`, is the classic way to hang the app: every
   * render produces a new reference, React concludes the store changed, and it renders again
   * forever. If you need an object, cache it and only replace it when the source changes.
   */
  getSnapshot: () => media().matches,

  /**
   * Required for server rendering, and the reason this file is worth reading.
   *
   * There is no viewport on the server, so there is no honest answer: the server renders one
   * HTML document that may be hydrated at any width. React uses this value for the server
   * render and for the hydration render, so it must be a constant. Returning a guess that
   * disagrees with the client is not a hydration error, it is a lie that renders: React
   * re-reads `getSnapshot` after hydrating and re-renders with the truth, so the user sees a
   * flash of the wrong layout.
   *
   * So this is a design decision, not a default. `false` means the server always renders the
   * wide layout, and narrow viewports correct themselves after hydration. Pick the value the
   * majority of your traffic will hydrate into, and keep layout that must be right on the
   * first paint in CSS media queries, which need no JavaScript and no snapshot at all.
   */
  getServerSnapshot: () => false,
};

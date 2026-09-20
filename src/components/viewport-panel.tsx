"use client";

import { useSyncExternalStore } from "react";
import { viewportStore } from "@/lib/viewport-store";
import { ContentSection } from "./content-section";
import styles from "./viewport-panel.module.css";

/**
 * Reading an external store the way React wants it read.
 *
 * Three arguments, and the third is the one that matters in an App Router app: subscribe,
 * read, and read-on-the-server. Without `getServerSnapshot` this component throws during SSR
 * ("Missing getServerSnapshot"), because React has to render the HTML before any browser
 * exists to ask.
 *
 * What you can see here: the server snapshot is a constant, so the HTML always says "wide".
 * Load this page on a narrow viewport and the readout below flips to "narrow" after
 * hydration, from the same component, with no Effect and no state. `curl` the page and the
 * markup still says wide, which is the point: the server rendered a value it could not know.
 */
export function ViewportPanel() {
  const isNarrow = useSyncExternalStore(
    viewportStore.subscribe,
    viewportStore.getSnapshot,
    viewportStore.getServerSnapshot,
  );

  // Not from the hook: a direct call, so the panel can show what the server committed to
  // alongside what the browser actually has.
  const serverRendered = viewportStore.getServerSnapshot() ? "narrow" : "wide";
  const now = isNarrow ? "narrow" : "wide";

  return (
    <ContentSection>
      <section className={styles.panel} aria-labelledby="viewport-panel-heading">
        <h4 id="viewport-panel-heading">Reading the viewport with useSyncExternalStore</h4>
        <p className={styles.label}>
          The viewport lives outside React and changes without telling it. Rather than an Effect
          that sets state after paint, this subscribes to a <code>matchMedia</code> store and
          reads it during render. Drag the window across 768px and the readout follows, with no
          state and no Effect in the component.
        </p>

        <dl className={styles.readout} data-testid="viewport-store" data-viewport={now}>
          <div>
            <dt>Server snapshot</dt>
            <dd>{serverRendered}</dd>
          </div>
          <div>
            <dt>This browser, now</dt>
            <dd data-testid="viewport-now">{now}</dd>
          </div>
        </dl>

        <p className={styles.label}>
          The server has no viewport, so <code>getServerSnapshot</code> returns a constant and
          the HTML always says <strong>wide</strong>. On a narrow screen the two disagree until
          hydration, then React re-reads the store and corrects it. That flash is the cost of
          asking JavaScript a question CSS can answer for free, which is why layout that has to
          be right on first paint belongs in a media query, not here.
        </p>
      </section>
    </ContentSection>
  );
}

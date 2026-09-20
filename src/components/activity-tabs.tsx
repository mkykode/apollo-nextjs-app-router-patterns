"use client";

import { useSuspenseQuery } from "@apollo/client/react";
import { Activity, Suspense, useState } from "react";
import { GetTrackDocument, GetTracksDocument } from "@/__generated__/graphql";
import { humanReadableTimeFromSeconds } from "@/lib/helpers";
import { ContentSection } from "./content-section";
import styles from "./activity-tabs.module.css";

type Tab = "notes" | "quick-look";

/**
 * React's <Activity>, doing both of the jobs it exists for.
 *
 * Conditional rendering destroys a component: `{isOpen && <Panel />}` unmounts it, and its
 * state and its DOM go with it. <Activity mode="hidden"> keeps the component mounted, hides
 * it with `display: none`, and tears down its Effects, so it behaves like an unmounted
 * component that happens to remember everything.
 *
 * Two consequences, one checkbox to watch them both:
 *
 * 1. State survives. The draft note is an uncontrolled <textarea>, so the text is DOM state
 *    and nothing in React is holding it. Unmounted, it is gone; hidden, the DOM node is still
 *    there and so is the draft.
 * 2. Hidden content still renders, at a lower priority, so a query underneath it starts
 *    early. The quick look suspends on GetTrack for a track this page has not fetched. While
 *    the tab is hidden, Apollo is already in flight, so the first click has no fallback to
 *    show. That is the pre-render the React docs describe, and it is the same idea as this
 *    route's useBackgroundQuery, moved up to the boundary instead of the hook.
 *
 * Note the Suspense boundary sits above both Activities, as in React's own example. A hidden
 * Activity that suspends does not trip it: that is what makes the pre-render invisible.
 */
export function ActivityTabs({ currentTrackId }: { currentTrackId: string }) {
  const { data } = useSuspenseQuery(GetTracksDocument);
  const others = data.tracksForHome.filter(({ id }) => id !== currentTrackId);
  // The last one, not the first: /suspense's TrackPreview defaults to others[0], and sharing a
  // track between the two demos would let one warm the other's cache and hide the point here.
  const quickLookId = others.at(-1)?.id ?? currentTrackId;

  const [tab, setTab] = useState<Tab>("notes");
  const [hideWithActivity, setHideWithActivity] = useState(true);

  return (
    <ContentSection>
      <section className={styles.panel} aria-labelledby="activity-tabs-heading">
        <h4 id="activity-tabs-heading">Hide a tab without unmounting it</h4>
        <p className={styles.label}>
          The quick look below has already rendered and fetched its track, even though you have
          not opened it: look for its GetTrack request in the network tab. Type a draft note,
          switch tabs and come back, and the draft is still there too. Untick the box to hide by
          unmounting instead: the hidden panel stops existing, and the draft goes with it.
        </p>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={hideWithActivity}
            onChange={(event) => setHideWithActivity(event.target.checked)}
          />
          Hide with &lt;Activity&gt; instead of unmounting
        </label>

        <div className={styles.tabs} role="tablist" aria-label="Track panel">
          <TabButton tab="notes" activeTab={tab} onSelect={setTab}>
            Notes
          </TabButton>
          <TabButton tab="quick-look" activeTab={tab} onSelect={setTab}>
            Quick look
          </TabButton>
        </div>

        <div className={styles.panels}>
          <Suspense fallback={<p className={styles.fallback}>Loading quick look...</p>}>
            {hideWithActivity ? (
              <>
                <Activity mode={tab === "notes" ? "visible" : "hidden"}>
                  <Notes />
                </Activity>
                <Activity mode={tab === "quick-look" ? "visible" : "hidden"}>
                  <QuickLook trackId={quickLookId} />
                </Activity>
              </>
            ) : (
              <>
                {tab === "notes" && <Notes />}
                {tab === "quick-look" && <QuickLook trackId={quickLookId} />}
              </>
            )}
          </Suspense>
        </div>
      </section>
    </ContentSection>
  );
}

function TabButton({
  tab,
  activeTab,
  onSelect,
  children,
}: {
  tab: Tab;
  activeTab: Tab;
  onSelect: (tab: Tab) => void;
  children: string;
}) {
  const isActive = tab === activeTab;
  return (
    <button
      type="button"
      role="tab"
      id={`activity-tab-${tab}`}
      aria-selected={isActive}
      aria-controls={`activity-panel-${tab}`}
      className={styles.tab}
      data-active={isActive}
      onClick={() => onSelect(tab)}
    >
      {children}
    </button>
  );
}

/**
 * Uncontrolled on purpose. The text lives only in the DOM node, so it is the clearest possible
 * demonstration: React is not holding this value anywhere, and it survives purely because
 * Activity left the element in the document.
 */
function Notes() {
  return (
    <div
      role="tabpanel"
      id="activity-panel-notes"
      aria-labelledby="activity-tab-notes"
      data-testid="activity-notes"
    >
      <label className={styles.field}>
        Draft note
        <textarea
          className={styles.textarea}
          rows={3}
          placeholder="Type here, switch tabs, come back."
        />
      </label>
    </div>
  );
}

function QuickLook({ trackId }: { trackId: string }) {
  const { data } = useSuspenseQuery(GetTrackDocument, { variables: { trackId } });
  const { title, author, modulesCount, length, numberOfViews } = data.track;

  return (
    <div
      role="tabpanel"
      id="activity-panel-quick-look"
      aria-labelledby="activity-tab-quick-look"
      data-testid="activity-quick-look"
    >
      <p className={styles.quickLook}>
        <strong>{title}</strong> by {author.name}: {modulesCount ?? 0} modules,{" "}
        {humanReadableTimeFromSeconds(length ?? 0)}, {numberOfViews ?? 0} view(s)
      </p>
    </div>
  );
}

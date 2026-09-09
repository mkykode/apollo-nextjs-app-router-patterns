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

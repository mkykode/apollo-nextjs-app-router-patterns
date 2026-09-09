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

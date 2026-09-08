import styles from "./loading.module.css";

/** Full-height centered spinner (space-kit LoadingSpinner, size large, grayscale theme). */
export function Loading() {
  return (
    <div className={styles.container}>
      <svg
        role="progressbar"
        aria-label="Loading"
        viewBox="0 0 100 100"
        className={styles.spinner}
        data-testid="spinner"
      >
        <circle
          strokeWidth="8"
          stroke="var(--silver-darker)"
          fill="transparent"
          r="41"
          cx="50"
          cy="50"
        />
        <g transform="translate(50 50)">
          <circle className={styles.asteroid} fill="var(--grey-light)" r="10" cx="40" cy="0" />
        </g>
      </svg>
    </div>
  );
}

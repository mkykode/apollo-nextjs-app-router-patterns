import type { PropsWithChildren } from "react";
import styles from "./page-container.module.css";

interface PageContainerProps {
  /** Lay children out as a centered, wrapping row (the track card grid). */
  grid?: boolean;
}

/** Main content area between header and footer. */
export function PageContainer({ grid, children }: PropsWithChildren<PageContainerProps>) {
  return (
    <main className={grid ? `${styles.container} ${styles.grid}` : styles.container}>
      {children}
    </main>
  );
}

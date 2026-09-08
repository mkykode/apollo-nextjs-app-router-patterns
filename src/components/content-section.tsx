import type { PropsWithChildren } from "react";
import styles from "./content-section.module.css";

/** Narrow column for text-heavy content such as the track detail. */
export function ContentSection({ children }: PropsWithChildren) {
  return <div className={styles.content}>{children}</div>;
}

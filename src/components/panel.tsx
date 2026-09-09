import type { PropsWithChildren } from "react";
import styles from "./panel.module.css";

/** A centered card for the pages that are not about tracks: sign-in and account. */
export function Panel({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section className={styles.panel}>
      <h1>{title}</h1>
      {children}
    </section>
  );
}

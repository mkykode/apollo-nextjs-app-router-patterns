import Link from "next/link";
import { Button } from "./button";
import styles from "./not-found-message.module.css";

/** Shared by app/not-found.tsx (server-side 404s) and error.tsx (404s thrown in the browser). */
export function NotFoundMessage() {
  return (
    <section className={styles.notFound} data-testid="not-found">
      <h2>Houston, that track is not on the map</h2>
      <p>The API has no track with that id. Pick one from the catalog instead.</p>
      <Link href="/">
        <Button>Back to the patterns</Button>
      </Link>
    </section>
  );
}

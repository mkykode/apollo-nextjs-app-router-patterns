import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { PATTERNS, tracksHref } from "@/lib/patterns";
import styles from "./page.module.css";

/**
 * Nothing here depends on the request, so the page is prerendered. `dynamic = "error"` turns that
 * into a guarantee: if someone later reads cookies(), headers(), or searchParams here, the build
 * fails instead of silently making the page dynamic.
 */
export const dynamic = "error";

/**
 * Index of the data-fetching patterns. Each one renders the same Catstronauts pages
 * (track list and track detail) with a different Apollo Client strategy.
 */
export default function HomePage() {
  return (
    <PageContainer>
      <section className={styles.intro}>
        <h1>Same app, five ways to fetch</h1>
        <p>
          Every pattern below renders the track catalog and the track detail page. Use the
          header navigation to switch pattern while staying on the same page, and watch the
          network tab: the GraphQL request moves between the server and the browser.
        </p>
      </section>
      <ul className={styles.list}>
        {PATTERNS.map((pattern) => (
          <li key={pattern.slug}>
            <Link href={tracksHref(pattern.slug)} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{pattern.title}</h3>
                <span className={styles.badge}>{pattern.fetchedBy}</span>
              </div>
              <p>{pattern.summary}</p>
              <code className={styles.route}>/{pattern.slug}</code>
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}

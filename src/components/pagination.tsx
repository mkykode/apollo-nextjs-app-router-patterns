import type { Route } from "next";
import Link from "next/link";
import { searchHref } from "@/lib/search";
import styles from "./pagination.module.css";

interface PaginationProps {
  pathname: string;
  page: number;
  totalPages: number;
  query: string;
}

/** Plain links: pagination is navigation, so it works before hydration and with JavaScript off. */
export function Pagination({ pathname, page, totalPages, query }: PaginationProps) {
  if (totalPages <= 1) return null;
  const href = (target: number) => searchHref(pathname, { query, page: target }) as Route;

  return (
    <nav aria-label="Pagination" className={styles.pagination}>
      {page > 1 ? (
        <Link href={href(page - 1)} className={styles.link}>
          Previous
        </Link>
      ) : (
        <span className={`${styles.link} ${styles.disabled}`}>Previous</span>
      )}
      <ul className={styles.pages}>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((target) => (
          <li key={target}>
            <Link
              href={href(target)}
              className={styles.link}
              aria-current={target === page ? "page" : undefined}
            >
              {target}
            </Link>
          </li>
        ))}
      </ul>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={styles.link}>
          Next
        </Link>
      ) : (
        <span className={`${styles.link} ${styles.disabled}`}>Next</span>
      )}
    </nav>
  );
}

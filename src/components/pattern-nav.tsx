"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PATTERNS } from "@/lib/patterns";
import styles from "./pattern-nav.module.css";

/**
 * Switch data-fetching pattern while staying on the same page:
 * /rsc/track/c_0 -> /preload/track/c_0. Client Component because it reads the pathname.
 */
export function PatternNav() {
  const pathname = usePathname();
  const active = PATTERNS.find(
    ({ slug }) => pathname === `/${slug}` || pathname.startsWith(`/${slug}/`),
  );
  const rest = active ? pathname.slice(active.slug.length + 1) : "";

  return (
    <nav aria-label="Data-fetching pattern">
      <ul className={styles.list}>
        {PATTERNS.map((pattern) => (
          <li key={pattern.slug}>
            <Link
              href={`/${pattern.slug}${rest}` as Route}
              className={styles.link}
              aria-current={pattern === active ? "page" : undefined}
            >
              {pattern.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

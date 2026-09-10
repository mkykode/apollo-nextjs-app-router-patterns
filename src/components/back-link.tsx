import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { NAV_BACK } from "@/lib/navigation-types";
import styles from "./back-link.module.css";

/** Returns to a list. The transition type makes the pages slide the other way than a card click. */
export function BackLink({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link href={href} className={styles.link} transitionTypes={[NAV_BACK]}>
      {children}
    </Link>
  );
}

"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PATTERNS } from "@/lib/patterns";
import styles from "./pattern-nav.module.css";

/**
 * Switch data-fetching pattern while staying on the same page:
 * /rsc/track/c_0 -> /preload/track/c_0. Client Component because it reads the pathname.
 *
 * Under Cache Components the pathname is runtime data, so the header renders this inside a
 * Suspense boundary with PatternNavLinks (no active state) as the prerendered fallback.
 */
export function PatternNav() {
  return <PatternNavLinks pathname={usePathname()} />;
}

/** Where the sliding indicator sits, and which pathname it was measured for. */
interface Indicator {
  pathname: string;
  left: number;
  width: number;
}

export function PatternNavLinks({ pathname }: { pathname: string }) {
  const active = PATTERNS.find(
    ({ slug }) => pathname === `/${slug}` || pathname.startsWith(`/${slug}/`),
  );
  const rest = active ? pathname.slice(active.slug.length + 1) : "";

  const trackRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<Indicator | null>(null);

  const measure = useCallback(() => {
    const link = trackRef.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
    setIndicator(link ? { pathname, left: link.offsetLeft, width: link.offsetWidth } : null);
  }, [pathname]);

  // useLayoutEffect: read the DOM and set state before the browser paints. The indicator is
  // hidden until it has been measured for the current pathname, so with useEffect instead,
  // every navigation would paint one frame without it (or at the old position) and blink.
  useLayoutEffect(measure, [measure]);

  // useEffect: subscribe to something outside React (the viewport) and clean up. Nothing
  // here has to happen before paint, so the cheaper effect is the right one.
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const measured = indicator?.pathname === pathname;

  return (
    <nav aria-label="Data-fetching pattern">
      <div ref={trackRef} className={styles.track}>
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
        <span
          aria-hidden="true"
          data-testid="pattern-indicator"
          data-measured={measured}
          className={styles.indicator}
          style={
            indicator
              ? { transform: `translateX(${indicator.left}px)`, width: indicator.width }
              : undefined
          }
        />
      </div>
    </nav>
  );
}

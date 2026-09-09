"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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

  // useEffectEvent: the latest `measure` without making the subscription below depend on it.
  // `measure` changes with the pathname, but a viewport resize has nothing to do with
  // navigation. Listing `measure` as a dependency would remove and re-add the listeners on
  // every navigation; listing nothing would leave the handler measuring the first pathname
  // forever. An Effect Event always sees the latest props and state, never causes the
  // effect to re-run, and may only be called from inside an effect.
  const remeasure = useEffectEvent(measure);

  // useEffect: subscribe to things outside React and clean up. The viewport can resize, and
  // the web font can finish loading after the first measurement, which changes the link's
  // width. Nothing here has to happen before paint, so the cheaper effect is the right one,
  // and with no reactive values inside it, it subscribes once for the component's lifetime.
  useEffect(() => {
    // Test DOMs (happy-dom) have no Font Loading API; browsers do.
    const fonts = "fonts" in document ? document.fonts : undefined;
    window.addEventListener("resize", remeasure);
    fonts?.addEventListener("loadingdone", remeasure);
    return () => {
      window.removeEventListener("resize", remeasure);
      fonts?.removeEventListener("loadingdone", remeasure);
    };
  }, []);

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

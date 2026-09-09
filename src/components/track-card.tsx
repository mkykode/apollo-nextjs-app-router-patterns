"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useTransition } from "react";
import type { TrackCard_TrackFragment } from "@/__generated__/graphql";
import { humanReadableTimeFromSeconds } from "@/lib/helpers";
import { FavoriteButton } from "./favorite-button";
import styles from "./track-card.module.css";

interface TrackCardProps {
  track: TrackCard_TrackFragment;
  href: Route;
  /** Increments the view count; the caller decides whether that is useMutation or a Server Action. */
  onOpen: () => Promise<unknown>;
  /** Load the thumbnail eagerly (above-the-fold cards). */
  eager?: boolean;
}

const logOpenFailure = (error: unknown) =>
  console.error("Could not increment the track's view count", error);

/** Upper bound on how long navigation waits for the increment; the request itself keeps running. */
const INCREMENT_WAIT_MS = 2000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Card for the track grid. Client Component only because of the click handler.
 *
 * The increment is awaited (bounded by INCREMENT_WAIT_MS) before navigating so the detail
 * page does not render a count that is stale by one. Modifier clicks (new tab) keep the
 * browser's default navigation and fire the mutation without waiting for it.
 * The favorite button sits next to the link, not inside it: a button inside an anchor is
 * invalid HTML and two click targets would fight.
 */
export function TrackCard({ track, href, onOpen, eager = false }: TrackCardProps) {
  const { id, title, thumbnail, author, length, modulesCount } = track;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isPending) {
      // One increment per open: ignore clicks while the previous one is in flight.
      event.preventDefault();
      return;
    }
    const opensElsewhere =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    if (opensElsewhere) {
      void onOpen().catch(logOpenFailure);
      return;
    }
    event.preventDefault();
    startTransition(async () => {
      await Promise.race([onOpen().catch(logOpenFailure), sleep(INCREMENT_WAIT_MS)]);
      router.push(href);
    });
  };

  return (
    <article className={styles.card} aria-busy={isPending}>
      <Link href={href} className={styles.link} onClick={handleClick}>
        <div className={styles.content}>
          <div className={styles.imageContainer}>
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt={title}
                fill
                sizes="(min-width: 992px) 340px, (min-width: 768px) 50vw, 90vw"
                className={styles.image}
                loading={eager ? "eager" : "lazy"}
              />
            ) : null}
          </div>
          <div className={styles.body}>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.footer}>
              {author.photo ? (
                <Image
                  src={author.photo}
                  alt=""
                  width={30}
                  height={30}
                  className={styles.authorImage}
                />
              ) : null}
              <div className={styles.authorAndTrack}>
                <div className={styles.authorName}>{author.name}</div>
                <div className={styles.trackLength}>
                  {modulesCount ?? 0} modules - {humanReadableTimeFromSeconds(length ?? 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
      <FavoriteButton trackId={id} title={title} />
    </article>
  );
}

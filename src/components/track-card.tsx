"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { TrackCard_TrackFragment } from "@/__generated__/graphql";
import { humanReadableTimeFromSeconds } from "@/lib/helpers";
import styles from "./track-card.module.css";

interface TrackCardProps {
  track: TrackCard_TrackFragment;
  href: Route;
  /** Fired when the card is opened; the caller decides how the view count is incremented. */
  onOpen: () => void;
  /** Load the thumbnail eagerly (above-the-fold cards). */
  priority?: boolean;
}

/** Card for the track grid. Client Component only because of the click handler. */
export function TrackCard({ track, href, onOpen, priority = false }: TrackCardProps) {
  const { title, thumbnail, author, length, modulesCount } = track;
  return (
    <Link href={href} className={styles.card} onClick={onOpen}>
      <div className={styles.content}>
        <div className={styles.imageContainer}>
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={title}
              fill
              sizes="(min-width: 992px) 340px, (min-width: 768px) 50vw, 90vw"
              className={styles.image}
              priority={priority}
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
                {modulesCount} modules - {humanReadableTimeFromSeconds(length ?? 0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

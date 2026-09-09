import type { Route } from "next";
import Link from "next/link";
import styles from "./more-tracks.module.css";

interface MoreTracksProps {
  tracks: readonly { id: string; title: string; author: { name: string } }[];
  href: (trackId: string) => Route;
}

/** A compact list of other tracks; the data-fetching wrapper decides which pattern it links to. */
export function MoreTracks({ tracks, href }: MoreTracksProps) {
  return (
    <section className={styles.more} aria-labelledby="more-tracks-heading">
      <h4 id="more-tracks-heading">More tracks</h4>
      <ul className={styles.list}>
        {tracks.map((track) => (
          <li key={track.id}>
            <Link href={href(track.id)} className={styles.link}>
              {track.title}
            </Link>{" "}
            <span className={styles.author}>by {track.author.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

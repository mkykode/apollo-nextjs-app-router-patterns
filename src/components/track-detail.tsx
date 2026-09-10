import Image from "next/image";
import { ViewTransition } from "react";
import type { TrackDetail_TrackFragment } from "@/__generated__/graphql";
import { humanReadableTimeFromSeconds } from "@/lib/helpers";
import { Button } from "./button";
import { ContentSection } from "./content-section";
import { IconBook, IconRun, IconTime, IconView } from "./icons";
import { MarkdownContent } from "./md-content";
import styles from "./track-detail.module.css";

/**
 * Main content of a track: author, length, number of views, modules list, description.
 * Pure presentational Server Component; every pattern renders it with data from its own client.
 *
 * The cover carries the same <ViewTransition> name as the card's, so a navigation whose new
 * page renders in the same commit (a prefetched static page) morphs the thumbnail into it. When
 * the page suspends first, no pair forms and the cover simply arrives with its section.
 */
export function TrackDetail({ track }: { track: TrackDetail_TrackFragment }) {
  const { id, title, description, thumbnail, author, length, modulesCount, modules, numberOfViews } =
    track;

  return (
    <ContentSection>
      {thumbnail ? (
        <ViewTransition name={`track-cover-${id}`} share="morph" default="none">
          <Image
            src={thumbnail}
            alt=""
            width={800}
            height={400}
            sizes="(min-width: 800px) 800px, 100vw"
            className={styles.coverImage}
            preload
          />
        </ViewTransition>
      ) : null}
      <div className={styles.trackDetails}>
        <div className={styles.detailRow}>
          <h1>{title}</h1>
        </div>
        <div className={styles.detailRow}>
          <div className={styles.detailItem}>
            <h4>Track details</h4>
            <div className={styles.iconAndLabel}>
              <IconView size={16} />
              <div className={styles.viewCount}>{`${numberOfViews ?? 0} view(s)`}</div>
            </div>
            <div className={styles.iconAndLabel}>
              <IconBook size={14} />
              <div>{`${modulesCount ?? 0} modules`}</div>
            </div>
            <div className={styles.iconAndLabel}>
              <IconTime size={14} />
              <div>{humanReadableTimeFromSeconds(length ?? 0)}</div>
            </div>
          </div>
          <div className={styles.detailItem}>
            <h4>Author</h4>
            {author.photo ? (
              <Image
                src={author.photo}
                alt=""
                width={30}
                height={30}
                className={styles.authorImage}
              />
            ) : null}
            <div className={styles.authorName}>{author.name}</div>
          </div>
          <div>
            <Button icon={<IconRun size={20} />}>Start Track</Button>
          </div>
        </div>
        <div className={styles.moduleListContainer}>
          <div className={styles.detailItem}>
            <h4>Modules</h4>
            <ul>
              {modules.map((module) => (
                <li key={module.id}>
                  <div>{module.title}</div>
                  <div className={styles.moduleLength}>
                    {humanReadableTimeFromSeconds(module.length ?? 0)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <MarkdownContent content={description} />
    </ContentSection>
  );
}

"use client";

import type { TransportedQueryRef } from "@apollo/client-integration-nextjs";
import { useQueryRefHandlers, useReadQuery } from "@apollo/client/react";
import { useTransition } from "react";
import type { GetTrackQuery, GetTrackQueryVariables } from "@/__generated__/graphql";
import { Button } from "@/components/button";
import { TrackDetail } from "@/components/track-detail";
import styles from "./track-client.module.css";

interface TrackClientProps {
  queryRef: TransportedQueryRef<GetTrackQuery, GetTrackQueryVariables>;
}

export function TrackClient({ queryRef }: TrackClientProps) {
  // Order matters: useQueryRefHandlers before useReadQuery.
  const { refetch } = useQueryRefHandlers(queryRef);
  const { data } = useReadQuery(queryRef);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <div className={styles.toolbar}>
        <Button disabled={isPending} onClick={() => startTransition(() => void refetch())}>
          {isPending ? "Refreshing..." : "Refresh view count"}
        </Button>
      </div>
      <TrackDetail track={data.track} />
    </>
  );
}

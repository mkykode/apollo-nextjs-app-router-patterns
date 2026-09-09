"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { incrementTrackViews } from "@/lib/actions/increment-track-views";
import { Button } from "./button";
import { ContentSection } from "./content-section";
import styles from "./register-view-form.module.css";

/**
 * A Server Action called from a button instead of a form. React 19 transitions accept an
 * async function: isPending stays true from the click until everything inside has settled.
 * The action itself revalidates nothing, so router.refresh() re-fetches the RSC payload for
 * this route inside the same transition, and the page updates without a fallback.
 */
export function QuickViewButton({ trackId }: { trackId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const registerOne = () =>
    startTransition(async () => {
      await incrementTrackViews(trackId);
      router.refresh();
    });

  return (
    <ContentSection>
      <div className={styles.form}>
        <p className={styles.label}>
          Server Action from a button: useTransition wraps the call and the router refresh, so
          the count in the details box updates in place, without a form or a fallback.
        </p>
        <Button onClick={registerOne} disabled={isPending} aria-busy={isPending}>
          {isPending ? "Registering..." : "Quick +1 view"}
        </Button>
      </div>
    </ContentSection>
  );
}

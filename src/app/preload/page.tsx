import { Suspense } from "react";
import { GetTracksDocument } from "@/__generated__/graphql";
import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";
import { PreloadQuery } from "@/lib/apollo/rsc-client";
import { TracksClient } from "./tracks-client";

/**
 * Pattern 3a: PreloadQuery + useSuspenseQuery.
 * The Server Component starts the GraphQL request immediately. PreloadQuery streams the
 * result into the Client Component cache as a "simulated network request", so the
 * useSuspenseQuery in TracksClient waits for it instead of fetching again.
 * Data fetched this way is client data: never read it from a Server Component.
 */
export default function PreloadTracksPage() {
  return (
    <PageContainer grid>
      <PreloadQuery query={GetTracksDocument}>
        <Suspense fallback={<Loading />}>
          <TracksClient />
        </Suspense>
      </PreloadQuery>
    </PageContainer>
  );
}

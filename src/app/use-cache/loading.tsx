import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";

/** The detail page reads `params`, which Cache Components require to sit under a Suspense boundary. */
export default function UseCacheLoading() {
  return (
    <PageContainer>
      <Loading />
    </PageContainer>
  );
}

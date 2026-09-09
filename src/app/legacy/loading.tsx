import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";

/**
 * Suspense boundary for this pattern's routes: the shell streams first, the data follows.
 * There is deliberately no loading.tsx at the root. A boundary above a page means its shell
 * is sent (status 200) before the page runs, so a notFound() inside it can only render in
 * place; routes that must answer with a real 404 (see /revalidate) stay outside any boundary.
 */
export default function LegacyLoading() {
  return (
    <PageContainer>
      <Loading />
    </PageContainer>
  );
}

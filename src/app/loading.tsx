import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";

// Route-level Suspense boundary: the shell (header, footer) streams first, the page content follows.
export default function RouteLoading() {
  return (
    <PageContainer>
      <Loading />
    </PageContainer>
  );
}

import { Loading } from "@/components/loading";
import { PageContainer } from "@/components/page-container";

/**
 * Root Suspense boundary. On this branch it stays at the root on purpose: Cache Components
 * need a boundary above every read of request-time data, and the pattern layouts read it
 * (`await connection()`), so the boundary has to sit above them. The list and the RSC detail
 * route override it with skeleton-shaped loading.tsx files of their own.
 */
export default function RouteLoading() {
  return (
    <PageContainer>
      <Loading />
    </PageContainer>
  );
}

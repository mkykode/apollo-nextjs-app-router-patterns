import { NotFoundMessage } from "@/components/not-found-message";
import { PageContainer } from "@/components/page-container";

/** Rendered by notFound() anywhere below the root, and for URLs that match no route. */
export default function NotFound() {
  return (
    <PageContainer>
      <NotFoundMessage />
    </PageContainer>
  );
}

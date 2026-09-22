import { PageContainer } from "@/components/page-container";
import { Suspense } from "react";
import ProductList from "./product-list";
import { products } from "./data";
import { query } from "@/lib/apollo/rsc-client";
import { cacheLife } from "next/dist/server/use-cache/cache-life";
import { cacheTag } from "next/cache";
async function getProducts() {
  //
  // const data = await query()

  'use cache'
  cacheLife('hours')
  cacheTag('catalog')

}

export default async function Catalog({ searchParams }: PageProps<"/catalog">) {
  return (
    <PageContainer>
      <h1>Products List</h1>
      <Suspense fallback={<p>Loading products...</p>}>
        <ProductList products={products} searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  )
}

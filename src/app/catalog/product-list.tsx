import CategoryFilters from "./filter";
import { Products } from "./types";

export default async function ProductList(
  {
    products,
    searchParams,
  }: {
    products: Products,
    searchParams: PageProps<"/catalog">['searchParams']
  }) {
  const currentCategory = (await (searchParams)).category ?? undefined
  const category = Array.isArray(currentCategory) ? currentCategory[0] : currentCategory
  const filteredProducts = category ? products.filter(p => p.category === category) : products

  return <>
    <CategoryFilters currentFilter={category} products={products} />
    <ul>

      {filteredProducts.map(p => {
        return <li key={p.name}>{p.name}</li>
      })}
    </ul>
  </>
}

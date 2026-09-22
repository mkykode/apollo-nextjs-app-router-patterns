import { Button } from "@/components/button";
import { Products } from "./types";
import Form from "next/form";


type CategoryFiltersProps = {
  products: Products
  currentFilter?: string
}
export default function CategoryFilters(
  { currentFilter, products }: CategoryFiltersProps) {
  const allCategories = [...new Set(products.map(p => p.category))]
  return <Form
    action="/catalog"
  >
    <select
      id="select-filter"
      name="category"
      key={currentFilter ?? ""}
      defaultValue={currentFilter ?? ""}
      style={
        {
          width: "100%",
          display: "block",
          height: "30px",
          marginBlock: "1rem"
        }
      }
    >
      <option value="">All Categories</option>
      {allCategories.map(c => {
        return <option key={c} value={c}>{c}</option>
      })}
    </select>
    <Button type="submit">Filter</Button>
  </Form>

}

'use server'
import { getSession } from "better-auth/api";
import { updateTag } from "next/cache";
import { z } from "zod";


const CheckoutInput = z.object(
  {
    items: z.array(
      z.object({
        productId: z.string().min(1),
        qty: z.coerce.number().int().min(1).max(20)
      })
    ).min(1)
  }
)


export async function checkout(prev: any, form: FormData): Promise<any> {
  const parsed = CheckoutInput.safeParse({ items: JSON.parse(String(form.get('items'))) })
  if (!parsed.success) return { status: "invalid", message: 'Checkt the cart and try again' }

  const session = await getSession()
  if (!session) return { staus: "failed", message: "Sing in to check out" }
  //  if this does work we process our order
  updateTag(`cart:user`)
  return { status: 'charged' }
}

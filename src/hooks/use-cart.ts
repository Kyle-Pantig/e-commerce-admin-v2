import { useContext } from "react"
import { CartContext, CartContextValue } from "@/contexts/cart-context"

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

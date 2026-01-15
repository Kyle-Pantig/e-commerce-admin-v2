import { useContext } from "react"
import { WishlistContext, WishlistContextValue } from "@/contexts/wishlist-context"

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}

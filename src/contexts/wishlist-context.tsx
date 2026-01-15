"use client"

import { createContext, useCallback, ReactNode, useMemo, useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { wishlistApi } from "@/lib/api"
import { useAuth } from "./auth-context"

export interface WishlistContextValue {
  wishlistProductIds: string[]
  wishlistCount: number
  isLoading: boolean
  isInWishlist: (productId: string) => boolean
  toggleWishlist: (productId: string) => Promise<void>
  isAuthenticated: boolean
}

export const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { isAuthenticated, authChecked } = useAuth()
  const [wasAuthenticated, setWasAuthenticated] = useState(false)

  // React to auth changes
  useEffect(() => {
    if (!authChecked) return

    if (isAuthenticated && !wasAuthenticated) {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] })
    } else if (!isAuthenticated && wasAuthenticated) {
      queryClient.setQueryData(["wishlist", "product-ids"], { product_ids: [] })
    }

    setWasAuthenticated(isAuthenticated)
  }, [isAuthenticated, authChecked, wasAuthenticated, queryClient])

  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ["wishlist", "product-ids"],
    queryFn: () => wishlistApi.getProductIds(),
    enabled: isAuthenticated && authChecked,
    staleTime: 1000 * 60 * 5,
  })

  const wishlistProductIds = data?.product_ids || []
  const wishlistCount = wishlistProductIds.length

  const toggleMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.toggle(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: ["wishlist", "product-ids"] })
      const previousData = queryClient.getQueryData<{ product_ids: string[] }>(["wishlist", "product-ids"])

      queryClient.setQueryData<{ product_ids: string[] }>(["wishlist", "product-ids"], (old) => {
        if (!old) return { product_ids: [productId] }
        const exists = old.product_ids.includes(productId)
        return {
          product_ids: exists
            ? old.product_ids.filter(id => id !== productId)
            : [...old.product_ids, productId]
        }
      })

      return { previousData }
    },
    onError: (_err, _productId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["wishlist", "product-ids"], context.previousData)
      }
    },
    onSettled: () => {
      // Invalidate both the product IDs and full wishlist queries
      queryClient.invalidateQueries({ queryKey: ["wishlist", "product-ids"] })
      queryClient.invalidateQueries({ queryKey: ["wishlist", "full"] })
    },
  })

  const isInWishlist = useCallback(
    (productId: string) => wishlistProductIds.includes(productId),
    [wishlistProductIds]
  )

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!isAuthenticated) {
        throw new Error("Please login to add items to your wishlist")
      }
      await toggleMutation.mutateAsync(productId)
    },
    [isAuthenticated, toggleMutation]
  )

  const contextValue = useMemo<WishlistContextValue>(() => ({
    wishlistProductIds,
    wishlistCount,
    isLoading: !authChecked || (isAuthenticated && queryLoading),
    isInWishlist,
    toggleWishlist,
    isAuthenticated,
  }), [wishlistProductIds, wishlistCount, authChecked, isAuthenticated, queryLoading, isInWishlist, toggleWishlist])

  return (
    <WishlistContext.Provider value={contextValue}>
      {children}
    </WishlistContext.Provider>
  )
}

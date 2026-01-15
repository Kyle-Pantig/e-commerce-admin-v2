"use client"

import { useQuery } from "@tanstack/react-query"
import { wishlistApi } from "@/lib/api"
import { MaxWidthLayout } from "@/components/store"
import { ProductCard, ProductCardSkeleton } from "@/components/store/product-card"
import { Button } from "@/components/ui/button"
import { Heart, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useWishlist } from "@/hooks/use-wishlist"
import type { ProductListItem } from "@/lib/api/types"

export default function WishlistPage() {
  const { isAuthenticated, isLoading: authLoading } = useWishlist()

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist", "full"],
    queryFn: () => wishlistApi.get(),
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: "always",
  })

  const wishlistItems = data?.items || []

  // Convert wishlist items to ProductListItem format for ProductCard
  const products: ProductListItem[] = wishlistItems.map((item) => ({
    id: item.product.id,
    name: item.product.name,
    slug: item.product.slug,
    sku: null,
    status: item.product.status as "ACTIVE" | "DRAFT" | "DISABLED" | "ARCHIVED",
    base_price: item.product.base_price,
    sale_price: item.product.sale_price,
    stock: item.product.stock,
    category_id: "",
    category_name: null,
    is_featured: false,
    has_variants: item.product.has_variants,
    is_new: item.product.is_new,
    new_until: null,
    primary_image: item.product.primary_image,
    // Use images from API if available, fallback to primary_image
    images: item.product.images && item.product.images.length > 0
      ? item.product.images.map(img => ({
          id: img.id,
          url: img.url,
          alt_text: img.alt_text || item.product.name,
          display_order: img.display_order,
          is_primary: img.is_primary,
        }))
      : item.product.primary_image 
        ? [{ url: item.product.primary_image, alt_text: item.product.name }] 
        : null,
    // Map variants from wishlist API response
    variants: item.product.variants?.map(v => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      sale_price: v.sale_price,
      stock: v.stock,
      is_active: v.is_active,
      options: v.options,
    })) || null,
    created_at: item.created_at,
    updated_at: item.created_at,
  }))

  // Not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <MaxWidthLayout className="py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Heart className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-bold mb-2">My Wishlist</h1>
          <p className="text-muted-foreground mb-6">
            Please login to view your wishlist
          </p>
          <Link href="/login">
            <Button>Login</Button>
          </Link>
        </div>
      </MaxWidthLayout>
    )
  }

  // Loading state
  if (isLoading || authLoading) {
    return (
      <MaxWidthLayout className="py-12">
        <h1 className="text-2xl font-bold mb-8">My Wishlist</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </MaxWidthLayout>
    )
  }

  // Empty wishlist
  if (products.length === 0) {
    return (
      <MaxWidthLayout className="py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Heart className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your wishlist is empty</h1>
          <p className="text-muted-foreground mb-6">
            Browse our products and add your favorites to your wishlist
          </p>
          <Link href="/shop">
            <Button>
              <ShoppingBag className="w-4 h-4 mr-2" />
              Start Shopping
            </Button>
          </Link>
        </div>
      </MaxWidthLayout>
    )
  }

  return (
    <MaxWidthLayout className="py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Wishlist</h1>
        <p className="text-muted-foreground">
          {products.length} {products.length === 1 ? "item" : "items"}
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </MaxWidthLayout>
  )
}

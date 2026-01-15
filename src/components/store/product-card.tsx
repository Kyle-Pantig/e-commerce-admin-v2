"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { IconShoppingCart, IconHeart, IconHeartFilled } from "@tabler/icons-react"
import { cn, formatPrice } from "@/lib/utils"
import type { ProductListItem } from "@/lib/api/types"
import { useWishlist } from "@/hooks/use-wishlist"
import { toast } from "sonner"

interface ProductCardProps {
  product: ProductListItem
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const router = useRouter()
  const [isHovering, setIsHovering] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const { isInWishlist, toggleWishlist, isAuthenticated } = useWishlist()
  const [isToggling, setIsToggling] = useState(false)
  
  const inWishlist = isInWishlist(product.id)

  const handleWishlistClick = async () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    
    setIsToggling(true)
    try {
      await toggleWishlist(product.id)
    } catch {
      toast.error("Failed to update wishlist")
    } finally {
      setIsToggling(false)
    }
  }
  
  // Get all images, sorted with primary first, fallback to primary_image if no images array
  const images = product.images && product.images.length > 0 
    ? [...product.images].sort((a, b) => {
        // Primary image always comes first
        if (a.is_primary && !b.is_primary) return -1
        if (!a.is_primary && b.is_primary) return 1
        // Then sort by display_order
        return (a.display_order ?? 0) - (b.display_order ?? 0)
      })
    : product.primary_image 
      ? [{ url: product.primary_image, alt_text: product.name }] 
      : []

  const hasMultipleImages = images.length > 1

  // Slideshow effect on hover
  useEffect(() => {
    if (isHovering && hasMultipleImages) {
      intervalRef.current = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length)
      }, 1000) // Change image every 1 second
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setCurrentImageIndex(0)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isHovering, hasMultipleImages, images.length])

  // Calculate total stock - for variants, sum up active variant stocks
  const activeVariants = product.has_variants && product.variants && product.variants.length > 0
    ? product.variants.filter(v => v.is_active)
    : []
  
  const totalStock = activeVariants.length > 0
    ? activeVariants.reduce((sum, v) => sum + (v.stock || 0), 0)
    : product.stock

  const isOutOfStock = totalStock <= 0

  // Price calculations for variants
  const hasVariants = activeVariants.length > 0
  
  // For variants: calculate price range
  const variantPrices = hasVariants
    ? activeVariants
        .map(v => {
          const basePrice = v.price ?? 0
          const salePrice = v.sale_price ?? 0
          // Effective price: use sale_price if valid, otherwise base price
          const effectivePrice = salePrice > 0 ? salePrice : basePrice
          // Has sale only if both prices are > 0 and sale < base
          const hasSale = salePrice > 0 && basePrice > 0 && salePrice < basePrice
          return { effectivePrice, basePrice, hasSale }
        })
        .filter(p => p.effectivePrice > 0) // Only include variants with a valid display price
    : []
  
  const lowestPrice = hasVariants && variantPrices.length > 0
    ? Math.min(...variantPrices.map(p => p.effectivePrice))
    : (product.sale_price ?? product.base_price)
  
  // For highest price, only consider base prices that are > 0 from variants
  const validBasePrices = variantPrices.filter(p => p.basePrice > 0).map(p => p.basePrice)
  // For products with variants, ONLY use variant base prices (don't fall back to product base_price)
  const highestPrice = hasVariants
    ? (validBasePrices.length > 0 ? Math.max(...validBasePrices) : 0)
    : product.base_price
  
  // Only show price range if there's an actual difference AND both prices are valid (> 0)
  const showPriceRange = hasVariants && lowestPrice > 0 && highestPrice > 0 && lowestPrice < highestPrice
  const hasAnySale = hasVariants
    ? variantPrices.some(p => p.hasSale)
    : (product.sale_price != null && product.sale_price > 0 && product.sale_price < product.base_price)

  // For non-variant products
  const hasDiscount = !hasVariants && product.sale_price && product.sale_price < product.base_price
  const discountPercent = hasDiscount
    ? Math.round((1 - product.sale_price! / product.base_price) * 100)
    : 0

  const currentImage = images[currentImageIndex]

  const productUrl = `/shop/products/${product.slug}`

  return (
    <div 
      className={cn("h-full", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="border rounded-lg p-3 transition-colors hover:border-foreground/20 h-full flex flex-col">
        {/* Clickable Image */}
        <Link href={productUrl}>
          <div className={cn(
            "relative aspect-square rounded-md overflow-hidden bg-muted mb-3",
            isOutOfStock && "opacity-60"
          )}>
            {currentImage ? (
              <Image
                src={currentImage.url}
                alt={currentImage.alt_text || product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <IconShoppingCart className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
            
            {/* New Badge */}
            {product.is_new && (
              <div className="absolute top-2 left-2">
                <span className="text-[10px] font-medium px-2 py-0.5 bg-primary text-primary-foreground rounded-full">
                  New
                </span>
              </div>
            )}

            {/* Image indicators */}
            {hasMultipleImages && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      idx === currentImageIndex 
                        ? "bg-white" 
                        : "bg-white/50"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </Link>

        <div className="flex-1 flex flex-col">
          {/* Clickable Product Name */}
          <Link href={productUrl}>
            <h3 className="text-sm font-medium line-clamp-1 hover:underline mb-1">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-center gap-1.5 mt-auto">
            <div className="flex items-center gap-1.5 flex-1">
              {hasVariants ? (
                // Variant product pricing
                <>
                  <span className={cn("text-sm font-medium", hasAnySale && "text-red-600")}>
                    {formatPrice(lowestPrice)}
                  </span>
                  {showPriceRange && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(highestPrice)}
                    </span>
                  )}
                  {hasAnySale && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-red-500 text-white rounded-full">
                      Sale
                    </span>
                  )}
                </>
              ) : (
                // Non-variant product pricing
                <>
                  <span className={cn("text-sm font-medium", hasDiscount && "text-red-600")}>
                    {formatPrice(hasDiscount ? product.sale_price! : product.base_price)}
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.base_price)}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 bg-red-500 text-white rounded-full">
                        -{discountPercent}%
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
            
            {/* Wishlist Button - Always visible */}
            <button
              onClick={handleWishlistClick}
              disabled={isToggling}
              className={cn(
                "p-1.5 rounded-full hover:bg-muted transition-all",
                isToggling && "cursor-wait"
              )}
              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              {inWishlist ? (
                <IconHeartFilled className="w-4 h-4 text-red-500" />
              ) : (
                <IconHeart className="w-4 h-4 text-muted-foreground hover:text-red-500 transition-colors" />
              )}
            </button>
          </div>
          {isOutOfStock && (
            <p className="text-xs text-muted-foreground mt-1">Out of stock</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Skeleton loader for product card
export function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="aspect-square rounded-lg bg-muted animate-pulse" />
      <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
    </div>
  )
}

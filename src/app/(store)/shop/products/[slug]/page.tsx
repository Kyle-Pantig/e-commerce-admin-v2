"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  IconShoppingCart,
  IconHeart,
  IconHeartFilled,
  IconShare,
  IconTruck,
  IconShieldCheck,
  IconRefresh,
  IconMinus,
  IconPlus,
  IconCheck,
  IconX,
  IconLoader2,
  IconTag,
} from "@tabler/icons-react"
import { productsApi, discountsApi } from "@/lib/api"
import type { Product } from "@/lib/api/types"
import type { DiscountCode } from "@/lib/api"
import { cn, formatPrice, formatDiscount } from "@/lib/utils"

// Helper to get applicable discount for product/variant
function getApplicableDiscount(
  productId: string,
  variantId: string | null,
  autoApplyDiscounts: DiscountCode[]
): DiscountCode | null {
  for (const discount of autoApplyDiscounts) {
    const hasProductRestriction = discount.applicable_products && discount.applicable_products.length > 0
    const hasVariantRestriction = discount.applicable_variants && discount.applicable_variants.length > 0

    if (hasProductRestriction || hasVariantRestriction) {
      // Check variant first if provided
      if (variantId && hasVariantRestriction && discount.applicable_variants?.includes(variantId)) {
        return discount
      }
      // Check product level
      if (hasProductRestriction && discount.applicable_products?.includes(productId)) {
        return discount
      }
      continue
    }

    // No restrictions - applies to all
    return discount
  }
  return null
}

// Calculate discounted price
function calculateDiscountedPrice(price: number, discount: DiscountCode | null): number {
  if (!discount) return price

  if (discount.discount_type === "PERCENTAGE") {
    const discountAmount = price * (discount.discount_value / 100)
    const cappedDiscount = discount.maximum_discount
      ? Math.min(discountAmount, discount.maximum_discount)
      : discountAmount
    return price - cappedDiscount
  } else {
    return Math.max(0, price - discount.discount_value)
  }
}
import { MaxWidthLayout, ProductCard, ProductCardSkeleton } from "@/components/store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useCart } from "@/hooks/use-cart"
import { useWishlist } from "@/hooks/use-wishlist"
import { toast } from "sonner"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false)
  const [justAddedToCart, setJustAddedToCart] = useState(false)
  
  // Cart and Wishlist hooks
  const { addToCart, subtotal: cartSubtotal } = useCart()
  const { isInWishlist, toggleWishlist, isAuthenticated: isWishlistAuth } = useWishlist()

  // Fetch product using public API
  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["product", "public", slug],
    queryFn: () => productsApi.getPublicBySlug(slug),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch related products (same category, excluding current product)
  const { data: relatedProductsData, isLoading: relatedLoading } = useQuery({
    queryKey: ["products", "related", product?.category_id, product?.id],
    queryFn: () => productsApi.listPublic({
      per_page: 4,
    }),
    enabled: !!product?.id,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch auto-apply discounts
  const { data: autoApplyDiscounts = [] } = useQuery<DiscountCode[]>({
    queryKey: ["discounts", "auto-apply"],
    queryFn: () => discountsApi.getAutoApplyDiscounts(),
    staleTime: 5 * 60 * 1000,
  })

  // Filter out current product from related products
  const relatedProducts = relatedProductsData?.items?.filter(p => p.id !== product?.id).slice(0, 4) ?? []

  // Extract unique option keys and values from variants
  const variantOptions = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return {}
    
    const options: Record<string, Set<string>> = {}
    
    product.variants.forEach(variant => {
      if (variant.options && variant.is_active) {
        Object.entries(variant.options).forEach(([key, value]) => {
          if (!options[key]) {
            options[key] = new Set()
          }
          options[key].add(value)
        })
      }
    })
    
    // Convert sets to arrays
    const result: Record<string, string[]> = {}
    Object.entries(options).forEach(([key, values]) => {
      result[key] = Array.from(values)
    })
    
    return result
  }, [product?.variants])

  // Check if an option value is valid given current selections
  const isOptionValueValid = useCallback((optionKey: string, optionValue: string, currentSelections: Record<string, string>) => {
    if (!product?.variants) return false
    
    const testSelections = {
      ...currentSelections,
      [optionKey]: optionValue,
    }
    
    // Remove the option being tested to check compatibility
    delete testSelections[optionKey]
    testSelections[optionKey] = optionValue
    
    return product.variants.some(variant => {
      if (!variant.options || !variant.is_active || variant.stock <= 0) return false
      
      return Object.entries(testSelections).every(([key, value]) => {
        return variant.options?.[key] === value
      })
    })
  }, [product?.variants])

  // Check if all variant options have been selected
  const allOptionsSelected = useMemo(() => {
    const requiredOptionKeys = Object.keys(variantOptions)
    if (requiredOptionKeys.length === 0) return true
    
    return requiredOptionKeys.every(key => selectedOptions[key] !== undefined)
  }, [variantOptions, selectedOptions])

  // Find matching variant based on selected options
  const matchingVariant = useMemo(() => {
    if (!product?.variants || !allOptionsSelected || Object.keys(selectedOptions).length === 0) return null
    
    return product.variants.find(variant => {
      if (!variant.options || !variant.is_active) return false
      
      const variantOptionKeys = Object.keys(variant.options || {})
      const selectedOptionKeys = Object.keys(selectedOptions)
      
      if (variantOptionKeys.length !== selectedOptionKeys.length) return false
      
      return Object.entries(selectedOptions).every(([key, value]) => {
        return variant.options?.[key] === value
      })
    }) || null
  }, [product?.variants, selectedOptions, allOptionsSelected])

  // Get applicable discount for current product/variant
  const applicableDiscount = useMemo(() => {
    if (!product) return null
    return getApplicableDiscount(
      product.id,
      matchingVariant?.id || null,
      autoApplyDiscounts
    )
  }, [product, matchingVariant, autoApplyDiscounts])

  // ============================================================================
  // PRICING LOGIC - Handle variants and non-variants differently
  // ============================================================================
  
  // Get active variants
  const activeVariants = useMemo(() => {
    return product?.variants?.filter(v => v.is_active) ?? []
  }, [product?.variants])
  
  const hasVariants = activeVariants.length > 0

  // Auto-select first variant's options when product loads
  useEffect(() => {
    if (hasVariants && activeVariants.length > 0) {
      const firstVariant = activeVariants[0]
      if (firstVariant.options) {
        setSelectedOptions(firstVariant.options as Record<string, string>)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]) // Only run when product changes

  // For variants: calculate price range (before selecting a specific variant)
  const variantPricing = useMemo(() => {
    if (!hasVariants) return null
    
    const prices = activeVariants
      .map(v => {
        const basePrice = v.price ?? 0
        const salePrice = v.sale_price ?? 0
        // Effective price: use sale_price if valid, otherwise base price
        const effectivePrice = salePrice > 0 ? salePrice : basePrice
        // Has sale only if both prices are > 0 and sale < base
        const hasSale = salePrice > 0 && basePrice > 0 && salePrice < basePrice
        return { effectivePrice, basePrice, salePrice, hasSale }
      })
      .filter(p => p.effectivePrice > 0)
    
    if (prices.length === 0) return null
    
    const lowestPrice = Math.min(...prices.map(p => p.effectivePrice))
    const validBasePrices = prices.filter(p => p.basePrice > 0).map(p => p.basePrice)
    const highestBasePrice = validBasePrices.length > 0 ? Math.max(...validBasePrices) : 0
    const hasAnySale = prices.some(p => p.hasSale)
    const showPriceRange = lowestPrice > 0 && highestBasePrice > 0 && lowestPrice < highestBasePrice
    
    return { lowestPrice, highestBasePrice, hasAnySale, showPriceRange }
  }, [hasVariants, activeVariants])

  // Base price (before auto-apply discount) - depends on whether variant is selected
  const basePrice = useMemo(() => {
    // If a variant is selected, use that variant's price
    if (matchingVariant) {
      const variantSalePrice = matchingVariant.sale_price ?? 0
      const variantPrice = matchingVariant.price ?? 0
      return variantSalePrice > 0 ? variantSalePrice : variantPrice
    }
    
    // If product has variants but none selected, use lowest variant price
    if (hasVariants && variantPricing) {
      return variantPricing.lowestPrice
    }
    
    // Non-variant product: use sale_price if available, else base_price
    const productSale = product?.sale_price ?? 0
    return productSale > 0 ? productSale : (product?.base_price ?? 0)
  }, [matchingVariant, hasVariants, variantPricing, product])

  // Current price (after auto-apply discount)
  const currentPrice = useMemo(() => {
    return calculateDiscountedPrice(basePrice, applicableDiscount)
  }, [basePrice, applicableDiscount])

  // Original/strikethrough price
  const originalPrice = useMemo(() => {
    // If a variant is selected, use that variant's base price
    if (matchingVariant?.price && matchingVariant.price > 0) {
      return matchingVariant.price
    }
    
    // If product has variants but none selected, use highest base price from variants
    if (hasVariants && variantPricing && variantPricing.highestBasePrice > 0) {
      return variantPricing.highestBasePrice
    }
    
    // Non-variant product: use base_price
    return product?.base_price ?? 0
  }, [matchingVariant, hasVariants, variantPricing, product])

  const currentStock = useMemo(() => {
    if (matchingVariant) {
      return matchingVariant.stock
    }
    if (hasVariants) {
      return activeVariants.reduce((sum, v) => sum + v.stock, 0)
    }
    return product?.stock ?? 0
  }, [matchingVariant, hasVariants, activeVariants, product])

  // Determine if we should show sale pricing
  const isOnSale = useMemo(() => {
    // Has auto-apply discount
    if (applicableDiscount) return true
    
    // Variant selected with sale
    if (matchingVariant) {
      const salePrice = matchingVariant.sale_price ?? 0
      const basePrice = matchingVariant.price ?? 0
      return salePrice > 0 && basePrice > 0 && salePrice < basePrice
    }
    
    // Has variants with any sale
    if (hasVariants && variantPricing) {
      return variantPricing.showPriceRange || variantPricing.hasAnySale
    }
    
    // Non-variant product with sale
    const productSale = product?.sale_price ?? 0
    const productBase = product?.base_price ?? 0
    return productSale > 0 && productBase > 0 && productSale < productBase
  }, [applicableDiscount, matchingVariant, hasVariants, variantPricing, product])
  
  // Calculate discount percentage for display (total savings from original base price to final price)
  // This combines both sale price discount and auto-apply discount
  const discountPercent = useMemo(() => {
    if (originalPrice > 0 && currentPrice < originalPrice && currentPrice > 0) {
      // Calculate total discount percentage from base price to final price
      const totalDiscount = originalPrice - currentPrice
      const percent = (totalDiscount / originalPrice) * 100
      return Math.round(percent)
    }
    return 0
  }, [currentPrice, originalPrice])

  // Check if discount has minimum order amount requirement
  const discountMinimumInfo = useMemo(() => {
    if (!applicableDiscount || !applicableDiscount.minimum_order_amount) return null
    
    return {
      discount: applicableDiscount,
      minimumAmount: applicableDiscount.minimum_order_amount,
    }
  }, [applicableDiscount])

  const handleOptionChange = (optionKey: string, value: string) => {
    setSelectedOptions(prev => {
      if (prev[optionKey] === value) {
        const { [optionKey]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [optionKey]: value }
    })
  }

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, Math.min(prev + delta, currentStock)))
  }

  // Handle Add to Cart - optimistic, no waiting
  const handleAddToCart = () => {
    if (!product) return

    // Validate variant selection for products with variants
    if (product.has_variants && !matchingVariant) {
      toast.error("Please select all options")
      return
    }

    // Reset quantity immediately
    const addedQuantity = quantity
    setQuantity(1)
    
    // Show success animation
    setJustAddedToCart(true)
    setTimeout(() => setJustAddedToCart(false), 2000)

    // Fire and forget - errors handled by mutation's onError
    addToCart({
      product_id: product.id,
      variant_id: matchingVariant?.id || null,
      quantity: addedQuantity,
      options: Object.keys(selectedOptions).length > 0 ? selectedOptions : null,
    }).catch(() => {
      setJustAddedToCart(false)
      toast.error("Failed to add to cart")
    })
  }

  // Handle Wishlist Toggle
  const handleWishlistToggle = async () => {
    if (!product) return

    if (!isWishlistAuth) {
      router.push("/login")
      return
    }
    
    setIsTogglingWishlist(true)
    try {
      await toggleWishlist(product.id)
    } catch (error) {
      toast.error("Failed to update wishlist", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsTogglingWishlist(false)
    }
  }

  // Handle Share
  const handleShare = async () => {
    if (!product) return
    
    const shareUrl = window.location.href
    const shareData = {
      title: product.name,
      text: product.description || `Check out ${product.name}`,
      url: shareUrl,
    }
    
    // Try native share API first (mobile-friendly)
    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        // User cancelled or share failed - fallback to clipboard
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(shareUrl)
        }
      }
    } else {
      // Fallback: copy to clipboard
      copyToClipboard(shareUrl)
    }
  }
  
  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard!")
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      toast.success("Link copied to clipboard!")
    }
  }

  // Check if product is in wishlist
  const productInWishlist = product ? isInWishlist(product.id) : false

  // Loading state
  if (isLoading) {
    return (
      <MaxWidthLayout className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="w-20 h-20 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </MaxWidthLayout>
    )
  }

  // Error state
  if (error || !product) {
    return (
      <MaxWidthLayout className="py-8">
        <div className="text-center py-20">
          <IconShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The product you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/shop/products">
            <Button>Browse Products</Button>
          </Link>
        </div>
      </MaxWidthLayout>
    )
  }

  // Sort images: primary first, then by display_order
  const images = product.images?.sort((a, b) => {
    // Primary image always comes first
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    // Then sort by display_order
    return a.display_order - b.display_order
  }) || []
  const currentImage = images[selectedImageIndex]?.url || matchingVariant?.image_url

  return (
    <MaxWidthLayout className="py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-foreground transition-colors">
          Shop
        </Link>
        <span>/</span>
        <Link href="/shop/products" className="hover:text-foreground transition-colors">
          Products
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
      </nav>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: Image Gallery */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-muted border">
            {currentImage ? (
              <Image
                src={currentImage}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <IconShoppingCart className="h-24 w-24 text-muted-foreground/30" />
              </div>
            )}
            
            {/* Discount Badge - Always show total savings percentage */}
            {isOnSale && discountPercent > 0 && (
              <Badge className="absolute top-4 left-4 bg-red-500 text-white text-sm px-3 py-1">
                {discountPercent}% OFF
              </Badge>
            )}
            
            {/* New Badge */}
            {product.is_new && (
              <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground text-sm px-3 py-1">
                New
              </Badge>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={cn(
                    "relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all",
                    idx === selectedImageIndex
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  <Image
                    src={img.url}
                    alt={img.alt_text || `${product.name} image ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div className="space-y-6">
          {/* Category */}
          {product.category_name && (
            <Badge variant="outline">{product.category_name}</Badge>
          )}

          {/* Product Name */}
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
            {product.name}
          </h1>

          {/* Price */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className={cn("text-3xl font-bold", isOnSale ? "text-red-600" : "text-primary")}>
                {formatPrice(currentPrice)}
              </span>
              {isOnSale && originalPrice > 0 && currentPrice < originalPrice && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(originalPrice)}
                  </span>
                  <Badge variant="destructive" className="text-sm">
                    Save {discountPercent}%
                  </Badge>
                </>
              )}
            </div>
            
            {/* Discount minimum order amount message */}
            {discountMinimumInfo && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <IconTag className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Minimum order amount: <span className="font-semibold">{formatPrice(discountMinimumInfo.minimumAmount)}</span> to get{" "}
                  <span className="font-semibold">
                    {formatDiscount(
                      discountMinimumInfo.discount.discount_value,
                      discountMinimumInfo.discount.discount_type as "PERCENTAGE" | "FIXED_AMOUNT"
                    )}
                  </span>{" "}
                  discount
                </p>
              </div>
            )}
          </div>

          {/* Short Description */}
          {product.short_description && (
            <p className="text-muted-foreground text-lg">
              {product.short_description}
            </p>
          )}

          <Separator />

          {/* Variant Options */}
          {product.has_variants && Object.keys(variantOptions).length > 0 && (
            <div className="space-y-4">
              {Object.entries(variantOptions).map(([optionKey, values]) => (
                <div key={optionKey} className="space-y-2">
                  <label className="text-sm font-medium">
                    {optionKey}: <span className="text-muted-foreground">{selectedOptions[optionKey] || "Select"}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {values.map(value => {
                      const isSelected = selectedOptions[optionKey] === value
                      const isValid = isOptionValueValid(optionKey, value, selectedOptions)
                      
                      return (
                        <Button
                          key={value}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleOptionChange(optionKey, value)}
                          disabled={!isValid}
                          className={cn(
                            "min-w-[60px]",
                            !isValid && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {value}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            {currentStock > 0 ? (
              <>
                <IconCheck className="h-5 w-5 text-green-500" />
                <span className="text-green-600 font-medium">
                  In Stock
                  {currentStock <= 10 && (
                    <span className="text-orange-500 ml-2">
                      (Only {currentStock} left!)
                    </span>
                  )}
                </span>
              </>
            ) : (
              <>
                <IconX className="h-5 w-5 text-red-500" />
                <span className="text-red-600 font-medium">Out of Stock</span>
              </>
            )}
          </div>

          {/* Quantity Selector */}
          {currentStock > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Quantity:</span>
              <div className="flex items-center border rounded-lg">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="h-10 w-10 rounded-r-none"
                >
                  <IconMinus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= currentStock}
                  className="h-10 w-10 rounded-l-none"
                >
                  <IconPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              size="lg"
              className={cn(
                "flex-1 h-14 text-lg transition-all duration-300",
                justAddedToCart && "bg-green-600 hover:bg-green-600"
              )}
              disabled={
                currentStock === 0 ||
                (product.has_variants && (!allOptionsSelected || !matchingVariant))
              }
              onClick={handleAddToCart}
            >
              {justAddedToCart ? (
                <>
                  <IconCheck className="mr-2 h-5 w-5 animate-in zoom-in-50 duration-300" />
                  <span className="animate-in fade-in duration-300">Added!</span>
                </>
              ) : (
                <>
                  <IconShoppingCart className="mr-2 h-5 w-5" />
                  {product.has_variants && !allOptionsSelected
                    ? "Select Options"
                    : product.has_variants && !matchingVariant
                      ? "Unavailable"
                      : currentStock === 0
                        ? "Out of Stock"
                        : "Add to Cart"}
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className={cn(
                "h-14 w-14 transition-colors",
                productInWishlist && "border-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20"
              )}
              onClick={handleWishlistToggle}
              disabled={isTogglingWishlist}
            >
              {isTogglingWishlist ? (
                <IconLoader2 className="h-5 w-5 animate-spin" />
              ) : productInWishlist ? (
                <IconHeartFilled className="h-5 w-5 text-red-500" />
              ) : (
                <IconHeart className="h-5 w-5" />
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="h-14 w-14"
              onClick={handleShare}
            >
              <IconShare className="h-5 w-5" />
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/50">
              <IconTruck className="h-6 w-6 mb-2 text-primary" />
              <span className="text-xs font-medium">Fast Delivery</span>
              <span className="text-xs text-muted-foreground">2-3 Days</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/50">
              <IconShieldCheck className="h-6 w-6 mb-2 text-primary" />
              <span className="text-xs font-medium">Secure Payment</span>
              <span className="text-xs text-muted-foreground">SSL Encrypted</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/50">
              <IconRefresh className="h-6 w-6 mb-2 text-primary" />
              <span className="text-xs font-medium">Easy Returns</span>
              <span className="text-xs text-muted-foreground">30 Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Details Section */}
      <div className="mt-12 space-y-8">
        <Separator />
        
        {/* Description */}
        {product.description && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Description</h2>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          </div>
        )}

        {/* Specifications / Attributes */}
        {product.attribute_values && product.attribute_values.filter(attr => attr.value && attr.value.trim() !== "").length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Specifications</h2>
            <div>
              {product.attribute_values
                .filter(attr => attr.value && attr.value.trim() !== "")
                .map((attr, index, arr) => (
                <div
                  key={attr.id}
                  className={cn(
                    "flex justify-between items-center py-3",
                    index !== arr.length - 1 && "border-b"
                  )}
                >
                  <span className="text-muted-foreground">{attr.attribute_name}</span>
                  <span className="font-medium">
                    {attr.attribute_type === "BOOLEAN"
                      ? attr.value === "true" ? "Yes" : "No"
                      : attr.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Products */}
        {(relatedProducts.length > 0 || relatedLoading) && (
          <div className="space-y-6">
            <Separator />
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">You May Also Like</h2>
              <Link 
                href="/shop/products" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))
              ) : (
                relatedProducts.map((relatedProduct) => (
                  <ProductCard key={relatedProduct.id} product={relatedProduct} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </MaxWidthLayout>
  )
}

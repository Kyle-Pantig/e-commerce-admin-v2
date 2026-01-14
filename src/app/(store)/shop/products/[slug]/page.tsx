"use client"

import { useState, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  IconShoppingCart,
  IconHeart,
  IconShare,
  IconTruck,
  IconShieldCheck,
  IconRefresh,
  IconMinus,
  IconPlus,
  IconCheck,
  IconX,
} from "@tabler/icons-react"
import { productsApi } from "@/lib/api"
import type { Product } from "@/lib/api/types"
import { cn, formatPrice } from "@/lib/utils"
import { MaxWidthLayout, ProductCard, ProductCardSkeleton } from "@/components/store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

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

  // Get current price
  const currentPrice = useMemo(() => {
    if (matchingVariant) {
      const variantSalePrice = matchingVariant.sale_price ?? 0
      const variantPrice = matchingVariant.price ?? 0
      return variantSalePrice > 0 ? variantSalePrice : variantPrice
    }
    return product?.sale_price ?? product?.base_price ?? 0
  }, [matchingVariant, product])

  const originalPrice = useMemo(() => {
    if (matchingVariant?.price && matchingVariant.price > 0) {
      return matchingVariant.price
    }
    return product?.base_price ?? 0
  }, [matchingVariant, product])

  const currentStock = useMemo(() => {
    if (matchingVariant) {
      return matchingVariant.stock
    }
    if (product?.has_variants && product.variants) {
      return product.variants
        .filter(v => v.is_active)
        .reduce((sum, v) => sum + v.stock, 0)
    }
    return product?.stock ?? 0
  }, [matchingVariant, product])

  const isOnSale = currentPrice < originalPrice && originalPrice > 0

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
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-bold text-primary">
              {formatPrice(currentPrice)}
            </span>
            {isOnSale && (
              <>
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(originalPrice)}
                </span>
                <Badge variant="destructive" className="text-sm">
                  Save {Math.round((1 - currentPrice / originalPrice) * 100)}%
                </Badge>
              </>
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
              className="flex-1 h-14 text-lg"
              disabled={currentStock === 0 || (product.has_variants && (!allOptionsSelected || !matchingVariant))}
            >
              <IconShoppingCart className="mr-2 h-5 w-5" />
              {product.has_variants && !allOptionsSelected
                ? "Select Options"
                : product.has_variants && !matchingVariant
                  ? "Unavailable"
                  : currentStock === 0
                    ? "Out of Stock"
                    : "Add to Cart"}
            </Button>
            <Button variant="outline" size="lg" className="h-14 w-14">
              <IconHeart className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="h-14 w-14">
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

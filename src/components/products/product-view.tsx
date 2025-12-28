"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconArrowLeft,
  IconShoppingCart,
  IconHeart,
  IconShare,
  IconTruck,
  IconShieldCheck,
  IconRefresh,
  IconMinus,
  IconPlus,
  IconStarFilled,
  IconStar,
  IconPackage,
  IconCheck,
  IconX,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

// Import shared API services and types
import { productsApi } from "@/lib/api/services/products"
import type { Product, ProductImage, ProductVariant, ProductAttributeValue } from "@/lib/api/types"

interface ProductViewProps {
  slug: string
  currentUserRole?: string
}

export function ProductView({ slug, currentUserRole }: ProductViewProps) {
  const router = useRouter()
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  const {
    data: product,
    isLoading,
    error,
  } = useQuery<Product, Error>({
    queryKey: ["product", slug],
    queryFn: () => productsApi.getBySlug(slug),
    retry: 1,
  })

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
    
    // Create a test selection with this option value
    // Exclude the option being tested from current selections to avoid conflicts
    const { [optionKey]: _, ...otherSelections } = currentSelections
    const testSelections = {
      ...otherSelections,
      [optionKey]: optionValue,
    }
    
    // Check if there's any variant that matches all test selections
    return product.variants.some(variant => {
      if (!variant.options || !variant.is_active || variant.stock <= 0) return false
      
      // Check if this variant matches all selected options
      return Object.entries(testSelections).every(([key, value]) => {
        return variant.options?.[key] === value
      })
    })
  }, [product?.variants])

  // Find matching variant based on selected options
  const matchingVariant = useMemo(() => {
    if (!product?.variants || Object.keys(selectedOptions).length === 0) return null
    
    return product.variants.find(variant => {
      if (!variant.options || !variant.is_active) return false
      
      return Object.entries(selectedOptions).every(([key, value]) => {
        return variant.options?.[key] === value
      })
    }) || null
  }, [product?.variants, selectedOptions])

  // Get current price and stock
  const currentPrice = useMemo(() => {
    if (matchingVariant) {
      return matchingVariant.sale_price || matchingVariant.price || product?.sale_price || product?.base_price || 0
    }
    return product?.sale_price || product?.base_price || 0
  }, [matchingVariant, product])

  const originalPrice = useMemo(() => {
    if (matchingVariant?.price) {
      return matchingVariant.price
    }
    return product?.base_price || 0
  }, [matchingVariant, product])

  const currentStock = useMemo(() => {
    if (matchingVariant) {
      return matchingVariant.stock
    }
    if (product?.has_variants && product.variants) {
      return product.variants.reduce((sum, v) => sum + v.stock, 0)
    }
    return product?.stock || 0
  }, [matchingVariant, product])

  const isOnSale = currentPrice < originalPrice

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price)
  }

  const handleOptionChange = (optionKey: string, value: string) => {
    setSelectedOptions(prev => {
      // If same value is clicked, unselect it
      if (prev[optionKey] === value) {
        const { [optionKey]: _, ...rest } = prev
        return rest
      }
      
      // Create new selections with this option
      const newSelections = {
        ...prev,
        [optionKey]: value,
      }
      
      // Remove any conflicting selections in other option groups
      // (selections that don't have a valid variant combination)
      const cleanedSelections: Record<string, string> = { [optionKey]: value }
      
      // Check each other selected option to see if it's still valid
      // We need to check against all current selections (including the new one)
      Object.entries(prev).forEach(([key, val]) => {
        if (key !== optionKey) {
          // Test if this option is still valid with all current selections (including new one)
          if (isOptionValueValid(key, val, newSelections)) {
            cleanedSelections[key] = val
          }
        }
      })
      
      return cleanedSelections
    })
  }

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, Math.min(prev + delta, currentStock)))
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="px-4 lg:px-6">
        <Button variant="ghost" className="mb-6" disabled>
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
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
      </div>
    )
  }

  // Error state
  if (error || !product) {
    return (
      <div className="px-4 lg:px-6">
        <Button variant="ghost" onClick={() => router.push("/products")} className="mb-6">
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
        <div className="text-center py-20">
          <IconPackage className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {error?.message || "The product you're looking for doesn't exist."}
          </p>
          <Button onClick={() => router.push("/products")}>
            Browse Products
          </Button>
        </div>
      </div>
    )
  }

  const images = product.images?.sort((a, b) => a.display_order - b.display_order) || []
  const currentImage = images[selectedImageIndex]?.url || matchingVariant?.image_url

  return (
    <div className="px-4 lg:px-6 pb-12">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push("/products")} className="mb-6">
        <IconArrowLeft className="mr-2 h-4 w-4" />
        Back to Products
      </Button>

      {/* Two Column Layout: Image Gallery + Product Info */}
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
                <IconPackage className="h-24 w-24 text-muted-foreground/30" />
              </div>
            )}
            
            {/* Sale Badge */}
            {isOnSale && (
              <Badge className="absolute top-4 left-4 bg-red-500 text-white text-sm px-3 py-1">
                SALE
              </Badge>
            )}
            
            {/* Featured Badge */}
            {product.is_featured && (
              <Badge className="absolute top-4 right-4 bg-yellow-500 text-black text-sm px-3 py-1">
                <IconStarFilled className="h-3 w-3 mr-1" />
                Featured
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
          {/* Category & Status */}
          <div className="flex items-center gap-2 flex-wrap">
            {product.category_name && (
              <Badge variant="outline">{product.category_name}</Badge>
            )}
            {product.status !== "ACTIVE" && (
              <Badge variant="secondary">{product.status}</Badge>
            )}
          </div>

          {/* Product Name */}
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
            {product.name}
          </h1>

          {/* SKU */}
          {(product.sku || matchingVariant?.sku) && (
            <p className="text-sm text-muted-foreground">
              SKU: {matchingVariant?.sku || product.sku}
            </p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">
              {formatPrice(currentPrice)}
            </span>
            {isOnSale && (
              <span className="text-xl text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
            {isOnSale && (
              <Badge variant="destructive" className="text-sm">
                Save {Math.round((1 - currentPrice / originalPrice) * 100)}%
              </Badge>
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
                      // Check if this option value is valid given current selections
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
                          title={!isValid ? "This combination is not available" : undefined}
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
                  {currentStock <= 10 ? (
                    <span className="text-orange-500 ml-2">
                      (Only {currentStock} left!)
                    </span>
                  ) : (
                    <span className="text-muted-foreground ml-1">
                      ({currentStock})
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
              disabled={currentStock === 0 || (product.has_variants && !matchingVariant)}
            >
              <IconShoppingCart className="mr-2 h-5 w-5" />
              {product.has_variants && !matchingVariant
                ? "Select Options"
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
              <span className="text-xs font-medium">Free Shipping</span>
              <span className="text-xs text-muted-foreground">Orders $50+</span>
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

      {/* Single Column: Description, Specs, Variants */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.attribute_values
                .filter(attr => attr.value && attr.value.trim() !== "")
                .map(attr => (
                <div
                  key={attr.id}
                  className="flex justify-between items-center p-4 rounded-lg bg-muted/50 border"
                >
                  <span className="font-medium">{attr.attribute_name}</span>
                  <span className="text-muted-foreground">
                    {attr.attribute_type === "BOOLEAN"
                      ? attr.value === "true" ? "Yes" : "No"
                      : attr.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Physical Properties */}
        {(product.weight || product.length || product.width || product.height) && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Physical Properties</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {product.weight && (
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold">{product.weight}</p>
                  <p className="text-sm text-muted-foreground">Weight (kg)</p>
                </div>
              )}
              {product.length && (
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold">{product.length}</p>
                  <p className="text-sm text-muted-foreground">Length (cm)</p>
                </div>
              )}
              {product.width && (
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold">{product.width}</p>
                  <p className="text-sm text-muted-foreground">Width (cm)</p>
                </div>
              )}
              {product.height && (
                <div className="p-4 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold">{product.height}</p>
                  <p className="text-sm text-muted-foreground">Height (cm)</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Available Variants Table */}
        {product.has_variants && product.variants && product.variants.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Available Options</h2>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Variant</th>
                    <th className="text-left p-4 font-medium">Options</th>
                    <th className="text-right p-4 font-medium">Price</th>
                    <th className="text-center p-4 font-medium">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {product.variants.filter(v => v.is_active).map(variant => (
                    <tr key={variant.id} className="hover:bg-muted/30">
                      <td className="p-4 font-medium">{variant.name}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {variant.options && Object.entries(variant.options).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-xs">
                              {k}: {v}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {formatPrice(variant.sale_price || variant.price || product.base_price)}
                      </td>
                      <td className="p-4 text-center">
                        {variant.stock > 0 ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            {variant.stock} in stock
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Out of Stock</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


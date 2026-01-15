"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  IconShoppingCart,
  IconTrash,
  IconMinus,
  IconPlus,
  IconChevronDown,
  IconCheck,
} from "@tabler/icons-react"
import { productsApi } from "@/lib/api"
import type { CartItem as CartItemType } from "@/lib/api/types"
import type { DiscountCode } from "@/lib/api/services/discounts"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatPrice, cn, formatDiscount } from "@/lib/utils"
import { toast } from "sonner"
import { IconTag } from "@tabler/icons-react"

// Debounce delay in ms
const QUANTITY_DEBOUNCE_MS = 500

interface CartItemProps {
  item: CartItemType
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<void>
  onChangeVariant: (itemId: string, variantId: string, variantData?: {
    name: string
    options: Record<string, string> | null
    price: number
    stock: number
  }) => Promise<void>
  onRemove: (itemId: string) => Promise<void>
  discountInfo?: {
    discount: DiscountCode
    applicableItemsSubtotal: number
    amountNeeded: number
    minimumAmount: number
  } | null
}

export function CartItem({ item, onUpdateQuantity, onChangeVariant, onRemove, discountInfo }: CartItemProps) {
  const [isVariantOpen, setIsVariantOpen] = useState(false)
  
  // Local quantity state for immediate UI updates
  const [localQuantity, setLocalQuantity] = useState(item.quantity)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const lastSentQuantityRef = useRef(item.quantity)
  
  // Sync local quantity when item.quantity changes from server
  useEffect(() => {
    if (item.quantity !== lastSentQuantityRef.current) {
      setLocalQuantity(item.quantity)
      lastSentQuantityRef.current = item.quantity
    }
  }, [item.quantity])
  
  const maxStock = item.variant?.stock ?? item.product.stock
  const isAtMax = localQuantity >= maxStock

  // Debounced quantity update
  const debouncedUpdateQuantity = useCallback((newQuantity: number) => {
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    // Update local state immediately
    setLocalQuantity(newQuantity)
    
    // Debounce the API call
    debounceRef.current = setTimeout(() => {
      if (newQuantity !== lastSentQuantityRef.current) {
        lastSentQuantityRef.current = newQuantity
        onUpdateQuantity(item.id, newQuantity)
      }
    }, QUANTITY_DEBOUNCE_MS)
  }, [item.id, onUpdateQuantity])
  
  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Fetch product variants only when popover is opened
  const { data: product, isLoading: variantsLoading } = useQuery({
    queryKey: ["product", "public", item.product.slug],
    queryFn: () => productsApi.getPublicBySlug(item.product.slug),
    enabled: isVariantOpen && item.product.has_variants,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const handleVariantChange = async (variantId: string) => {
    if (variantId === item.variant?.id) {
      setIsVariantOpen(false)
      return
    }
    
    // Find the selected variant to get its data for optimistic update
    const selectedVariant = variants.find(v => v.id === variantId)
    
    // Calculate effective price for the variant
    const effectivePrice = selectedVariant?.sale_price 
      ?? selectedVariant?.price 
      ?? product?.sale_price 
      ?? product?.base_price 
      ?? item.current_price
    
    const variantData = selectedVariant ? {
      name: selectedVariant.name,
      options: selectedVariant.options as Record<string, string> | null,
      price: effectivePrice,
      stock: selectedVariant.stock,
    } : undefined
    
    // Close popover immediately for snappy feel
    setIsVariantOpen(false)
    
    // Fire and forget - optimistic update handles the UI
    onChangeVariant(item.id, variantId, variantData).catch(() => {
      toast.error("Failed to change variant")
    })
  }

  // Get available variants from product data
  const variants = product?.variants?.filter(v => v.is_active) || []

  // Parse current variant options for display
  const currentOptions = item.variant?.options as Record<string, string> | null

  return (
    <div className="relative flex gap-4 p-4 border rounded-lg">
      {/* Delete Button - Top Right */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(item.id)}
      >
        <IconTrash className="h-4 w-4" />
      </Button>

      {/* Product Image */}
      <Link href={`/shop/products/${item.product.slug}`}>
        <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
          {item.product.primary_image ? (
            <Image
              src={item.product.primary_image}
              alt={item.product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <IconShoppingCart className="w-8 h-8 text-muted-foreground/30" />
            </div>
          )}
        </div>
      </Link>

      {/* Product Details */}
      <div className={cn("flex-1 min-w-0 flex flex-col", discountInfo && "pr-20")}>
        <Link href={`/shop/products/${item.product.slug}`}>
          <h3 className="font-medium hover:underline line-clamp-1 pr-8">
            {item.product.name}
          </h3>
        </Link>
        
        {/* Variant Selector */}
        {item.product.has_variants && item.variant && (
          <Popover open={isVariantOpen} onOpenChange={setIsVariantOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-0.5 w-fit"
              >
                {currentOptions ? (
                  <span>
                    {Object.values(currentOptions).join(" / ")}
                  </span>
                ) : (
                  <span>{item.variant.name}</span>
                )}
                <IconChevronDown className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Select variant
              </div>
              {variantsLoading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Loading variants...
                </div>
              ) : variants.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No variants available
                </div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {variants.map((variant) => {
                    const isSelected = variant.id === item.variant?.id
                    const isOutOfStock = variant.stock === 0
                    const variantOptions = variant.options as Record<string, string> | null
                    
                    // Calculate effective price: variant price > product sale price > product base price
                    const effectivePrice = variant.sale_price 
                      ?? variant.price 
                      ?? product?.sale_price 
                      ?? product?.base_price 
                      ?? 0
                    
                    return (
                      <button
                        key={variant.id}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-2 rounded-md text-sm transition-colors",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : isOutOfStock
                              ? "text-muted-foreground/50 cursor-not-allowed"
                              : "hover:bg-muted"
                        )}
                        onClick={() => !isOutOfStock && handleVariantChange(variant.id)}
                        disabled={isOutOfStock}
                      >
                        <div className="flex flex-col items-start">
                          <span className={cn(isOutOfStock && "line-through")}>
                            {variantOptions
                              ? Object.values(variantOptions).join(" / ")
                              : variant.name}
                          </span>
                          {isOutOfStock && (
                            <span className="text-xs text-destructive">Out of stock</span>
                          )}
                          {!isOutOfStock && variant.stock <= 5 && (
                            <span className="text-xs text-orange-500">Only {variant.stock} left</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                            {formatPrice(effectivePrice)}
                          </span>
                          {isSelected && <IconCheck className="h-4 w-4" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        {/* Non-variant product or no variant info */}
        {!item.product.has_variants && item.variant && (
          <p className="text-sm text-muted-foreground">
            {item.variant.name}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-muted-foreground">
            {formatPrice(item.current_price)} each
          </span>
          {item.price_changed && (
            <span className="text-xs text-orange-500">
              (Price updated)
            </span>
          )}
        </div>

        {/* Discount minimum order amount message */}
        {discountInfo && (
          <div className="flex items-center gap-2 p-2 mt-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <IconTag className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Add <span className="font-semibold">{formatPrice(discountInfo.amountNeeded)}</span> more to get{" "}
              <span className="font-semibold">
                {formatDiscount(
                  discountInfo.discount.discount_value,
                  discountInfo.discount.discount_type as "PERCENTAGE" | "FIXED_AMOUNT"
                )}
              </span>{" "}
              discount
            </p>
          </div>
        )}

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 mt-auto pt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => debouncedUpdateQuantity(localQuantity - 1)}
            disabled={localQuantity <= 1}
          >
            <IconMinus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center font-medium">{localQuantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              if (isAtMax) {
                toast.error(`Only ${maxStock} available in stock`)
              } else {
                debouncedUpdateQuantity(localQuantity + 1)
              }
            }}
            disabled={isAtMax}
          >
            <IconPlus className="h-3 w-3" />
          </Button>
          {isAtMax && (
            <span className="text-xs text-muted-foreground">Max</span>
          )}
        </div>
      </div>

      {/* Item Subtotal - Bottom Right */}
      <div className="absolute bottom-4 right-4 text-right">
        <p className="font-semibold">{formatPrice(item.current_price * localQuantity)}</p>
      </div>
    </div>
  )
}

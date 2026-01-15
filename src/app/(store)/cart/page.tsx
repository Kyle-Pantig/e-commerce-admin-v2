"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import {
  IconShoppingCart,
  IconTrash,
  IconMinus,
  IconPlus,
  IconArrowRight,
  IconTag,
  IconX,
} from "@tabler/icons-react"
import { useCart } from "@/hooks/use-cart"
import { MaxWidthLayout, CartItem } from "@/components/store"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { formatPrice } from "@/lib/utils"
import { discountsApi } from "@/lib/api/services/discounts"
import { toast } from "sonner"
import { useMutation, useQuery } from "@tanstack/react-query"
import type { DiscountValidationResponse, DiscountCode } from "@/lib/api/services/discounts"

const DISCOUNT_STORAGE_KEY = "checkout_discount"

export default function CartPage() {
  const {
    cartItems,
    localCartItems,
    totalQuantity,
    subtotal,
    isLoading,
    isMutating,
    isAuthenticated,
    updateQuantity,
    changeVariant,
    removeItem,
    clearCart,
    updateLocalQuantity,
    removeLocalItem,
    clearLocalCart,
  } = useCart()

  const [discountCode, setDiscountCode] = useState("")
  const [discountValidation, setDiscountValidation] = useState<DiscountValidationResponse | null>(null)
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false)
  const [autoApplyDiscount, setAutoApplyDiscount] = useState<DiscountCode | null>(null)
  const hasLoadedFromStorage = useRef(false)

  // Fetch auto-apply discounts
  const { data: autoApplyDiscounts = [] } = useQuery<DiscountCode[]>({
    queryKey: ["discounts", "auto-apply"],
    queryFn: () => discountsApi.getAutoApplyDiscounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: cartItems.length > 0 && isAuthenticated,
  })

  // Helper to check if discount applies to cart
  const getApplicableAutoDiscount = useMemo(() => {
    if (!autoApplyDiscounts.length || !cartItems.length) return null

    let bestDiscount: DiscountCode | null = null
    let bestDiscountAmount = 0

    for (const discount of autoApplyDiscounts) {
      // Check if discount applies to any cart items and calculate subtotal of applicable items only
      let appliesToCart = false
      let cartDiscountAmount = 0
      let applicableItemsSubtotal = 0

      for (const item of cartItems) {
        const hasProductRestriction = discount.applicable_products && discount.applicable_products.length > 0
        const hasVariantRestriction = discount.applicable_variants && discount.applicable_variants.length > 0

        let itemApplies = false
        if (hasProductRestriction || hasVariantRestriction) {
          // Check variant first
          if (item.variant?.id && hasVariantRestriction && discount.applicable_variants?.includes(item.variant.id)) {
            itemApplies = true
          }
          // Check product
          else if (hasProductRestriction && discount.applicable_products?.includes(item.product.id)) {
            itemApplies = true
          }
        } else {
          // No restrictions - applies to all
          itemApplies = true
        }

        if (itemApplies) {
          appliesToCart = true
          const itemTotal = item.current_price * item.quantity
          applicableItemsSubtotal += itemTotal
          
          let itemDiscount = 0

          if (discount.discount_type === "PERCENTAGE") {
            itemDiscount = (itemTotal * discount.discount_value) / 100
          } else {
            itemDiscount = discount.discount_value * item.quantity
          }

          // Apply maximum discount cap if set
          if (discount.maximum_discount && itemDiscount > discount.maximum_discount) {
            itemDiscount = discount.maximum_discount
          }

          cartDiscountAmount += itemDiscount
        }
      }

      // Only consider discount if it applies to cart items
      if (appliesToCart && cartDiscountAmount > bestDiscountAmount) {
        // Check minimum order amount using ONLY the subtotal of applicable items
        if (discount.minimum_order_amount && applicableItemsSubtotal < discount.minimum_order_amount) {
          // Don't apply discount if minimum isn't met for applicable items
          continue
        }
        
        bestDiscount = discount
        bestDiscountAmount = cartDiscountAmount
      }
    }

    return bestDiscount ? { discount: bestDiscount, amount: bestDiscountAmount } : null
  }, [autoApplyDiscounts, cartItems])

  // Auto-apply discount when cart changes (silently in background, don't show in UI)
  useEffect(() => {
    // Only auto-apply if user hasn't manually entered a discount code
    if (getApplicableAutoDiscount && !discountCode.trim()) {
      const autoDiscount = getApplicableAutoDiscount.discount
      const autoAmount = getApplicableAutoDiscount.amount
      
      // Check if minimum order amount is met
      const meetsMinimum = !autoDiscount.minimum_order_amount || subtotal >= autoDiscount.minimum_order_amount

      // Only auto-apply if minimum order amount is met and discount amount > 0
      // Store auto-apply info but don't set discountValidation (so UI doesn't show it)
      if (meetsMinimum && autoAmount > 0) {
        setAutoApplyDiscount(autoDiscount)
        // Don't set discountValidation - keep input field open
        // Don't save to localStorage - let user enter their own code
      } else {
        // Don't auto-apply if minimum isn't met - clear any existing auto-apply
        if (autoApplyDiscount && !discountCode.trim()) {
          setAutoApplyDiscount(null)
        }
      }
    } else if (!getApplicableAutoDiscount && autoApplyDiscount && !discountCode.trim()) {
      // Remove auto-apply if no longer applicable (and no manual code)
      setAutoApplyDiscount(null)
    }
  }, [getApplicableAutoDiscount, discountCode, autoApplyDiscount, subtotal])

  // Load saved discount from storage (manual codes only, not auto-apply) - only once on mount
  useEffect(() => {
    if (hasLoadedFromStorage.current) return
    if (typeof window === "undefined") return
    
    hasLoadedFromStorage.current = true
    
    const saved = localStorage.getItem(DISCOUNT_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Only load if it's a manual code (not auto-applied)
        if (parsed.code && parsed.valid && !autoApplyDiscounts.some(d => d.code === parsed.code && d.auto_apply)) {
          setDiscountValidation(parsed)
          setDiscountCode(parsed.code || "")
        }
      } catch {
        // Invalid stored discount
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Validate discount mutation
  const validateDiscountMutation = useMutation({
    mutationFn: async (code: string) => {
      // First, get the discount code details to see which products it applies to
      let discountDetails: DiscountCode | null = null
      try {
        discountDetails = await discountsApi.getByCode(code)
      } catch (error) {
        // If discount code doesn't exist, validation will fail anyway
        throw new Error("Discount code not found")
      }

      // Filter cart items to only those that the discount applies to
      const applicableItems = cartItems.filter(item => {
        const hasProductRestriction = discountDetails.applicable_products && discountDetails.applicable_products.length > 0
        const hasVariantRestriction = discountDetails.applicable_variants && discountDetails.applicable_variants.length > 0
        const hasCategoryRestriction = discountDetails.applicable_categories && discountDetails.applicable_categories.length > 0

        // If no restrictions, applies to all
        if (!hasProductRestriction && !hasVariantRestriction && !hasCategoryRestriction) {
          return true
        }

        // Check variant first
        if (item.variant?.id && hasVariantRestriction && discountDetails.applicable_variants?.includes(item.variant.id)) {
          return true
        }

        // Check product
        if (hasProductRestriction && discountDetails.applicable_products?.includes(item.product.id)) {
          return true
        }

        // Note: Category checking is handled by backend since cart items don't include category_id
        // If only category restriction exists and no product/variant match, item doesn't apply
        if (hasCategoryRestriction && !hasProductRestriction && !hasVariantRestriction) {
          // Backend will validate category, but we can't filter here without category_id
          // So we include it and let backend decide
          return true
        }

        return false
      })

      // Calculate subtotal of only applicable items
      const applicableSubtotal = applicableItems.reduce((sum, item) => sum + (item.current_price * item.quantity), 0)

      // Only pass applicable product IDs
      const applicableProductIds = applicableItems.map(item => item.product.id)

      return discountsApi.validate({
        code,
        order_subtotal: applicableSubtotal, // Use subtotal of applicable items only
        user_id: isAuthenticated ? undefined : undefined, // Will be set by backend
        product_ids: applicableProductIds.length > 0 ? applicableProductIds : undefined,
      })
    },
    onSuccess: (data) => {
      if (data.valid) {
        setDiscountValidation(data)
        // Save to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(data))
        }
        toast.success(data.message)
      } else {
        setDiscountValidation(null)
        if (typeof window !== "undefined") {
          localStorage.removeItem(DISCOUNT_STORAGE_KEY)
        }
        toast.error("Invalid code")
      }
    },
    onError: () => {
      setDiscountValidation(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem(DISCOUNT_STORAGE_KEY)
      }
      toast.error("Failed to validate discount code")
    },
  })

  const handleApplyDiscount = () => {
    if (!discountCode.trim()) {
      toast.error("Please enter a discount code")
      return
    }
    setIsValidatingDiscount(true)
    // Clear auto-apply when manual code is applied
    setAutoApplyDiscount(null)
    validateDiscountMutation.mutate(discountCode.trim().toUpperCase(), {
      onSettled: () => setIsValidatingDiscount(false),
    })
  }

  const handleRemoveDiscount = () => {
    setDiscountCode("")
    setDiscountValidation(null)
    setAutoApplyDiscount(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem(DISCOUNT_STORAGE_KEY)
    }
    toast.success("Discount code removed")
    // Auto-apply will be re-applied by useEffect if applicable
  }

  // Calculate discount amount (from manual code or auto-apply)
  // Only show auto-apply in UI if user hasn't entered a manual code
  const discountAmount = useMemo(() => {
    // Manual code takes priority
    if (discountValidation?.valid && discountValidation.discount_amount && discountCode.trim()) {
      return discountValidation.discount_amount
    }
    // Auto-apply discount (applied silently in background)
    if (getApplicableAutoDiscount && !discountCode.trim()) {
      return getApplicableAutoDiscount.amount
    }
    return 0
  }, [discountValidation, getApplicableAutoDiscount, discountCode])

  // Find applicable discount for showing "add more" message (even if minimum not met)
  // Calculate subtotal of items that the discount applies to
  const discountForMessage = useMemo(() => {
    if (!autoApplyDiscounts.length || !cartItems.length) return null

    let bestDiscount: DiscountCode | null = null
    let bestDiscountAmount = 0
    let bestApplicableSubtotal = 0

    for (const discount of autoApplyDiscounts) {
      // Check if discount applies to any cart items
      let appliesToCart = false
      let cartDiscountAmount = 0
      let applicableItemsSubtotal = 0

      for (const item of cartItems) {
        const hasProductRestriction = discount.applicable_products && discount.applicable_products.length > 0
        const hasVariantRestriction = discount.applicable_variants && discount.applicable_variants.length > 0

        let itemApplies = false
        if (hasProductRestriction || hasVariantRestriction) {
          // Check variant first
          if (item.variant?.id && hasVariantRestriction && discount.applicable_variants?.includes(item.variant.id)) {
            itemApplies = true
          }
          // Check product
          else if (hasProductRestriction && discount.applicable_products?.includes(item.product.id)) {
            itemApplies = true
          }
        } else {
          // No restrictions - applies to all
          itemApplies = true
        }

        if (itemApplies) {
          appliesToCart = true
          const itemTotal = item.current_price * item.quantity
          applicableItemsSubtotal += itemTotal
          
          let itemDiscount = 0

          if (discount.discount_type === "PERCENTAGE") {
            itemDiscount = (itemTotal * discount.discount_value) / 100
          } else {
            itemDiscount = discount.discount_value * item.quantity
          }

          // Apply maximum discount cap if set
          if (discount.maximum_discount && itemDiscount > discount.maximum_discount) {
            itemDiscount = discount.maximum_discount
          }

          cartDiscountAmount += itemDiscount
        }
      }

      if (appliesToCart && cartDiscountAmount > bestDiscountAmount) {
        bestDiscount = discount
        bestDiscountAmount = cartDiscountAmount
        bestApplicableSubtotal = applicableItemsSubtotal
      }
    }

    return bestDiscount ? { discount: bestDiscount, applicableSubtotal: bestApplicableSubtotal } : null
  }, [autoApplyDiscounts, cartItems])

  // Calculate discount info for each cart item
  const itemDiscountInfo = useMemo(() => {
    if (!autoApplyDiscounts.length || !cartItems.length || discountValidation?.valid) {
      return new Map()
    }

    const itemDiscountMap = new Map<string, {
      discount: DiscountCode
      applicableItemsSubtotal: number
      amountNeeded: number
      minimumAmount: number
    }>()

    for (const discount of autoApplyDiscounts) {
      if (!discount.minimum_order_amount) continue

      let applicableItemsSubtotal = 0
      const applicableItemIds: string[] = []

      for (const item of cartItems) {
        const hasProductRestriction = discount.applicable_products && discount.applicable_products.length > 0
        const hasVariantRestriction = discount.applicable_variants && discount.applicable_variants.length > 0

        let itemApplies = false
        if (hasProductRestriction || hasVariantRestriction) {
          if (item.variant?.id && hasVariantRestriction && discount.applicable_variants?.includes(item.variant.id)) {
            itemApplies = true
          } else if (hasProductRestriction && discount.applicable_products?.includes(item.product.id)) {
            itemApplies = true
          }
        } else {
          itemApplies = true
        }

        if (itemApplies) {
          applicableItemsSubtotal += item.current_price * item.quantity
          applicableItemIds.push(item.id)
        }
      }

      if (applicableItemsSubtotal < discount.minimum_order_amount) {
        const amountNeeded = discount.minimum_order_amount - applicableItemsSubtotal
        const info = {
          discount,
          applicableItemsSubtotal,
          amountNeeded,
          minimumAmount: discount.minimum_order_amount,
        }
        
        // Store discount info for each applicable item
        applicableItemIds.forEach(itemId => {
          itemDiscountMap.set(itemId, info)
        })
      }
    }

    return itemDiscountMap
  }, [autoApplyDiscounts, cartItems, discountValidation])

  const total = subtotal - discountAmount

  // For guest users, show message to login
  const showGuestCart = !isAuthenticated && localCartItems.length > 0

  // Loading state
  if (isLoading) {
    return (
      <MaxWidthLayout className="py-8">
        <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-4 border rounded-lg">
                <Skeleton className="w-24 h-24 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
            ))}
          </div>
          <div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </MaxWidthLayout>
    )
  }

  // Empty cart
  if (cartItems.length === 0 && localCartItems.length === 0) {
    return (
      <MaxWidthLayout className="py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <IconShoppingCart className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">
            Looks like you haven&apos;t added anything to your cart yet.
          </p>
          <Link href="/shop">
            <Button>
              Continue Shopping
              <IconArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </MaxWidthLayout>
    )
  }

  // Calculate guest cart totals
  const guestSubtotal = localCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const guestTotalQuantity = localCartItems.reduce((sum, item) => sum + item.quantity, 0)

  // Guest cart - same layout as authenticated cart
  if (showGuestCart) {
    return (
      <MaxWidthLayout className="py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          {localCartItems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearLocalCart}
            >
              <IconTrash className="mr-2 h-4 w-4" />
              Clear Cart
            </Button>
          )}
        </div>

        {/* Login prompt banner */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="text-primary font-medium hover:underline">
              Login
            </Link>{" "}
            to save your cart and checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {localCartItems.map((item, index) => (
              <div
                key={`${item.product_id}-${item.variant_id || 'no-variant'}-${index}`}
                className="relative flex gap-4 p-4 border rounded-lg"
              >
                {/* Delete Button - Top Right */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeLocalItem(item.product_id, item.variant_id)}
                >
                  <IconTrash className="h-4 w-4" />
                </Button>

                {/* Product Image */}
                {item.product_slug ? (
                  <Link href={`/shop/products/${item.product_slug}`}>
                    <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <IconShoppingCart className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <IconShoppingCart className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                )}

                {/* Product Details */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {/* Product Name - Show loading state while fetching */}
                  {item.product_name === "Unknown Product" ? (
                    <div className="space-y-1 pr-8">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ) : item.product_slug ? (
                    <Link href={`/shop/products/${item.product_slug}`}>
                      <h3 className="font-medium hover:underline line-clamp-1 pr-8">
                        {item.product_name}
                      </h3>
                    </Link>
                  ) : (
                    <h3 className="font-medium line-clamp-1 pr-8 text-muted-foreground">
                      {item.product_name}
                    </h3>
                  )}
                  
                  {/* Variant Name / Options */}
                  {item.variant_name && item.product_name !== "Unknown Product" && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {item.options ? Object.values(item.options).join(" / ") : item.variant_name}
                    </p>
                  )}

                  {/* Price per item */}
                  {item.product_name === "Unknown Product" ? (
                    <Skeleton className="h-4 w-20 mt-1" />
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {item.price > 0 ? `${formatPrice(item.price)} each` : "Price unavailable"}
                      </span>
                    </div>
                  )}

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateLocalQuantity(item.product_id, item.variant_id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <IconMinus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateLocalQuantity(item.product_id, item.variant_id, item.quantity + 1)}
                    >
                      <IconPlus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Item Subtotal - Bottom Right */}
                {item.product_name !== "Unknown Product" && item.price > 0 && (
                  <div className="absolute bottom-4 right-4 text-right">
                    <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-6 sticky top-24 space-y-4">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items ({guestTotalQuantity})</span>
                  <span>{formatPrice(guestSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-muted-foreground">Calculated at checkout</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(guestSubtotal)}</span>
              </div>

              <Link href="/login" className="block">
                <Button className="w-full mt-6" size="lg">
                  Login to Checkout
                  <IconArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              <Link href="/shop">
                <Button variant="outline" className="w-full mt-3">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </MaxWidthLayout>
    )
  }

  // Authenticated cart
  return (
    <MaxWidthLayout className="py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Shopping Cart</h1>
        {cartItems.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearCart()
              // Clear discount when cart is cleared
              if (typeof window !== "undefined") {
                localStorage.removeItem(DISCOUNT_STORAGE_KEY)
                setDiscountValidation(null)
                setDiscountCode("")
              }
            }}
          >
            <IconTrash className="mr-2 h-4 w-4" />
            Clear Cart
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => {
            const discountInfo = itemDiscountInfo.get(item.id)
            return (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onChangeVariant={changeVariant}
                onRemove={removeItem}
                discountInfo={discountInfo}
              />
            )
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg p-6 sticky top-24 space-y-4">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items ({totalQuantity})</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-muted-foreground">Calculated at checkout</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-semibold">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>

            {/* Discount Code Input */}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium">Discount Code</label>
              {/* Only show as applied if it's a manual code (user entered it) */}
              {discountValidation?.valid && discountCode.trim() ? (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                  <IconTag className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      {discountValidation.code}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-green-600 hover:text-green-700"
                    onClick={handleRemoveDiscount}
                  >
                    <IconX className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleApplyDiscount()
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleApplyDiscount}
                    disabled={isValidatingDiscount || !discountCode.trim() || isMutating}
                    size="sm"
                  >
                    {isValidatingDiscount ? "..." : "Apply"}
                  </Button>
                </div>
              )}
            </div>

            <Button 
              className="w-full mt-6" 
              size="lg" 
              disabled={isMutating}
              asChild={!isMutating}
            >
              {isMutating ? (
                <>
                  Proceed to Checkout
                  <IconArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <Link href="/checkout">
                  Proceed to Checkout
                  <IconArrowRight className="ml-2 h-4 w-4" />
                </Link>
              )}
            </Button>

            <Link href="/shop">
              <Button variant="outline" className="w-full mt-3">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MaxWidthLayout>
  )
}

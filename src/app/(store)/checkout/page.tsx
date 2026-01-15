"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { discountsApi } from "@/lib/api/services/discounts"
import type { DiscountValidationResponse, DiscountCode } from "@/lib/api/services/discounts"
import { addressesApi, type UserAddress } from "@/lib/api/services/addresses"
import { Input } from "@/components/ui/input"
import { IconTag, IconX } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useCart } from "@/hooks/use-cart"
import { ordersApi } from "@/lib/api/services/orders"
import { useAuth } from "@/contexts/auth-context"
import { MaxWidthLayout, CartItem } from "@/components/store"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/utils"
import { toast } from "sonner"
import { IconLoader2, IconLock, IconShoppingCart, IconCheck, IconArrowLeft, IconArrowRight } from "@tabler/icons-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import type { OrderCreate, PaymentMethod } from "@/lib/api/types"
import { cn } from "@/lib/utils"

// Validation schema
const checkoutSchema = z.object({
  // Customer info
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_email: z.string().email("Invalid email address"),
  customer_phone: z.string().optional(),
  
  // Shipping address
  shipping_address: z.string().min(5, "Address must be at least 5 characters"),
  shipping_city: z.string().min(2, "City is required"),
  shipping_state: z.string().optional(),
  shipping_zip: z.string().optional(),
  shipping_country: z.string().min(2, "Country is required"),
  
  // Billing (optional, can use same as shipping)
  use_same_billing: z.boolean(),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_zip: z.string().optional(),
  billing_country: z.string().optional(),
  
  // Payment
  payment_method: z.enum(["CASH_ON_DELIVERY", "STRIPE"]),
  
  // Notes
  notes: z.string().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

// Step validation schemas
const step1Schema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_email: z.string().email("Invalid email address"),
})

const step2Schema = z.object({
  customer_phone: z.string().optional(),
  shipping_address: z.string().min(5, "Address must be at least 5 characters"),
  shipping_city: z.string().min(2, "City is required"),
  shipping_state: z.string().optional(),
  shipping_zip: z.string().optional(),
  shipping_country: z.string().min(2, "Country is required"),
  use_same_billing: z.boolean(),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_zip: z.string().optional(),
  billing_country: z.string().optional(),
})

const step3Schema = z.object({
  payment_method: z.enum(["CASH_ON_DELIVERY", "STRIPE"]),
})

const STEPS = [
  { id: 1, name: "Customer Info", description: "Your contact details" },
  { id: 2, name: "Shipping Address", description: "Delivery information" },
  { id: 3, name: "Payment", description: "Payment method" },
  { id: 4, name: "Review", description: "Order summary" },
]

export default function CheckoutPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const {
    cartItems,
    subtotal,
    totalQuantity,
    isLoading: cartLoading,
    isMutating,
    isAuthenticated,
    clearCart,
    updateQuantity,
    removeItem,
    changeVariant,
  } = useCart()

  const [shippingCost] = useState(0) // TODO: Calculate based on shipping rules
  const [taxAmount] = useState(0) // TODO: Calculate based on tax rules

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      use_same_billing: true,
      payment_method: "CASH_ON_DELIVERY",
      shipping_country: "Philippines",
    },
    mode: "onChange",
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    trigger,
  } = form

  const useSameBilling = watch("use_same_billing")
  const paymentMethod = watch("payment_method")
  const formValues = watch()

  // Discount code state and validation
  const [discountCode, setDiscountCode] = useState("")
  const [discountValidation, setDiscountValidation] = useState<DiscountValidationResponse | null>(null)
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false)
  const [autoApplyDiscount, setAutoApplyDiscount] = useState<DiscountCode | null>(null)
  const [autoFillUserInfo, setAutoFillUserInfo] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string>("")

  const DISCOUNT_STORAGE_KEY = "checkout_discount"

  // Use centralized auth for user info
  const { user: currentUser } = useAuth()

  // Fetch user's saved addresses
  const { data: savedAddresses = [] } = useQuery<UserAddress[]>({
    queryKey: ["addresses"],
    queryFn: () => addressesApi.list(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Handle address selection
  const handleAddressSelect = useCallback((addressId: string) => {
    setSelectedAddressId(addressId)
    
    if (addressId === "new") {
      // Clear form for new address entry
      setValue("customer_phone", "")
      setValue("shipping_address", "")
      setValue("shipping_city", "")
      setValue("shipping_state", "")
      setValue("shipping_zip", "")
      setValue("shipping_country", "Philippines")
      setValue("billing_address", "")
      setValue("billing_city", "")
      setValue("billing_state", "")
      setValue("billing_zip", "")
      setValue("billing_country", "")
      setValue("use_same_billing", true)
      return
    }

    const address = savedAddresses.find(a => a.id === addressId)
    if (address) {
      // Fill phone number
      setValue("customer_phone", address.phone || "")
      
      // Fill shipping fields
      setValue("shipping_address", address.shippingAddress)
      setValue("shipping_city", address.shippingCity)
      setValue("shipping_state", address.shippingState || "")
      setValue("shipping_zip", address.shippingZip || "")
      setValue("shipping_country", address.shippingCountry)
      
      // Handle billing address based on type
      if (address.type === "BOTH" && address.billingAddress) {
        setValue("use_same_billing", false)
        setValue("billing_address", address.billingAddress)
        setValue("billing_city", address.billingCity || "")
        setValue("billing_state", address.billingState || "")
        setValue("billing_zip", address.billingZip || "")
        setValue("billing_country", address.billingCountry || "")
      } else if (address.type === "BILLING") {
        // For billing-only addresses, use billing as shipping too
        setValue("shipping_address", address.billingAddress || address.shippingAddress)
        setValue("shipping_city", address.billingCity || address.shippingCity)
        setValue("shipping_state", address.billingState || address.shippingState || "")
        setValue("shipping_zip", address.billingZip || address.shippingZip || "")
        setValue("shipping_country", address.billingCountry || address.shippingCountry)
        setValue("use_same_billing", true)
      } else {
        setValue("use_same_billing", true)
      }

      // Trigger validation
      trigger(["shipping_address", "shipping_city", "shipping_country"])
    }
  }, [savedAddresses, setValue, trigger])

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
      // Check if discount applies to any cart items (don't skip if minimum not met - we'll show message)
      let appliesToCart = false
      let cartDiscountAmount = 0

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
      // Minimum order amount check is done separately in discountNeededInfo
      if (appliesToCart && cartDiscountAmount > bestDiscountAmount) {
        bestDiscount = discount
        bestDiscountAmount = cartDiscountAmount
      }
    }

    // Only return discount if minimum order amount is met
    if (bestDiscount && bestDiscount.minimum_order_amount && subtotal < bestDiscount.minimum_order_amount) {
      // Return discount info but amount will be 0 (shown in discountNeededInfo)
      return { discount: bestDiscount, amount: 0 }
    }

    return bestDiscount ? { discount: bestDiscount, amount: bestDiscountAmount } : null
  }, [autoApplyDiscounts, cartItems, subtotal])

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
  const hasLoadedFromStorage = useRef(false)
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

  // Calculate how much more needed for discount (minimum order amount)
  const discountNeededInfo = useMemo(() => {
    // Check if there's an applicable discount but minimum order amount isn't met
    if (getApplicableAutoDiscount && getApplicableAutoDiscount.discount.minimum_order_amount) {
      const minimumAmount = getApplicableAutoDiscount.discount.minimum_order_amount
      if (subtotal < minimumAmount) {
        const amountNeeded = minimumAmount - subtotal
        return {
          discount: getApplicableAutoDiscount.discount,
          amountNeeded,
          currentTotal: subtotal,
          minimumAmount,
        }
      }
    }
    return null
  }, [getApplicableAutoDiscount, subtotal])

  // Calculate discount info for each cart item (for showing "add more" message inside items)
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

  // Calculate totals
  const total = useMemo(() => {
    return subtotal + shippingCost + taxAmount - discountAmount
  }, [subtotal, shippingCost, taxAmount, discountAmount])

  // Re-validate discount when subtotal changes (e.g., after editing items)
  // Only re-validate manual discount codes, not auto-apply
  useEffect(() => {
    if (discountValidation?.valid && discountCode && !autoApplyDiscount && cartItems.length > 0) {
      // Re-validate manual discount code with new subtotal
      // First get discount details to filter applicable items
      discountsApi.getByCode(discountCode).then(discountDetails => {
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
          code: discountCode,
          order_subtotal: applicableSubtotal, // Use subtotal of applicable items only
          user_id: isAuthenticated ? undefined : undefined,
          product_ids: applicableProductIds.length > 0 ? applicableProductIds : undefined,
        })
      }).then((data) => {
        if (data.valid) {
          setDiscountValidation(data)
          if (typeof window !== "undefined") {
            localStorage.setItem(DISCOUNT_STORAGE_KEY, JSON.stringify(data))
          }
        } else {
          setDiscountValidation(null)
          if (typeof window !== "undefined") {
            localStorage.removeItem(DISCOUNT_STORAGE_KEY)
          }
          toast.warning("Invalid code")
        }
      }).catch(() => {
        // Silent fail on re-validation
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, cartItems.length, autoApplyDiscount]) // Re-validate when subtotal or cart items change

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (data: OrderCreate) => ordersApi.create(data),
    onSuccess: (order) => {
      // Clear discount from storage after successful order
      if (typeof window !== "undefined") {
        localStorage.removeItem(DISCOUNT_STORAGE_KEY)
      }
      clearCart()
      router.push(`/thank-you?order=${order.order_number}`)
    },
    onError: (error: Error) => {
      toast.error("Failed to place order", {
        description: error.message || "Please try again.",
      })
    },
  })

  const onSubmit = async (data: CheckoutFormData): Promise<void> => {
    // Only allow submission on the final step (Review)
    if (currentStep !== STEPS.length) {
      return
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty")
      return
    }

    // Prepare order items from cart
    const orderItems = cartItems.map((item) => ({
      product_id: item.product.id,
      product_name: item.product.name,
      variant_id: item.variant?.id || null,
      variant_name: item.variant?.name || null,
      variant_options: item.variant?.options || null,
      unit_price: item.current_price,
      quantity: item.quantity,
    }))

    // Prepare order data
    const orderData: OrderCreate = {
      user_id: isAuthenticated ? undefined : null,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone || null,
      shipping_address: data.shipping_address,
      shipping_city: data.shipping_city,
      shipping_state: data.shipping_state || null,
      shipping_zip: data.shipping_zip || null,
      shipping_country: data.shipping_country,
      billing_address: useSameBilling ? data.shipping_address : (data.billing_address || null),
      billing_city: useSameBilling ? data.shipping_city : (data.billing_city || null),
      billing_state: useSameBilling ? (data.shipping_state || null) : (data.billing_state || null),
      billing_zip: useSameBilling ? (data.shipping_zip || null) : (data.billing_zip || null),
      billing_country: useSameBilling ? data.shipping_country : (data.billing_country || null),
      payment_method: data.payment_method as PaymentMethod,
      shipping_cost: shippingCost,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      discount_code_id: (discountValidation?.valid && discountValidation.discount_id && discountCode.trim())
        ? discountValidation.discount_id
        : (autoApplyDiscount && getApplicableAutoDiscount && !discountCode.trim())
          ? autoApplyDiscount.id
          : null,
      notes: data.notes || null,
      items: orderItems,
    }

    createOrderMutation.mutate(orderData)
  }

  // Validate current step before proceeding
  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 1:
        return await trigger(["customer_name", "customer_email"])
      case 2: {
        const baseFields: (keyof CheckoutFormData)[] = [
          "customer_phone",
          "shipping_address",
          "shipping_city",
          "shipping_country",
        ]
        const billingFields: (keyof CheckoutFormData)[] = useSameBilling
          ? []
          : ["billing_address", "billing_city", "billing_country"]
        return await trigger([...baseFields, ...billingFields])
      }
      case 3:
        return await trigger(["payment_method"])
      default:
        return true
    }
  }

  const handleNext = async () => {
    // Security check: Ensure cart still has items
    if (cartItems.length === 0) {
      toast.error("Your cart is empty. Redirecting to cart...")
      router.push("/cart")
      return
    }

    const isValid = await validateStep(currentStep)
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  // Auto-fill user info when checkbox is checked, clear when unchecked
  useEffect(() => {
    if (autoFillUserInfo && currentUser) {
      if (currentUser.name) {
        setValue("customer_name", currentUser.name)
        trigger("customer_name")
      }
      if (currentUser.email) {
        setValue("customer_email", currentUser.email)
        trigger("customer_email")
      }
    } else if (!autoFillUserInfo) {
      // Clear fields when checkbox is unchecked
      setValue("customer_name", "")
      setValue("customer_email", "")
      trigger("customer_name")
      trigger("customer_email")
    }
  }, [autoFillUserInfo, currentUser, setValue, trigger])

  // Auto-select default address when entering step 2
  const hasAutoSelectedAddress = useRef(false)
  useEffect(() => {
    if (currentStep === 2 && savedAddresses.length > 0 && !hasAutoSelectedAddress.current && !selectedAddressId) {
      const defaultAddress = savedAddresses.find(a => a.isDefault) || savedAddresses[0]
      if (defaultAddress) {
        hasAutoSelectedAddress.current = true
        handleAddressSelect(defaultAddress.id)
      }
    }
  }, [currentStep, savedAddresses, selectedAddressId, handleAddressSelect])

  // Redirect if not authenticated or cart is empty
  useEffect(() => {
    if (!cartLoading && (!isAuthenticated || cartItems.length === 0)) {
      router.push("/cart")
    }
  }, [cartLoading, isAuthenticated, cartItems.length, router])

  // Show loading state
  if (cartLoading) {
    return (
      <MaxWidthLayout className="py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
            <div>
              <Skeleton className="h-96" />
            </div>
          </div>
        </div>
      </MaxWidthLayout>
    )
  }

  // Show message while redirecting or if cart is empty
  if (!cartLoading && (!isAuthenticated || cartItems.length === 0)) {
    return (
      <MaxWidthLayout className="py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <IconShoppingCart className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h1 className="text-2xl font-bold mb-2">No items in cart</h1>
            <p className="text-muted-foreground mb-6">
              {!isAuthenticated
                ? "Please login and add items to your cart before checkout."
                : "Your cart is empty. Please add items to your cart before checkout."}
            </p>
            <Button onClick={() => router.push("/cart")}>
              Go to Cart
            </Button>
          </div>
        </div>
      </MaxWidthLayout>
    )
  }

  return (
    <MaxWidthLayout className="py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Checkout</h1>
          <p className="text-muted-foreground">
            Complete your order in just a few steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="relative">
            {/* Steps container with proper alignment */}
            <div className="relative flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="relative flex flex-col items-center flex-1">
                  {/* Circle container with connecting line */}
                  <div className="relative w-full flex items-center">
                    {/* Left connecting line (except for first step) */}
                    {index > 0 && (
                      <div
                        className={cn(
                          "absolute left-0 right-1/2 h-0.5 transition-colors",
                          currentStep >= step.id ? "bg-primary" : "bg-muted"
                        )}
                        style={{ top: "50%", transform: "translateY(-50%)" }}
                      />
                    )}
                    
                    {/* Circle */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all relative z-10 mx-auto",
                        currentStep > step.id
                          ? "bg-primary text-primary-foreground"
                          : currentStep === step.id
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {currentStep > step.id ? (
                        <IconCheck className="w-5 h-5" />
                      ) : (
                        step.id
                      )}
                    </div>

                    {/* Right connecting line (except for last step) */}
                    {index < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "absolute left-1/2 right-0 h-0.5 transition-colors",
                          currentStep > step.id ? "bg-primary" : "bg-muted"
                        )}
                        style={{ top: "50%", transform: "translateY(-50%)" }}
                      />
                    )}
                  </div>
                  
                  {/* Labels */}
                  <div className="mt-2 text-center w-full">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form 
          onSubmit={(e) => {
            // Prevent all form submissions - we'll handle it via button onClick
            e.preventDefault()
          }}
        >
          <div className="border rounded-lg p-6 md:p-8 mb-6 min-h-[400px]">
            {/* Step 1: Customer Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">Customer Information</h2>
                  <p className="text-sm text-muted-foreground">
                    Please provide your contact details
                  </p>
                </div>

                {/* Auto-fill checkbox for authenticated users */}
                {isAuthenticated && (
                  <div className="flex items-center space-x-2 pb-2">
                    <Checkbox
                      id="auto_fill_user_info"
                      checked={autoFillUserInfo}
                      onCheckedChange={(checked) => setAutoFillUserInfo(checked as boolean)}
                    />
                    <Label
                      htmlFor="auto_fill_user_info"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Auto-fill with my account information
                    </Label>
                  </div>
                )}

                <FieldGroup>
                  <Field data-invalid={errors.customer_name ? true : undefined}>
                    <FieldLabel htmlFor="customer_name">Full Name *</FieldLabel>
                    <Input
                      id="customer_name"
                      {...register("customer_name")}
                      placeholder="John Doe"
                    />
                    {errors.customer_name && (
                      <FieldError>{errors.customer_name.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={errors.customer_email ? true : undefined}>
                    <FieldLabel htmlFor="customer_email">Email *</FieldLabel>
                    <Input
                      id="customer_email"
                      type="email"
                      {...register("customer_email")}
                      placeholder="john@example.com"
                    />
                    {errors.customer_email && (
                      <FieldError>{errors.customer_email.message}</FieldError>
                    )}
                  </Field>
                </FieldGroup>
              </div>
            )}

            {/* Step 2: Shipping & Billing Address */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">Shipping Address</h2>
                  <p className="text-sm text-muted-foreground">
                    Where should we deliver your order?
                  </p>
                </div>

                {/* Saved Addresses Selector */}
                {isAuthenticated && savedAddresses.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select from saved addresses</Label>
                    <Select value={selectedAddressId} onValueChange={handleAddressSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a saved address or enter new" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Enter a new address</SelectItem>
                        {savedAddresses.map((address) => (
                          <SelectItem key={address.id} value={address.id}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">
                                {address.label || (address.isDefault ? "Default Address" : address.shippingCity)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {address.shippingAddress}, {address.shippingCity}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <FieldGroup>
                  <Field data-invalid={errors.customer_phone ? true : undefined}>
                    <FieldLabel htmlFor="customer_phone">Phone Number</FieldLabel>
                    <Input
                      id="customer_phone"
                      type="tel"
                      {...register("customer_phone")}
                      placeholder="+63 912 345 6789"
                    />
                    {errors.customer_phone && (
                      <FieldError>{errors.customer_phone.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={errors.shipping_address ? true : undefined}>
                    <FieldLabel htmlFor="shipping_address">Address *</FieldLabel>
                    <Input
                      id="shipping_address"
                      {...register("shipping_address")}
                      placeholder="123 Main Street"
                    />
                    {errors.shipping_address && (
                      <FieldError>{errors.shipping_address.message}</FieldError>
                    )}
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field data-invalid={errors.shipping_city ? true : undefined}>
                      <FieldLabel htmlFor="shipping_city">City *</FieldLabel>
                      <Input
                        id="shipping_city"
                        {...register("shipping_city")}
                        placeholder="Manila"
                      />
                      {errors.shipping_city && (
                        <FieldError>{errors.shipping_city.message}</FieldError>
                      )}
                    </Field>

                    <Field data-invalid={errors.shipping_state ? true : undefined}>
                      <FieldLabel htmlFor="shipping_state">State/Province</FieldLabel>
                      <Input
                        id="shipping_state"
                        {...register("shipping_state")}
                        placeholder="Metro Manila"
                      />
                      {errors.shipping_state && (
                        <FieldError>{errors.shipping_state.message}</FieldError>
                      )}
                    </Field>

                    <Field data-invalid={errors.shipping_zip ? true : undefined}>
                      <FieldLabel htmlFor="shipping_zip">ZIP Code</FieldLabel>
                      <Input
                        id="shipping_zip"
                        {...register("shipping_zip")}
                        placeholder="1000"
                      />
                      {errors.shipping_zip && (
                        <FieldError>{errors.shipping_zip.message}</FieldError>
                      )}
                    </Field>
                  </div>

                  <Field data-invalid={errors.shipping_country ? true : undefined}>
                    <FieldLabel htmlFor="shipping_country">Country *</FieldLabel>
                    <Input
                      id="shipping_country"
                      {...register("shipping_country")}
                      placeholder="Philippines"
                    />
                    {errors.shipping_country && (
                      <FieldError>{errors.shipping_country.message}</FieldError>
                    )}
                  </Field>
                </FieldGroup>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="use_same_billing"
                      checked={useSameBilling}
                      onCheckedChange={(checked) =>
                        setValue("use_same_billing", checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="use_same_billing"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Use same address for billing
                    </Label>
                  </div>

                  {!useSameBilling && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold">Billing Address</h3>
                      <FieldGroup>
                        <Field data-invalid={errors.billing_address ? true : undefined}>
                          <FieldLabel htmlFor="billing_address">Billing Address</FieldLabel>
                          <Input
                            id="billing_address"
                            {...register("billing_address")}
                            placeholder="123 Main Street"
                          />
                          {errors.billing_address && (
                            <FieldError>{errors.billing_address.message}</FieldError>
                          )}
                        </Field>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Field data-invalid={errors.billing_city ? true : undefined}>
                            <FieldLabel htmlFor="billing_city">City</FieldLabel>
                            <Input
                              id="billing_city"
                              {...register("billing_city")}
                              placeholder="Manila"
                            />
                            {errors.billing_city && (
                              <FieldError>{errors.billing_city.message}</FieldError>
                            )}
                          </Field>

                          <Field data-invalid={errors.billing_state ? true : undefined}>
                            <FieldLabel htmlFor="billing_state">State/Province</FieldLabel>
                            <Input
                              id="billing_state"
                              {...register("billing_state")}
                              placeholder="Metro Manila"
                            />
                            {errors.billing_state && (
                              <FieldError>{errors.billing_state.message}</FieldError>
                            )}
                          </Field>

                          <Field data-invalid={errors.billing_zip ? true : undefined}>
                            <FieldLabel htmlFor="billing_zip">ZIP Code</FieldLabel>
                            <Input
                              id="billing_zip"
                              {...register("billing_zip")}
                              placeholder="1000"
                            />
                            {errors.billing_zip && (
                              <FieldError>{errors.billing_zip.message}</FieldError>
                            )}
                          </Field>
                        </div>

                        <Field data-invalid={errors.billing_country ? true : undefined}>
                          <FieldLabel htmlFor="billing_country">Country</FieldLabel>
                          <Input
                            id="billing_country"
                            {...register("billing_country")}
                            placeholder="Philippines"
                          />
                          {errors.billing_country && (
                            <FieldError>{errors.billing_country.message}</FieldError>
                          )}
                        </Field>
                      </FieldGroup>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Payment Method */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">Payment Method</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose how you&apos;d like to pay
                  </p>
                </div>

                <Field data-invalid={errors.payment_method ? true : undefined}>
                  <div className="space-y-3">
                    {[
                      {
                        value: "CASH_ON_DELIVERY",
                        label: "Cash on Delivery",
                        description: "Pay when you receive your order",
                      },
                      {
                        value: "STRIPE",
                        label: "Stripe",
                        description: "Secure payment via Stripe",
                      },
                    ].map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() =>
                          setValue("payment_method", method.value as PaymentMethod)
                        }
                        className={cn(
                          "w-full text-left p-4 border rounded-lg transition-all",
                          paymentMethod === method.value
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "hover:bg-muted/50 hover:border-muted-foreground/30"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                              paymentMethod === method.value
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            )}
                          >
                            {paymentMethod === method.value && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{method.label}</div>
                            <div className="text-sm text-muted-foreground mt-0.5">
                              {method.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {errors.payment_method && (
                    <FieldError>{errors.payment_method.message}</FieldError>
                  )}
                </Field>
              </div>
            )}

            {/* Step 4: Order Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">Order Summary</h2>
                  <p className="text-sm text-muted-foreground">
                    Please review your order before placing it
                  </p>
                </div>

                {/* Customer Info Review */}
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Customer Information</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Name:</span> {formValues.customer_name}</p>
                      <p><span className="text-muted-foreground">Email:</span> {formValues.customer_email}</p>
                      {formValues.customer_phone && (
                        <p><span className="text-muted-foreground">Phone:</span> {formValues.customer_phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Shipping Address Review */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Shipping Address</h3>
                    <div className="text-sm space-y-1">
                      <p>{formValues.shipping_address}</p>
                      <p>
                        {formValues.shipping_city}
                        {formValues.shipping_state && `, ${formValues.shipping_state}`}
                        {formValues.shipping_zip && ` ${formValues.shipping_zip}`}
                      </p>
                      <p>{formValues.shipping_country}</p>
                    </div>
                  </div>

                  {/* Payment Method Review */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Payment Method</h3>
                    <p className="text-sm">
                      {formValues.payment_method === "CASH_ON_DELIVERY"
                        ? "Cash on Delivery"
                        : "Stripe"}
                    </p>
                  </div>

                  {/* Discount Code */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold mb-3">Discount Code</h3>
                    {/* Only show as applied if it's a manual code (user entered it) */}
                    {discountValidation?.valid && discountCode.trim() ? (
                      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                        <IconTag className="h-4 w-4 text-green-600" />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            {discountValidation.code} - {formatPrice(discountValidation.discount_amount || 0)} off
                          </span>
                        </div>
                        <Button
                          type="button"
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
                          placeholder="Enter discount code"
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              e.stopPropagation()
                              handleApplyDiscount()
                            }
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleApplyDiscount}
                          disabled={isValidatingDiscount || !discountCode.trim() || isMutating}
                          size="sm"
                        >
                          {isValidatingDiscount ? "..." : "Apply"}
                        </Button>
                      </div>
                    )}
                    
                  </div>

                  {/* Order Items - Using CartItem component */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Order Items</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          router.push("/cart")
                        }}
                        className="text-xs"
                      >
                        Edit in Cart
                      </Button>
                    </div>
                    {cartItems.map((item) => {
                      const isLastItem = cartItems.length === 1
                      const discountInfo = itemDiscountInfo.get(item.id)
                      return (
                        <CartItem
                          key={item.id}
                          item={item}
                          onUpdateQuantity={updateQuantity}
                          onChangeVariant={changeVariant}
                          onRemove={async (itemId) => {
                            await removeItem(itemId)
                            if (isLastItem) {
                              toast.info("Cart is now empty. Redirecting to cart...")
                              setTimeout(() => router.push("/cart"), 1000)
                            }
                          }}
                          discountInfo={discountInfo}
                        />
                      )
                    })}
                  </div>

                  {/* Totals */}
                  <div className="border rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{shippingCost > 0 ? formatPrice(shippingCost) : "Free"}</span>
                      </div>
                      {taxAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax</span>
                          <span>{formatPrice(taxAmount)}</span>
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-{formatPrice(discountAmount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span>{formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <IconArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button 
                type="button" 
                onClick={handleNext}
                disabled={cartItems.length === 0}
              >
                Next
                <IconArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={async () => {
                  // Validate form before submitting
                  const isValid = await form.trigger()
                  if (isValid) {
                    const formData = form.getValues()
                    await onSubmit(formData)
                  }
                }}
                disabled={createOrderMutation.isPending || cartItems.length === 0}
                className="min-w-[140px]"
              >
                {createOrderMutation.isPending ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <IconLock className="mr-2 h-4 w-4" />
                    Place Order
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </MaxWidthLayout>
  )
}

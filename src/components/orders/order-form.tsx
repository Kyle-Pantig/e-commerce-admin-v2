"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconLoader2,
  IconPackage,
  IconTicket,
  IconCheck,
  IconX,
  IconTruck,
  IconReceipt,
} from "@tabler/icons-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

import { ordersApi } from "@/lib/api/services/orders"
import { productsApi } from "@/lib/api/services/products"
import { discountsApi, type DiscountValidationResponse, type DiscountCode } from "@/lib/api"
import { shippingApi, type ShippingCalculationResponse } from "@/lib/api/services/shipping"
import { taxApi, type TaxCalculationResponse } from "@/lib/api/services/tax"
import { orderFormSchema, type OrderFormValues } from "@/lib/validations"
import { formatPrice, formatDiscountBadge as formatDiscountBadgeUtil } from "@/lib/utils"
import type { OrderCreate, PaymentMethod, Product, ProductVariant } from "@/lib/api/types"

// Helper to get discount for a product/variant
function getProductDiscount(
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
      // Has restrictions but doesn't match - continue to next
      continue
    }
    
    // No restrictions - applies to all
    return discount
  }
  return null
}

// Format discount badge text - wrapper for the utility
function formatDiscountBadge(discount: DiscountCode): string {
  return formatDiscountBadgeUtil(discount.discount_value, discount.discount_type as "PERCENTAGE" | "FIXED_AMOUNT")
}

// Calculate discount amount for an item
function calculateItemDiscount(
  unitPrice: number,
  quantity: number,
  discount: DiscountCode | null
): number {
  if (!discount) return 0
  
  const itemTotal = unitPrice * quantity
  let discountAmount = 0
  
  if (discount.discount_type === "PERCENTAGE") {
    discountAmount = (itemTotal * discount.discount_value) / 100
  } else {
    discountAmount = discount.discount_value * quantity
  }
  
  // Apply maximum discount cap if set
  if (discount.maximum_discount && discountAmount > discount.maximum_discount) {
    discountAmount = discount.maximum_discount
  }
  
  return discountAmount
}

// Calculate total discount for all items
function calculateTotalDiscount(
  items: OrderFormValues["items"],
  autoApplyDiscounts: DiscountCode[],
  subtotal: number
): { totalDiscount: number; applicableDiscount: DiscountCode | null; meetsMinimum: boolean } {
  let totalDiscount = 0
  let applicableDiscount: DiscountCode | null = null
  
  for (const item of items) {
    if (!item.product_id) continue
    const discount = getProductDiscount(item.product_id, item.variant_id || null, autoApplyDiscounts)
    if (discount) {
      applicableDiscount = discount
      totalDiscount += calculateItemDiscount(item.unit_price, item.quantity, discount)
    }
  }
  
  // Check minimum order amount
  const meetsMinimum = !applicableDiscount?.minimum_order_amount || subtotal >= applicableDiscount.minimum_order_amount
  
  if (!meetsMinimum) {
    totalDiscount = 0
  }
  
  return { totalDiscount, applicableDiscount, meetsMinimum }
}

interface CurrentUser {
  id: string
  name: string
  email: string
}

interface OrderFormProps {
  currentUserRole?: string
  currentUser?: CurrentUser
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "CASH_ON_DELIVERY", label: "Cash on Delivery" },
  { value: "STRIPE", label: "Stripe" },
]

export function OrderForm({ currentUserRole, currentUser }: OrderFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [selectedVariantId, setSelectedVariantId] = useState<string>("")
  
  // Discount code state
  const [discountCode, setDiscountCode] = useState<string>("")
  const [discountValidation, setDiscountValidation] = useState<DiscountValidationResponse | null>(null)
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false)
  const [appliedDiscountCodeId, setAppliedDiscountCodeId] = useState<string | null>(null)
  
  // Shipping calculation state
  const [shippingCalculation, setShippingCalculation] = useState<ShippingCalculationResponse | null>(null)
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false)
  
  // Tax calculation state
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculationResponse | null>(null)
  const [isCalculatingTax, setIsCalculatingTax] = useState(false)

  // Fetch products for selection
  const { data: productsData } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => productsApi.list({ per_page: 100, status: "ACTIVE" }),
  })

  // Fetch auto-apply discounts for badges
  const { data: autoApplyDiscounts = [] } = useQuery({
    queryKey: ["discounts", "auto-apply"],
    queryFn: () => discountsApi.getAutoApplyDiscounts(),
  })

  // Fetch selected product details (for variants)
  const { data: selectedProduct } = useQuery({
    queryKey: ["product", selectedProductId],
    queryFn: () => productsApi.get(selectedProductId),
    enabled: !!selectedProductId,
  })

  const form = useForm({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customer_name: currentUser?.name || "",
      customer_email: currentUser?.email || "",
      customer_phone: "",
      shipping_address: "",
      shipping_city: "",
      shipping_state: "",
      shipping_zip: "",
      shipping_country: "United States",
      same_as_shipping: true,
      billing_address: "",
      billing_city: "",
      billing_state: "",
      billing_zip: "",
      billing_country: "",
      payment_method: "CASH_ON_DELIVERY" as const,
      shipping_cost: 0,
      tax_amount: 0,
      discount_amount: 0,
      notes: "",
      internal_notes: "",
      items: [] as OrderFormValues["items"],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const watchSameAsShipping = form.watch("same_as_shipping")
  
  // Watch all form values to ensure reactivity when items change
  const formValues = form.watch()
  const watchItems = formValues.items || []
  const watchShippingCost = formValues.shipping_cost
  const watchTaxAmount = formValues.tax_amount
  const watchDiscountAmount = formValues.discount_amount

  // Calculate totals - recalculates whenever any form value changes
  const subtotal = watchItems.reduce((sum, item) => sum + ((item?.unit_price || 0) * (item?.quantity || 0)), 0)
  
  // Calculate auto-apply discount
  const autoDiscountResult = calculateTotalDiscount(watchItems, autoApplyDiscounts, subtotal)
  const effectiveDiscount = discountValidation?.valid ? (watchDiscountAmount || 0) : (autoDiscountResult.totalDiscount || 0)
  
  // Auto-calculate shipping when items change
  useEffect(() => {
    const calculateShipping = async () => {
      if (watchItems.length === 0) {
        setShippingCalculation(null)
        form.setValue("shipping_cost", 0)
        return
      }
      
      setIsCalculatingShipping(true)
      try {
        const productIds = watchItems
          .map(item => item?.product_id)
          .filter((id): id is string => !!id)
        
        const result = await shippingApi.calculate({
          order_subtotal: subtotal,
          product_ids: productIds.length > 0 ? productIds : undefined,
        })
        
        setShippingCalculation(result)
        form.setValue("shipping_cost", result.shipping_fee)
      } catch (error) {
        console.error("Failed to calculate shipping:", error)
        // Keep previous shipping cost on error
      } finally {
        setIsCalculatingShipping(false)
      }
    }
    
    // Debounce the calculation
    const timeoutId = setTimeout(calculateShipping, 300)
    return () => clearTimeout(timeoutId)
  }, [watchItems, subtotal, form])
  
  // Auto-calculate tax when items change
  useEffect(() => {
    const calculateTax = async () => {
      if (watchItems.length === 0) {
        setTaxCalculation(null)
        form.setValue("tax_amount", 0)
        return
      }
      
      setIsCalculatingTax(true)
      try {
        const productIds = watchItems
          .map(item => item?.product_id)
          .filter((id): id is string => !!id)
        
        const result = await taxApi.calculate({
          order_subtotal: subtotal,
          product_ids: productIds.length > 0 ? productIds : undefined,
        })
        
        setTaxCalculation(result)
        form.setValue("tax_amount", result.tax_amount)
      } catch (error) {
        console.error("Failed to calculate tax:", error)
        // Keep previous tax amount on error
      } finally {
        setIsCalculatingTax(false)
      }
    }
    
    // Debounce the calculation
    const timeoutId = setTimeout(calculateTax, 300)
    return () => clearTimeout(timeoutId)
  }, [watchItems, subtotal, form])
  
  const total = subtotal + (watchShippingCost || 0) + (watchTaxAmount || 0) - effectiveDiscount

  // Create order mutation
  const createMutation = useMutation({
    mutationFn: (data: OrderCreate) => ordersApi.create(data),
    onSuccess: (order) => {
      toast.success("Order created successfully")
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      router.push(`/orders/${order.order_number}`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create order")
    },
  })

  const onSubmit = (values: OrderFormValues) => {
    // Determine the discount to use - manual code takes priority over auto-apply
    const finalDiscountAmount = discountValidation?.valid 
      ? values.discount_amount 
      : (autoDiscountResult.meetsMinimum ? autoDiscountResult.totalDiscount : 0)
    const finalDiscountCodeId = appliedDiscountCodeId || 
      (autoDiscountResult.meetsMinimum && autoDiscountResult.applicableDiscount ? autoDiscountResult.applicableDiscount.id : undefined)
    
    const orderData: OrderCreate = {
      user_id: currentUser?.id,  // Link order to authenticated user
      customer_name: values.customer_name,
      customer_email: values.customer_email,
      customer_phone: values.customer_phone || undefined,
      shipping_address: values.shipping_address,
      shipping_city: values.shipping_city,
      shipping_state: values.shipping_state || undefined,
      shipping_zip: values.shipping_zip || undefined,
      shipping_country: values.shipping_country,
      billing_address: values.same_as_shipping ? undefined : values.billing_address || undefined,
      billing_city: values.same_as_shipping ? undefined : values.billing_city || undefined,
      billing_state: values.same_as_shipping ? undefined : values.billing_state || undefined,
      billing_zip: values.same_as_shipping ? undefined : values.billing_zip || undefined,
      billing_country: values.same_as_shipping ? undefined : values.billing_country || undefined,
      payment_method: values.payment_method,
      shipping_cost: values.shipping_cost,
      tax_amount: values.tax_amount,
      discount_amount: finalDiscountAmount,
      discount_code_id: finalDiscountCodeId,
      notes: values.notes || undefined,
      internal_notes: values.internal_notes || undefined,
      items: values.items.map(item => ({
        product_id: item.product_id || undefined,
        product_name: item.product_name,
        product_sku: item.product_sku || undefined,
        product_image: item.product_image || undefined,
        variant_id: item.variant_id || undefined,
        variant_name: item.variant_name || undefined,
        variant_options: item.variant_options || undefined,
        unit_price: item.unit_price,
        quantity: item.quantity,
      })),
    }
    
    createMutation.mutate(orderData)
  }
  
  // Validate discount code
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error("Please enter a discount code")
      return
    }
    
    setIsValidatingDiscount(true)
    try {
      const response = await discountsApi.validate({
        code: discountCode.trim(),
        order_subtotal: subtotal,
        user_id: currentUser?.id,
      })
      
      setDiscountValidation(response)
      
      if (response.valid && response.discount_amount) {
        // Apply the discount
        form.setValue("discount_amount", response.discount_amount)
        // Get the discount code ID
        const discountData = await discountsApi.getByCode(discountCode.trim())
        setAppliedDiscountCodeId(discountData.id)
        toast.success(response.message)
      } else {
        toast.error(response.message)
      }
    } catch (error) {
      toast.error("Failed to validate discount code")
      setDiscountValidation({ valid: false, message: "Failed to validate", code: null, discount_type: null, discount_value: null, discount_amount: null })
    } finally {
      setIsValidatingDiscount(false)
    }
  }
  
  // Remove applied discount
  const handleRemoveDiscount = () => {
    setDiscountCode("")
    setDiscountValidation(null)
    setAppliedDiscountCodeId(null)
    form.setValue("discount_amount", 0)
  }

  const addProductToOrder = () => {
    if (!selectedProductId) return

    const product = productsData?.items.find(p => p.id === selectedProductId)
    if (!product) return

    let itemToAdd: OrderFormValues["items"][0]

    if (selectedProduct?.has_variants && selectedVariantId) {
      const variant = selectedProduct.variants?.find(v => v.id === selectedVariantId)
      if (!variant) return

      itemToAdd = {
        product_id: product.id,
        product_name: product.name,
        product_sku: variant.sku || product.sku || undefined,
        product_image: variant.image_url || product.primary_image || undefined,
        variant_id: variant.id,
        variant_name: variant.name,
        variant_options: variant.options || undefined,
        unit_price: variant.sale_price || variant.price || product.sale_price || product.base_price,
        quantity: 1,
      }
    } else {
      itemToAdd = {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku || undefined,
        product_image: product.primary_image || undefined,
        unit_price: product.sale_price || product.base_price,
        quantity: 1,
      }
    }

    append(itemToAdd)
    setSelectedProductId("")
    setSelectedVariantId("")
  }

  return (
    <div className="px-4 lg:px-6 pb-12">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <IconArrowLeft className="mr-2 h-4 w-4" />
        Back to Orders
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                  <CardDescription>Enter customer details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customer_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                  <CardDescription>Where should the order be shipped?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="shipping_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St, Apt 4" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shipping_city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input placeholder="New York" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input placeholder="NY" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shipping_zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP/Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="10001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shipping_country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country *</FormLabel>
                          <FormControl>
                            <Input placeholder="United States" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Billing Address */}
              <Card>
                <CardHeader>
                  <CardTitle>Billing Address</CardTitle>
                  <CardDescription>Enter billing details or use shipping address</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="same_as_shipping"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Same as shipping address</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {!watchSameAsShipping && (
                    <>
                      <FormField
                        control={form.control}
                        name="billing_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main St, Apt 4" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="billing_city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="New York" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="billing_state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State/Province</FormLabel>
                              <FormControl>
                                <Input placeholder="NY" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="billing_zip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP/Postal Code</FormLabel>
                              <FormControl>
                                <Input placeholder="10001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="billing_country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <FormControl>
                                <Input placeholder="United States" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                  <CardDescription>Add products to this order</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Product Selector */}
                  <div className="flex gap-2">
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productsData?.items.map((product) => {
                          const discount = getProductDiscount(product.id, null, autoApplyDiscounts)
                          return (
                            <SelectItem key={product.id} value={product.id}>
                              <span className="flex items-center gap-2">
                                {product.name} - {formatPrice(product.sale_price || product.base_price)}
                                {discount && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    {formatDiscountBadge(discount)}
                                  </Badge>
                                )}
                              </span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    
                    {selectedProduct?.has_variants && selectedProduct.variants && (
                      <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                        <SelectTrigger className="w-[250px]">
                          <SelectValue placeholder="Select variant" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedProduct.variants.filter(v => v.is_active && v.stock > 0).map((variant) => {
                            const discount = getProductDiscount(selectedProduct.id, variant.id, autoApplyDiscounts)
                            return (
                              <SelectItem key={variant.id} value={variant.id}>
                                <span className="flex items-center gap-2">
                                  {variant.name} ({variant.stock} in stock)
                                  {discount && (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                      {formatDiscountBadge(discount)}
                                    </Badge>
                                  )}
                                </span>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Button
                      type="button"
                      onClick={addProductToOrder}
                      disabled={!selectedProductId || (selectedProduct?.has_variants && !selectedVariantId)}
                    >
                      <IconPlus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Items List */}
                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <IconPackage className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No items added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fields.map((field, index) => {
                        const item = watchItems[index]
                        const itemDiscount = item?.product_id 
                          ? getProductDiscount(item.product_id, item.variant_id || null, autoApplyDiscounts)
                          : null
                        
                        return (
                          <div
                            key={field.id}
                            className="flex items-center gap-4 p-4 border rounded-lg"
                          >
                            <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                              {item?.product_image ? (
                                <Image
                                  src={item.product_image!}
                                  alt={item.product_name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <IconPackage className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              {itemDiscount && (
                                <div className="absolute top-0 left-0 right-0">
                                  <Badge variant="destructive" className="text-[9px] px-1 py-0 rounded-none w-full justify-center">
                                    {formatDiscountBadge(itemDiscount)}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate flex items-center gap-2">
                                {item?.product_name}
                                {itemDiscount && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-green-600 bg-green-50">
                                    {itemDiscount.code}
                                  </Badge>
                                )}
                              </div>
                              {item?.variant_name && (
                                <div className="text-sm text-muted-foreground">
                                  {item.variant_name}
                                </div>
                              )}
                              <div className="text-sm text-muted-foreground">
                                {formatPrice(item?.unit_price || 0)} each
                              </div>
                            </div>
                            
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem className="w-20">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={1}
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            <div className="w-24 text-right font-medium">
                              {formatPrice((item?.unit_price || 0) * (item?.quantity || 1))}
                            </div>
                            
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <IconTrash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notes visible to customer..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="internal_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notes for staff only..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method.value} value={method.value}>
                                {method.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    
                    {/* Shipping */}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <IconTruck className="h-4 w-4" />
                        Shipping
                        {shippingCalculation?.rule_name && (
                          <span className="text-xs">({shippingCalculation.rule_name})</span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        {isCalculatingShipping ? (
                          <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : shippingCalculation?.is_free_shipping ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            FREE
                          </Badge>
                        ) : (
                          formatPrice(watchShippingCost || 0)
                        )}
                      </span>
                    </div>
                    
                    {/* Free shipping threshold hint */}
                    {shippingCalculation && !shippingCalculation.is_free_shipping && shippingCalculation.free_shipping_threshold && (
                      <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <IconTruck className="h-3.5 w-3.5" />
                          Add {formatPrice(shippingCalculation.free_shipping_threshold - subtotal)} more for free shipping!
                        </p>
                      </div>
                    )}
                    
                    {/* Tax */}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <IconReceipt className="h-4 w-4" />
                        Tax
                        {taxCalculation?.rule_name && (
                          <span className="text-xs">({taxCalculation.rule_name})</span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        {isCalculatingTax ? (
                          <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : taxCalculation ? (
                          <>
                            {formatPrice(watchTaxAmount || 0)}
                            {taxCalculation.tax_type === "PERCENTAGE" && (
                              <Badge variant="outline" className="text-xs">
                                {taxCalculation.tax_rate}%
                              </Badge>
                            )}
                          </>
                        ) : (
                          formatPrice(watchTaxAmount || 0)
                        )}
                      </span>
                    </div>
                    
                    {/* Tax info */}
                    {taxCalculation?.is_inclusive && (
                      <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                          <IconReceipt className="h-3.5 w-3.5" />
                          Tax is already included in product prices
                        </p>
                      </div>
                    )}
                    
                    {/* Discount Amount Display */}
                    {effectiveDiscount > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-muted-foreground">Discount</span>
                        <span>-{formatPrice(effectiveDiscount)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Auto-Apply Discount Notice */}
                  {autoDiscountResult.applicableDiscount && !appliedDiscountCodeId && (
                    <div className="border-t pt-4">
                      {autoDiscountResult.meetsMinimum ? (
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2">
                            <IconCheck className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                Auto-discount applied!
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <code className="font-mono font-bold">{autoDiscountResult.applicableDiscount.code}</code>
                                {" - "}
                                {formatDiscountBadge(autoDiscountResult.applicableDiscount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                          <div className="flex items-start gap-2">
                            <IconTicket className="h-4 w-4 text-amber-600 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                Discount available!
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Add {formatPrice((autoDiscountResult.applicableDiscount.minimum_order_amount || 0) - subtotal)} more to get{" "}
                                <code className="font-mono font-bold">{autoDiscountResult.applicableDiscount.code}</code>
                                {" ("}
                                {formatDiscountBadge(autoDiscountResult.applicableDiscount)}
                                {")"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Minimum order: {formatPrice(autoDiscountResult.applicableDiscount.minimum_order_amount || 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Discount Code Input */}
                  <div className="border-t pt-4 space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <IconTicket className="h-4 w-4" />
                      Discount Code
                    </Label>
                    
                    {appliedDiscountCodeId ? (
                      // Show applied discount
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2">
                          <IconCheck className="h-4 w-4 text-green-600" />
                          <div>
                            <code className="font-mono font-bold text-sm">{discountValidation?.code}</code>
                            <p className="text-xs text-muted-foreground">
                              {discountValidation?.discount_type && discountValidation?.discount_value
                                ? formatDiscountBadgeUtil(discountValidation.discount_value, discountValidation.discount_type as "PERCENTAGE" | "FIXED_AMOUNT").toLowerCase().replace("off", "off")
                                : ""
                              }
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveDiscount}
                          className="text-destructive hover:text-destructive"
                        >
                          <IconX className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      // Show input for entering code
                      <div className="flex gap-2">
                        <Input
                          placeholder={autoDiscountResult.meetsMinimum && autoDiscountResult.applicableDiscount 
                            ? "Auto-discount applied" 
                            : "Enter code"
                          }
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                          className="font-mono uppercase"
                          disabled={isValidatingDiscount || fields.length === 0 || (autoDiscountResult.meetsMinimum && !!autoDiscountResult.applicableDiscount)}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleApplyDiscount}
                          disabled={isValidatingDiscount || !discountCode.trim() || fields.length === 0 || (autoDiscountResult.meetsMinimum && !!autoDiscountResult.applicableDiscount)}
                        >
                          {isValidatingDiscount ? (
                            <IconLoader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Apply"
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {/* Show error message */}
                    {discountValidation && !discountValidation.valid && (
                      <p className="text-xs text-destructive">{discountValidation.message}</p>
                    )}
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="pt-6">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending || fields.length === 0}
                  >
                    {createMutation.isPending && (
                      <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Order
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}

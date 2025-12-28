"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
} from "@tabler/icons-react"
import Image from "next/image"

import { ordersApi } from "@/lib/api/services/orders"
import { productsApi } from "@/lib/api/services/products"
import type { OrderCreate, PaymentMethod, Product, ProductVariant } from "@/lib/api/types"

interface OrderFormProps {
  currentUserRole?: string
}

const orderItemSchema = z.object({
  product_id: z.string().optional().nullable(),
  product_name: z.string().min(1, "Product name is required"),
  product_sku: z.string().optional().nullable(),
  product_image: z.string().optional().nullable(),
  variant_id: z.string().optional().nullable(),
  variant_name: z.string().optional().nullable(),
  variant_options: z.record(z.string(), z.string()).optional().nullable(),
  unit_price: z.number().min(0, "Price must be positive"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
})

const orderFormSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_email: z.string().email("Invalid email address"),
  customer_phone: z.string().optional(),
  
  shipping_address: z.string().min(1, "Shipping address is required"),
  shipping_city: z.string().min(1, "City is required"),
  shipping_state: z.string().optional(),
  shipping_zip: z.string().optional(),
  shipping_country: z.string().min(1, "Country is required"),
  
  same_as_shipping: z.boolean().default(true),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_zip: z.string().optional(),
  billing_country: z.string().optional(),
  
  payment_method: z.enum(["CASH_ON_DELIVERY", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "DIGITAL_WALLET", "OTHER"]).optional(),
  
  shipping_cost: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  discount_amount: z.number().min(0).default(0),
  
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
})

type OrderFormValues = z.infer<typeof orderFormSchema>

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "CASH_ON_DELIVERY", label: "Cash on Delivery" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "DIGITAL_WALLET", label: "Digital Wallet" },
  { value: "OTHER", label: "Other" },
]

export function OrderForm({ currentUserRole }: OrderFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [selectedVariantId, setSelectedVariantId] = useState<string>("")

  // Fetch products for selection
  const { data: productsData } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => productsApi.list({ per_page: 100, status: "ACTIVE" }),
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
      customer_name: "",
      customer_email: "",
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

  const watchItems = form.watch("items")
  const watchSameAsShipping = form.watch("same_as_shipping")
  const watchShippingCost = form.watch("shipping_cost")
  const watchTaxAmount = form.watch("tax_amount")
  const watchDiscountAmount = form.watch("discount_amount")

  // Calculate totals
  const subtotal = useMemo(() => {
    return watchItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
  }, [watchItems])

  const total = useMemo(() => {
    return subtotal + (watchShippingCost || 0) + (watchTaxAmount || 0) - (watchDiscountAmount || 0)
  }, [subtotal, watchShippingCost, watchTaxAmount, watchDiscountAmount])

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
    const orderData: OrderCreate = {
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
      discount_amount: values.discount_amount,
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price)
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
                        {productsData?.items.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatPrice(product.sale_price || product.base_price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedProduct?.has_variants && selectedProduct.variants && (
                      <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select variant" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedProduct.variants.filter(v => v.is_active && v.stock > 0).map((variant) => (
                            <SelectItem key={variant.id} value={variant.id}>
                              {variant.name} ({variant.stock} in stock)
                            </SelectItem>
                          ))}
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
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-4 p-4 border rounded-lg"
                        >
                          <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            {watchItems[index]?.product_image ? (
                              <Image
                                src={watchItems[index].product_image!}
                                alt={watchItems[index].product_name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <IconPackage className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {watchItems[index]?.product_name}
                            </div>
                            {watchItems[index]?.variant_name && (
                              <div className="text-sm text-muted-foreground">
                                {watchItems[index].variant_name}
                              </div>
                            )}
                            <div className="text-sm text-muted-foreground">
                              {formatPrice(watchItems[index]?.unit_price || 0)} each
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
                            {formatPrice((watchItems[index]?.unit_price || 0) * (watchItems[index]?.quantity || 1))}
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
                      ))}
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
                    
                    <FormField
                      control={form.control}
                      name="shipping_cost"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel className="text-muted-foreground">Shipping</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                className="w-24 text-right"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tax_amount"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel className="text-muted-foreground">Tax</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                className="w-24 text-right"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="discount_amount"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel className="text-muted-foreground">Discount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                className="w-24 text-right"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
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

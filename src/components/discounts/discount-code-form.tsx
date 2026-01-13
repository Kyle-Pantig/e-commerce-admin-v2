"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { discountsApi, type DiscountCode, productsApi, categoriesApi, type Category } from "@/lib/api"
import { formatPrice } from "@/lib/utils"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { discountFormSchema, type DiscountFormData } from "@/lib/validations"
import {
  IconArrowLeft,
  IconChevronDown,
  IconX,
  IconSearch,
  IconPackage,
  IconLoader2,
  IconPercentage,
  IconClock,
  IconUsers,
  IconSparkles,
  IconTag,
} from "@tabler/icons-react"
import Image from "next/image"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"

interface DiscountCodeFormProps {
  discount?: DiscountCode
  onSuccess: () => void
  onCancel: () => void
}

export function DiscountCodeForm({ discount, onSuccess, onCancel }: DiscountCodeFormProps) {
  const isEditing = !!discount
  const [productSearch, setProductSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [isProductSectionOpen, setIsProductSectionOpen] = useState(
    !!((discount?.applicable_products && discount.applicable_products.length > 0) ||
       (discount?.applicable_variants && discount.applicable_variants.length > 0))
  )

  // Fetch products with variants for selection (max 100 per page due to backend limit)
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ["products", "all-for-discount-with-variants"],
    queryFn: () => productsApi.list({ per_page: 100, status: "ACTIVE", include_inactive: false }),
  })

  // Fetch categories for filtering
  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list({ include_inactive: false }),
  })

  const form = useForm({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      code: discount?.code || "",
      description: discount?.description || "",
      discount_type: (discount?.discount_type || "PERCENTAGE") as "PERCENTAGE" | "FIXED_AMOUNT",
      discount_value: discount?.discount_value || 10,
      minimum_order_amount: discount?.minimum_order_amount || null,
      maximum_discount: discount?.maximum_discount || null,
      usage_limit: discount?.usage_limit || null,
      usage_limit_per_user: discount?.usage_limit_per_user || null,
      is_active: discount?.is_active ?? true,
      auto_apply: discount?.auto_apply ?? false,
      show_badge: discount?.show_badge ?? true,
      start_date: discount?.start_date || null,
      end_date: discount?.end_date || null,
      applicable_products: discount?.applicable_products || [] as string[],
      applicable_variants: discount?.applicable_variants || [] as string[],
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: DiscountFormData) => discountsApi.create({
      code: data.code,
      description: data.description,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      minimum_order_amount: data.minimum_order_amount || undefined,
      maximum_discount: data.maximum_discount || undefined,
      usage_limit: data.usage_limit || undefined,
      usage_limit_per_user: data.usage_limit_per_user || undefined,
      is_active: data.is_active,
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
      auto_apply: data.auto_apply,
      show_badge: data.show_badge,
      applicable_products: data.applicable_products?.length ? data.applicable_products : undefined,
      applicable_variants: data.applicable_variants?.length ? data.applicable_variants : undefined,
    }),
    onSuccess: () => {
      toast.success("Discount code created successfully")
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create discount code")
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: DiscountFormData) => discountsApi.update(discount!.id, {
      code: data.code,
      description: data.description,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      minimum_order_amount: data.minimum_order_amount || undefined,
      maximum_discount: data.maximum_discount || undefined,
      usage_limit: data.usage_limit || undefined,
      usage_limit_per_user: data.usage_limit_per_user || undefined,
      is_active: data.is_active,
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
      auto_apply: data.auto_apply,
      show_badge: data.show_badge,
      applicable_products: data.applicable_products?.length ? data.applicable_products : undefined,
      applicable_variants: data.applicable_variants?.length ? data.applicable_variants : undefined,
    }),
    onSuccess: () => {
      toast.success("Discount code updated successfully")
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update discount code")
    },
  })

  const onSubmit = form.handleSubmit((data) => {
    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  })

  const isLoading = createMutation.isPending || updateMutation.isPending
  const discountType = form.watch("discount_type")
  const autoApply = form.watch("auto_apply")
  const selectedProductIds = form.watch("applicable_products") || []
  const selectedVariantIds = form.watch("applicable_variants") || []

  // Filter products based on search and category
  const filteredProducts = productsData?.items.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.variants?.some(v => v.name.toLowerCase().includes(productSearch.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  }) || []

  // Get selected product details
  const selectedProducts = productsData?.items.filter(p => 
    selectedProductIds.includes(p.id)
  ) || []

  // Get selected variant details with their parent products
  const selectedVariantsWithProducts = productsData?.items.flatMap(product => 
    (product.variants || [])
      .filter(v => selectedVariantIds.includes(v.id))
      .map(v => ({ ...v, productName: product.name, productImage: product.primary_image }))
  ) || []

  // Total selection count
  const totalSelections = selectedProductIds.length + selectedVariantIds.length

  // Toggle product selection (selects ALL variants of a product OR the product itself if no variants)
  const toggleProduct = (productId: string) => {
    const currentProducts = form.getValues("applicable_products") || []
    const currentVariants = form.getValues("applicable_variants") || []
    const product = productsData?.items.find(p => p.id === productId)
    
    if (product?.variants && product.variants.length > 0) {
      // Product has variants - manage via applicable_variants
      const productVariantIds = product.variants.map(v => v.id)
      const allVariantsSelected = productVariantIds.every(id => currentVariants.includes(id))
      
      if (allVariantsSelected) {
        // Deselect all variants of this product
        form.setValue("applicable_variants", currentVariants.filter(id => !productVariantIds.includes(id)))
      } else {
        // Select all variants of this product
        const newVariants = [...currentVariants.filter(id => !productVariantIds.includes(id)), ...productVariantIds]
        form.setValue("applicable_variants", newVariants)
      }
      // Remove from applicable_products if it was there
      form.setValue("applicable_products", currentProducts.filter(id => id !== productId))
    } else {
      // Product has no variants - manage via applicable_products
      if (currentProducts.includes(productId)) {
        form.setValue("applicable_products", currentProducts.filter(id => id !== productId))
      } else {
        form.setValue("applicable_products", [...currentProducts, productId])
      }
    }
  }

  // Toggle variant selection
  const toggleVariant = (variantId: string) => {
    const currentVariants = form.getValues("applicable_variants") || []
    
    if (currentVariants.includes(variantId)) {
      form.setValue("applicable_variants", currentVariants.filter(id => id !== variantId))
    } else {
      form.setValue("applicable_variants", [...currentVariants, variantId])
    }
  }

  // Check if a product is fully selected (product level OR all variants selected)
  const isProductSelected = (productId: string) => {
    const product = productsData?.items.find(p => p.id === productId)
    if (product?.variants && product.variants.length > 0) {
      // For products with variants, check if ALL variants are selected
      return product.variants.every(v => selectedVariantIds.includes(v.id))
    }
    // For products without variants, check applicable_products
    return selectedProductIds.includes(productId)
  }

  // Check if variant is selected
  const isVariantSelected = (variantId: string) => {
    return selectedVariantIds.includes(variantId)
  }

  // Toggle expanded state for a product
  const toggleExpanded = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  // Clear all selections
  const clearAllSelections = () => {
    form.setValue("applicable_products", [])
    form.setValue("applicable_variants", [])
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-12">
              {/* Basic Information */}
              <FieldSet>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconTag className="h-5 w-5 text-primary" />
                  </div>
                  <FieldLegend className="mb-0">Basic Information</FieldLegend>
                </div>
                <FieldGroup>
                  <Field data-invalid={form.formState.errors.code ? true : undefined}>
                    <FieldLabel htmlFor="code" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Discount Code *</FieldLabel>
                    <FormControl>
                      <Input
                        id="code"
                        placeholder="e.g., SUMMER20"
                        className="h-10 font-mono uppercase"
                        {...form.register("code")}
                        onChange={(e) => form.setValue("code", e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FieldDescription>Customers will enter this code at checkout</FieldDescription>
                    <FormMessage />
                  </Field>

                  <Field data-invalid={form.formState.errors.description ? true : undefined}>
                    <FieldLabel htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</FieldLabel>
                    <FormControl>
                      <Textarea
                        id="description"
                        placeholder="Internal description (not shown to customers)"
                        className="min-h-[100px]"
                        {...form.register("description")}
                      />
                    </FormControl>
                    <FormMessage />
                  </Field>
                </FieldGroup>
              </FieldSet>

              {/* Discount Configuration */}
              <FieldSet>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconPercentage className="h-5 w-5 text-primary" />
                  </div>
                  <FieldLegend className="mb-0">Discount Configuration</FieldLegend>
                </div>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="discount_type"
                      render={({ field }) => (
                        <Field data-invalid={form.formState.errors.discount_type ? true : undefined}>
                          <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Discount Type *</FieldLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                              <SelectItem value="FIXED_AMOUNT">Fixed Amount (₱)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </Field>
                      )}
                    />

                    <Field data-invalid={form.formState.errors.discount_value ? true : undefined}>
                      <FieldLabel htmlFor="discount_value" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Discount Value * {discountType === "PERCENTAGE" ? "(%)" : "(₱)"}
                      </FieldLabel>
                      <FormControl>
                        <Input
                          id="discount_value"
                          type="number"
                          step={discountType === "PERCENTAGE" ? "1" : "0.01"}
                          min="0"
                          max={discountType === "PERCENTAGE" ? "100" : undefined}
                          className="h-10"
                          {...form.register("discount_value", { valueAsNumber: true })}
                        />
                      </FormControl>
                      <FormMessage />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="minimum_order_amount"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Minimum Order Amount (₱)</FieldLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="No minimum"
                              className="h-10"
                              value={(field.value as number | null) ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </FormControl>
                          <FieldDescription>Leave empty for no minimum</FieldDescription>
                          <FormMessage />
                        </Field>
                      )}
                    />

                    {discountType === "PERCENTAGE" && (
                      <FormField
                        control={form.control}
                        name="maximum_discount"
                        render={({ field }) => (
                          <Field>
                            <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Maximum Discount Cap (₱)</FieldLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="No cap"
                                className="h-10"
                                value={(field.value as number | null) ?? ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              />
                            </FormControl>
                            <FieldDescription>Cap the maximum discount amount</FieldDescription>
                            <FormMessage />
                          </Field>
                        )}
                      />
                    )}
                  </div>
                </FieldGroup>
              </FieldSet>

              {/* Usage Limits */}
              <FieldSet>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconUsers className="h-5 w-5 text-primary" />
                  </div>
                  <FieldLegend className="mb-0">Usage Limits</FieldLegend>
                </div>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="usage_limit"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Usage Limit</FieldLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="Unlimited"
                              className="h-10"
                              value={(field.value as number | null) ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            />
                          </FormControl>
                          <FieldDescription>Maximum times this code can be used</FieldDescription>
                          <FormMessage />
                        </Field>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="usage_limit_per_user"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Per User Limit</FieldLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="Unlimited"
                              className="h-10"
                              value={(field.value as number | null) ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            />
                          </FormControl>
                          <FieldDescription>Maximum times each user can use this code</FieldDescription>
                          <FormMessage />
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>
              </FieldSet>

              {/* Validity Period */}
              <FieldSet>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconClock className="h-5 w-5 text-primary" />
                  </div>
                  <FieldLegend className="mb-0">Validity Period</FieldLegend>
                </div>
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Start Date & Time</FieldLabel>
                          <FormControl>
                            <DateTimePicker
                              value={field.value ? new Date(field.value) : undefined}
                              onChange={(date) => field.onChange(date?.toISOString() || null)}
                              placeholder="Select start date"
                              showTime
                            />
                          </FormControl>
                          <FieldDescription>When this code becomes active</FieldDescription>
                          <FormMessage />
                        </Field>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">End Date & Time</FieldLabel>
                          <FormControl>
                            <DateTimePicker
                              value={field.value ? new Date(field.value) : undefined}
                              onChange={(date) => field.onChange(date?.toISOString() || null)}
                              placeholder="Select end date"
                              showTime
                            />
                          </FormControl>
                          <FieldDescription>When this code expires</FieldDescription>
                          <FormMessage />
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>
              </FieldSet>

              {/* Product & Variant Selection */}
              <FieldSet>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconPackage className="h-5 w-5 text-primary" />
                  </div>
                  <FieldLegend className="mb-0">
                    Applicable Products & Variants
                    {totalSelections > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {totalSelections} selected
                      </Badge>
                    )}
                  </FieldLegend>
                </div>
                <Collapsible open={isProductSectionOpen} onOpenChange={setIsProductSectionOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm text-muted-foreground">
                          {totalSelections === 0 
                            ? "Leave empty to apply to all products" 
                            : "Discount will only apply to selected products/variants"
                          }
                        </p>
                      </div>
                      <IconChevronDown className={`h-4 w-4 transition-transform ${isProductSectionOpen ? "rotate-180" : ""}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="space-y-4">
                      {/* Selected Products & Variants */}
                      {(selectedProducts.length > 0 || selectedVariantsWithProducts.length > 0) && (
                        <div className="flex flex-wrap gap-2">
                          {/* Selected whole products */}
                          {selectedProducts.map(product => (
                            <Badge
                              key={`product-${product.id}`}
                              variant="secondary"
                              className="flex items-center gap-1 py-1.5 pl-2 pr-1"
                            >
                              {product.primary_image && (
                                <Image
                                  src={product.primary_image}
                                  alt={product.name}
                                  width={16}
                                  height={16}
                                  className="rounded object-cover"
                                />
                              )}
                              <span className="max-w-[150px] truncate">{product.name}</span>
                              {product.has_variants && (
                                <span className="text-xs text-muted-foreground">(all)</span>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleProduct(product.id)}
                                className="ml-1 rounded-full p-0.5 hover:bg-muted"
                              >
                                <IconX className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {/* Selected individual variants */}
                          {selectedVariantsWithProducts.map(variant => {
                            // Build options string for display
                            const optionsStr = variant.options 
                              ? Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`).join(", ")
                              : variant.name || "Variant"
                            
                            return (
                              <Badge
                                key={`variant-${variant.id}`}
                                variant="outline"
                                className="flex items-center gap-1 py-1.5 pl-2 pr-1"
                              >
                                {variant.productImage && (
                                  <Image
                                    src={variant.productImage}
                                    alt={`${variant.productName} - ${optionsStr}`}
                                    width={16}
                                    height={16}
                                    className="rounded object-cover"
                                  />
                                )}
                                <span className="max-w-[100px] truncate text-xs">{variant.productName}</span>
                                <span className="text-xs text-primary font-medium">→ {optionsStr}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = form.getValues("applicable_variants") || []
                                    form.setValue("applicable_variants", current.filter(id => id !== variant.id))
                                  }}
                                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                                >
                                  <IconX className="h-3 w-3" />
                                </button>
                              </Badge>
                            )
                          })}
                        </div>
                      )}

                      {/* Search and Category Filter */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search products or variants..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="pl-9 h-10"
                          />
                        </div>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger className="w-[180px] !h-10">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categoriesData?.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Product List with Variants */}
                      <ScrollArea className="h-[300px] rounded-md border">
                        <div className="p-2 space-y-1">
                          {isProductsLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-sm text-muted-foreground">Loading products...</span>
                            </div>
                          ) : filteredProducts.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No products found
                            </p>
                          ) : (
                            filteredProducts.map(product => {
                              const productSelected = isProductSelected(product.id)
                              const hasVariants = product.has_variants && product.variants && product.variants.length > 0
                              const isExpanded = expandedProducts.has(product.id)
                              const selectedVariantCount = hasVariants 
                                ? product.variants!.filter(v => selectedVariantIds.includes(v.id)).length 
                                : 0
                              
                              return (
                                <div key={product.id} className="space-y-1">
                                  {/* Product Row */}
                                  <div
                                    className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                                      productSelected ? "bg-primary/10" : "hover:bg-muted/50"
                                    }`}
                                  >
                                    {/* Expand button for products with variants */}
                                    {hasVariants ? (
                                      <button
                                        type="button"
                                        onClick={() => toggleExpanded(product.id)}
                                        className="p-1 hover:bg-muted rounded"
                                      >
                                        <IconChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                      </button>
                                    ) : (
                                      <div className="w-6" />
                                    )}
                                    
                                    <Checkbox
                                      checked={productSelected}
                                      onCheckedChange={() => toggleProduct(product.id)}
                                    />
                                    
                                    <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => toggleProduct(product.id)}>
                                      {product.primary_image ? (
                                        <Image
                                          src={product.primary_image}
                                          alt={product.name}
                                          width={32}
                                        height={32}
                                        className="rounded object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                        <IconPackage className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">{product.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {product.sale_price ? (
                                          <>
                                            <span className="text-destructive font-medium">{formatPrice(product.sale_price)}</span>
                                            <span className="line-through ml-1">{formatPrice(product.base_price)}</span>
                                          </>
                                        ) : (
                                          formatPrice(product.base_price)
                                        )}
                                        {hasVariants && ` • ${product.variants!.length} variants`}
                                        {!productSelected && selectedVariantCount > 0 && (
                                          <span className="text-primary"> ({selectedVariantCount} selected)</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  </div>
                                  
                                  {/* Variant List (expanded) */}
                                  {hasVariants && isExpanded && (
                                    <div className="ml-8 pl-4 border-l-2 border-muted space-y-1">
                                      {product.variants!.map(variant => {
                                        const variantSelected = isVariantSelected(variant.id)
                                        
                                        // Build options display string (e.g., "Size: L, Color: Red")
                                        const optionsStr = variant.options 
                                          ? Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`).join(", ")
                                          : ""
                                        
                                        // Display name - prefer options, then name
                                        const displayName = optionsStr || variant.name || `Variant ${variant.id.slice(0, 8)}`
                                        
                                        // Use sale_price if available, otherwise price, otherwise product's sale_price or base_price
                                        const displayPrice = variant.sale_price || variant.price || product.sale_price || product.base_price
                                        const hasDiscount = !!(variant.sale_price || (variant.price && product.sale_price))
                                        
                                        return (
                                          <label
                                            key={variant.id}
                                            className={`flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer ${
                                              variantSelected ? "bg-primary/5" : "hover:bg-muted/30"
                                            }`}
                                          >
                                            <Checkbox
                                              checked={variantSelected}
                                              onCheckedChange={() => toggleVariant(variant.id)}
                                            />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-primary">{displayName}</p>
                                              {variant.sku && (
                                                <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
                                              )}
                                              <p className="text-xs text-muted-foreground">
                                                {hasDiscount ? (
                                                  <span className="text-destructive font-medium">{formatPrice(displayPrice)}</span>
                                                ) : (
                                                  formatPrice(displayPrice)
                                                )}
                                                {variant.stock !== undefined && ` • Stock: ${variant.stock}`}
                                              </p>
                                            </div>
                                          </label>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </ScrollArea>

                      {totalSelections > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearAllSelections}
                        >
                          Clear all selections
                        </Button>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </FieldSet>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Status Card */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <div className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Active</p>
                          <p className="text-xs text-muted-foreground">
                            Enable this discount code
                          </p>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Auto-Apply Card */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <IconSparkles className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-medium">Auto-Apply Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="auto_apply"
                    render={({ field }) => (
                      <div className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Auto-Apply</p>
                          <p className="text-xs text-muted-foreground">
                            Show discounted prices automatically
                          </p>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    )}
                  />

                  {autoApply && (
                    <FormField
                      control={form.control}
                      name="show_badge"
                      render={({ field }) => (
                        <div className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">Show Badge</p>
                            <p className="text-xs text-muted-foreground">
                              Display discount badge on products
                            </p>
                          </div>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </div>
                      )}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Preview Card */}
              {isEditing && discount && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-medium">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Times Used</span>
                      <span className="font-medium">{discount.usage_count}</span>
                    </div>
                    {discount.usage_limit && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Usage Limit</span>
                        <span className="font-medium">{discount.usage_limit}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Floating Action Bar */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border rounded-full shadow-lg px-6 py-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isLoading}
                className="rounded-full"
              >
                <IconArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="rounded-full">
                {isLoading ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  isEditing ? "Update Code" : "Create Code"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}

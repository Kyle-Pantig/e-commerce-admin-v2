"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Form,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { shippingApi, productsApi, categoriesApi, type ShippingRule, type Category } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { shippingRuleFormSchema } from "@/lib/validations"
import { formatPrice } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  IconTruck,
  IconLoader2,
  IconCheck,
  IconX,
  IconGift,
  IconCurrencyPeso,
  IconChevronDown,
  IconSearch,
  IconPackage,
  IconArrowLeft,
} from "@tabler/icons-react"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"

interface ShippingRuleFormProps {
  rule?: ShippingRule
  onSuccess?: () => void
}

export function ShippingRuleForm({ rule, onSuccess }: ShippingRuleFormProps) {
  const router = useRouter()
  const { state: sidebarState, isMobile } = useSidebar()
  const isEditing = !!rule
  const [productSearch, setProductSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isProductSectionOpen, setIsProductSectionOpen] = useState(
    !!(rule?.applicable_products && rule.applicable_products.length > 0)
  )

  // Fetch products for selection
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ["products", "all-for-shipping"],
    queryFn: () => productsApi.list({ per_page: 100, status: "ACTIVE", include_inactive: false }),
  })

  // Fetch categories for filtering
  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list({ include_inactive: false }),
  })

  const form = useForm({
    resolver: zodResolver(shippingRuleFormSchema),
    defaultValues: {
      name: rule?.name || "",
      description: rule?.description || "",
      shipping_fee: rule?.shipping_fee || 0,
      free_shipping_threshold: rule?.free_shipping_threshold || null,
      is_active: rule?.is_active ?? true,
      applicable_products: rule?.applicable_products || [],
      priority: rule?.priority || 0,
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string | null; shipping_fee: number; free_shipping_threshold?: number | null; is_active: boolean; applicable_products?: string[]; priority: number }) => shippingApi.create({
      name: data.name,
      description: data.description || undefined,
      shipping_fee: data.shipping_fee,
      free_shipping_threshold: data.free_shipping_threshold || undefined,
      is_active: data.is_active,
      applicable_products: data.applicable_products?.length ? data.applicable_products : undefined,
      priority: data.priority,
    }),
    onSuccess: () => {
      toast.success("Shipping rule created successfully")
      onSuccess?.()
      router.push("/settings/shipping")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create shipping rule")
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string | null; shipping_fee: number; free_shipping_threshold?: number | null; is_active: boolean; applicable_products?: string[]; priority: number }) => shippingApi.update(rule!.id, {
      name: data.name,
      description: data.description || undefined,
      shipping_fee: data.shipping_fee,
      free_shipping_threshold: data.free_shipping_threshold,
      is_active: data.is_active,
      applicable_products: data.applicable_products?.length ? data.applicable_products : null,
      priority: data.priority,
    }),
    onSuccess: () => {
      toast.success("Shipping rule updated successfully")
      onSuccess?.()
      router.push("/settings/shipping")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update shipping rule")
    },
  })

  const onSubmit = form.handleSubmit((data) => {
    const formData = {
      name: data.name as string,
      description: data.description as string | null | undefined,
      shipping_fee: Number(data.shipping_fee),
      free_shipping_threshold: data.free_shipping_threshold ? Number(data.free_shipping_threshold) : null,
      is_active: Boolean(data.is_active),
      applicable_products: data.applicable_products as string[] | undefined,
      priority: Number(data.priority),
    }
    if (isEditing) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  })

  const isSaving = createMutation.isPending || updateMutation.isPending
  const shippingFee = form.watch("shipping_fee")
  const freeThreshold = form.watch("free_shipping_threshold")
  const isActive = form.watch("is_active")
  const selectedProductIds = form.watch("applicable_products") || []
  const hasChanges = form.formState.isDirty

  const handleDiscard = () => {
    form.reset()
    toast.info("Changes discarded")
  }

  const handleCancel = () => {
    router.push("/settings/shipping")
  }

  // Filter products based on search and category
  const filteredProducts = productsData?.items.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.sku?.toLowerCase().includes(productSearch.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  }) || []

  // Get selected product details
  const selectedProducts = productsData?.items.filter(p => 
    selectedProductIds.includes(p.id)
  ) || []

  // Toggle product selection
  const toggleProduct = (productId: string) => {
    const currentProducts = form.getValues("applicable_products") || []
    
    if (currentProducts.includes(productId)) {
      form.setValue("applicable_products", currentProducts.filter(id => id !== productId), { shouldDirty: true })
    } else {
      form.setValue("applicable_products", [...currentProducts, productId], { shouldDirty: true })
    }
  }

  // Check if product is selected
  const isProductSelected = (productId: string) => {
    return selectedProductIds.includes(productId)
  }

  // Clear all selections
  const clearAllSelections = () => {
    form.setValue("applicable_products", [], { shouldDirty: true })
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
                    <IconTruck className="h-5 w-5 text-primary" />
                  </div>
                  <FieldLegend className="mb-0">Basic Information</FieldLegend>
                </div>
                <FieldGroup>
                  <Field data-invalid={form.formState.errors.name ? true : undefined}>
                    <FieldLabel htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Rule Name *
                    </FieldLabel>
                    <FormControl>
                      <Input
                        id="name"
                        placeholder="e.g., Standard Shipping, Heavy Items"
                        className="h-10"
                        {...form.register("name")}
                      />
                    </FormControl>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["Standard Shipping", "Express Shipping", "Free Shipping", "Heavy Items", "Fragile Items", "Local Delivery", "Provincial Shipping", "Metro Manila"].map((suggestion) => (
                        <Badge
                          key={suggestion}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                          onClick={() => form.setValue("name", suggestion, { shouldDirty: true })}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                    <FieldDescription>
                      A descriptive name for this shipping rule. Click a suggestion above to use it.
                    </FieldDescription>
                    <FormMessage />
                  </Field>

                  <Field data-invalid={form.formState.errors.description ? true : undefined}>
                    <FieldLabel htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Description
                    </FieldLabel>
                    <FormControl>
                      <Textarea
                        id="description"
                        placeholder="Internal description (optional)"
                        className="min-h-[80px]"
                        {...form.register("description")}
                      />
                    </FormControl>
                    <FormMessage />
                  </Field>
                </FieldGroup>
              </FieldSet>

              {/* Shipping Fee */}
              <FieldSet>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconCurrencyPeso className="h-5 w-5 text-primary" />
                  </div>
                  <FieldLegend className="mb-0">Shipping Fee</FieldLegend>
                </div>
                <FieldGroup>
                  <Field data-invalid={form.formState.errors.shipping_fee ? true : undefined}>
                    <FieldLabel htmlFor="shipping_fee" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Shipping Fee *
                    </FieldLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                        <Input
                          id="shipping_fee"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="h-12 pl-8 text-lg font-semibold"
                          {...form.register("shipping_fee", { valueAsNumber: true })}
                        />
                      </div>
                    </FormControl>
                    <FieldDescription>
                      The shipping fee charged for orders matching this rule
                    </FieldDescription>
                    <FormMessage />
                  </Field>
                </FieldGroup>
              </FieldSet>

              {/* Free Shipping */}
              <FieldSet>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <IconGift className="h-5 w-5 text-green-600" />
                  </div>
                  <FieldLegend className="mb-0">Free Shipping</FieldLegend>
                </div>
                <FieldGroup>
                  <Field data-invalid={form.formState.errors.free_shipping_threshold ? true : undefined}>
                    <FieldLabel htmlFor="free_shipping_threshold" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Minimum Order Amount for Free Shipping
                    </FieldLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                        <Input
                          id="free_shipping_threshold"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Leave empty for no free shipping"
                          className="h-12 pl-8 text-lg font-semibold"
                          value={form.watch("free_shipping_threshold") ?? ""}
                          onChange={(e) => form.setValue(
                            "free_shipping_threshold", 
                            e.target.value ? parseFloat(e.target.value) : null,
                            { shouldDirty: true }
                          )}
                        />
                      </div>
                    </FormControl>
                    <FieldDescription>
                      Orders at or above this amount get free shipping. Leave empty to disable.
                    </FieldDescription>
                    <FormMessage />
                  </Field>
                </FieldGroup>
              </FieldSet>

              {/* Product Selection */}
              <FieldSet>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconPackage className="h-5 w-5 text-primary" />
                  </div>
                  <FieldLegend className="mb-0">
                    Applicable Products
                    {selectedProductIds.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedProductIds.length} selected
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
                        <p className="text-sm font-medium">
                          {selectedProductIds.length === 0 
                            ? "All Products (Default Rule)" 
                            : `${selectedProductIds.length} product${selectedProductIds.length > 1 ? 's' : ''} selected`
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedProductIds.length === 0 
                            ? "This rule applies to all products without a specific rule" 
                            : "This rule only applies to selected products"
                          }
                        </p>
                      </div>
                      <IconChevronDown className={`h-4 w-4 transition-transform ${isProductSectionOpen ? "rotate-180" : ""}`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="space-y-4">
                      {/* Selected Products */}
                      {selectedProducts.length > 0 && (
                        <div className="flex flex-wrap gap-2">
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
                              <button
                                type="button"
                                onClick={() => toggleProduct(product.id)}
                                className="ml-1 rounded-full p-0.5 hover:bg-muted"
                              >
                                <IconX className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Search and Category Filter */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search products..."
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

                      {/* Product List */}
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
                              
                              return (
                                <div
                                  key={product.id}
                                  className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                                    productSelected ? "bg-primary/10" : "hover:bg-muted/50"
                                  }`}
                                >
                                  <Checkbox
                                    checked={productSelected}
                                    onCheckedChange={() => toggleProduct(product.id)}
                                  />
                                  
                                  <div 
                                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" 
                                    onClick={() => toggleProduct(product.id)}
                                  >
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
                                        {product.sku && ` • ${product.sku}`}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </ScrollArea>

                      {selectedProductIds.length > 0 && (
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

            {/* Sidebar Column */}
            <div className="lg:col-span-1 space-y-12">
              {/* Status */}
              <FieldSet className="p-6 border border-border/50 rounded-2xl">
                <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Status</FieldLegend>
                <FieldGroup>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2">
                      <IconTruck className="h-4 w-4 text-primary" />
                      <Label htmlFor="is_active" className="text-[10px] font-bold uppercase tracking-widest text-primary cursor-pointer">
                        Rule Active
                      </Label>
                    </div>
                    <Checkbox 
                      id="is_active" 
                      checked={form.watch("is_active")}
                      onCheckedChange={(val) => form.setValue("is_active", val === true, { shouldDirty: true })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isActive 
                      ? "This rule is active and will be applied" 
                      : "This rule is inactive and won't be applied"}
                  </p>
                </FieldGroup>
              </FieldSet>

              {/* Priority */}
              <FieldSet className="p-6 border border-border/50 rounded-2xl">
                <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Priority</FieldLegend>
                <FieldGroup>
                  <Field data-invalid={form.formState.errors.priority ? true : undefined}>
                    <FieldLabel htmlFor="priority" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Rule Priority
                    </FieldLabel>
                    <FormControl>
                      <Input
                        id="priority"
                        type="number"
                        min="0"
                        className="h-10"
                        {...form.register("priority", { valueAsNumber: true })}
                      />
                    </FormControl>
                    <FieldDescription>
                      Higher priority rules are checked first. Product-specific rules override default rules.
                    </FieldDescription>
                    <FormMessage />
                  </Field>
                </FieldGroup>
              </FieldSet>

              {/* Preview */}
              <FieldSet className="p-6 border border-border/50 rounded-2xl bg-muted/30">
                <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Preview</FieldLegend>
                <FieldGroup className="space-y-4">
                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Shipping Fee</p>
                    <p className="text-2xl font-bold">₱{(shippingFee || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                  </div>
                  
                  {freeThreshold != null && freeThreshold > 0 ? (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-1">Free Shipping On</p>
                      <p className="text-xl font-bold text-green-600">Orders ≥ ₱{(freeThreshold ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
                      <p className="text-xs text-muted-foreground text-center">
                        No free shipping threshold
                      </p>
                    </div>
                  )}

                  {selectedProductIds.length > 0 ? (
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">Applies To</p>
                      <p className="text-sm font-semibold text-blue-600">
                        {selectedProductIds.length} specific product{selectedProductIds.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Applies To</p>
                      <p className="text-sm font-medium">All products (default)</p>
                    </div>
                  )}
                </FieldGroup>
              </FieldSet>
            </div>
          </div>

          {/* Floating Footer Action Bar */}
          <div className={cn(
            "fixed bottom-6 z-50 transition-all duration-300 ease-in-out px-4 flex justify-center pointer-events-none",
            isMobile ? "w-full left-0" : sidebarState === "expanded" ? "w-[calc(100%-18rem)] left-72" : "w-[calc(100%-3rem)] left-12"
          )}>
            <div className={cn(
              "bg-background/95 backdrop-blur-md border shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-6 pointer-events-auto transition-all transform duration-500",
              (hasChanges || !isEditing) ? "translate-y-0 opacity-100 scale-100" : "translate-y-20 opacity-0 scale-95"
            )}>
              <div className="flex flex-col pr-8 border-r">
                <span className="text-sm font-bold flex items-center gap-2">
                  {isEditing ? "Unsaved Changes" : "New Shipping Rule"}
                  <Badge variant="secondary" className="font-mono text-[10px] px-1.5 h-4">
                    {isEditing ? "MODIFIED" : "NEW"}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                  {isEditing ? "Review your modifications before saving." : "Fill in the details to create a new rule."}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={isEditing ? handleDiscard : handleCancel}
                  disabled={isSaving}
                  className="h-10 px-6 font-semibold border-2"
                >
                  <IconArrowLeft className="h-4 w-4 mr-2" />
                  {isEditing ? "Discard" : "Cancel"}
                </Button>
                <Button 
                  type="submit" 
                  className="h-10 px-8 font-bold shadow-lg shadow-primary/20" 
                  disabled={isSaving || (isEditing && !hasChanges)}
                >
                  {isSaving ? (
                    <>
                      <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <IconCheck className="h-4 w-4 mr-2" />
                      {isEditing ? "Update Rule" : "Create Rule"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}

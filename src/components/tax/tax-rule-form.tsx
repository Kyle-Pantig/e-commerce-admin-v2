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
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { taxApi, productsApi, categoriesApi, type TaxRule, type Category } from "@/lib/api"
import { taxRuleFormSchema } from "@/lib/validations"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  IconReceipt,
  IconLoader2,
  IconCheck,
  IconX,
  IconPercentage,
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

interface TaxRuleFormProps {
  rule?: TaxRule
  onSuccess?: () => void
}

const suggestedNames = [
  "Standard VAT",
  "Reduced Rate",
  "Zero Rate",
  "Exempt",
  "Luxury Tax",
  "Service Tax",
]

export function TaxRuleForm({ rule, onSuccess }: TaxRuleFormProps) {
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
    queryKey: ["products", "all-for-tax"],
    queryFn: () => productsApi.list({ per_page: 100, status: "ACTIVE", include_inactive: false }),
  })

  // Fetch categories for filtering
  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list({ include_inactive: false }),
  })

  const form = useForm({
    resolver: zodResolver(taxRuleFormSchema),
    defaultValues: {
      name: rule?.name || "",
      description: rule?.description || "",
      tax_rate: rule?.tax_rate || 0,
      tax_type: (rule?.tax_type || "PERCENTAGE") as "PERCENTAGE" | "FIXED",
      is_inclusive: rule?.is_inclusive ?? false,
      is_active: rule?.is_active ?? true,
      applicable_products: rule?.applicable_products || [],
      applicable_categories: rule?.applicable_categories || [],
      priority: rule?.priority || 0,
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string | null; tax_rate: number; tax_type: "PERCENTAGE" | "FIXED"; is_inclusive: boolean; is_active: boolean; applicable_products?: string[]; applicable_categories?: string[]; priority: number }) => taxApi.create({
      name: data.name,
      description: data.description || undefined,
      tax_rate: data.tax_rate,
      tax_type: data.tax_type,
      is_inclusive: data.is_inclusive,
      is_active: data.is_active,
      applicable_products: data.applicable_products?.length ? data.applicable_products : undefined,
      applicable_categories: data.applicable_categories?.length ? data.applicable_categories : undefined,
      priority: data.priority,
    }),
    onSuccess: () => {
      toast.success("Tax rule created successfully")
      onSuccess?.()
      router.push("/settings/tax")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create tax rule")
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string | null; tax_rate: number; tax_type: "PERCENTAGE" | "FIXED"; is_inclusive: boolean; is_active: boolean; applicable_products?: string[]; applicable_categories?: string[]; priority: number }) => taxApi.update(rule!.id, {
      name: data.name,
      description: data.description,
      tax_rate: data.tax_rate,
      tax_type: data.tax_type,
      is_inclusive: data.is_inclusive,
      is_active: data.is_active,
      applicable_products: data.applicable_products?.length ? data.applicable_products : null,
      applicable_categories: data.applicable_categories?.length ? data.applicable_categories : null,
      priority: data.priority,
    }),
    onSuccess: () => {
      toast.success("Tax rule updated successfully")
      onSuccess?.()
      router.push("/settings/tax")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update tax rule")
    },
  })

  const onSubmit = form.handleSubmit((data) => {
    const formData = {
      name: data.name as string,
      description: data.description as string | null | undefined,
      tax_rate: Number(data.tax_rate),
      tax_type: data.tax_type as "PERCENTAGE" | "FIXED",
      is_inclusive: Boolean(data.is_inclusive),
      is_active: Boolean(data.is_active),
      applicable_products: data.applicable_products as string[] | undefined,
      applicable_categories: data.applicable_categories as string[] | undefined,
      priority: Number(data.priority),
    }
    if (isEditing) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  })

  const isSaving = createMutation.isPending || updateMutation.isPending
  const taxRate = form.watch("tax_rate")
  const taxType = form.watch("tax_type")
  const isInclusive = form.watch("is_inclusive")
  const isActive = form.watch("is_active")
  const selectedProductIds = form.watch("applicable_products") || []
  const hasChanges = form.formState.isDirty

  const handleDiscard = () => {
    form.reset()
  }

  const handleCancel = () => {
    router.push("/settings/tax")
  }

  // Filter products based on search and category
  const filteredProducts = productsData?.items.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.sku?.toLowerCase().includes(productSearch.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  }) || []

  // Get selected product details
  const selectedProducts = productsData?.items.filter(p => selectedProductIds.includes(p.id)) || []

  // Product selection handlers
  const toggleProduct = (productId: string) => {
    const current = form.getValues("applicable_products") || []
    const updated = current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId]
    form.setValue("applicable_products", updated, { shouldDirty: true })
  }

  const isProductSelected = (productId: string) => {
    return selectedProductIds.includes(productId)
  }

  return (
    <div className="relative pb-24">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleCancel} className="mb-4">
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Back to Tax Rules
        </Button>
        <h1 className="text-2xl font-bold">{isEditing ? "Edit Tax Rule" : "Create Tax Rule"}</h1>
        <p className="text-muted-foreground">
          {isEditing ? "Update tax rule settings" : "Set up a new tax rule for your store"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <FieldSet>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconReceipt className="h-5 w-5 text-primary" />
                  </div>
                  <FieldLegend className="mb-0">Tax Rule Details</FieldLegend>
                </div>
                <FieldGroup>
                  <Field data-invalid={form.formState.errors.name ? true : undefined}>
                    <FieldLabel htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Rule Name *
                    </FieldLabel>
                    <FormControl>
                      <Input
                        id="name"
                        placeholder="e.g., Standard VAT"
                        className="h-12 text-lg font-semibold"
                        {...form.register("name")}
                      />
                    </FormControl>
                    <FieldDescription>
                      Click a suggestion: {suggestedNames.map((name, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="ml-1 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => form.setValue("name", name, { shouldDirty: true })}
                        >
                          {name}
                        </Badge>
                      ))}
                    </FieldDescription>
                    <FormMessage />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Description
                    </FieldLabel>
                    <FormControl>
                      <Textarea
                        id="description"
                        placeholder="Internal notes about this tax rule..."
                        rows={3}
                        {...form.register("description")}
                      />
                    </FormControl>
                    <FieldDescription>
                      Optional internal description (not shown to customers)
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </FieldSet>

              {/* Tax Rate */}
              <FieldSet>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <IconPercentage className="h-5 w-5 text-amber-600" />
                  </div>
                  <FieldLegend className="mb-0">Tax Rate</FieldLegend>
                </div>
                <FieldGroup>
                  <div className="grid grid-cols-2 gap-4">
                    <Field data-invalid={form.formState.errors.tax_rate ? true : undefined}>
                      <FieldLabel htmlFor="tax_rate" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Rate *
                      </FieldLabel>
                      <FormControl>
                        <div className="relative">
                          {taxType === "FIXED" && (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                          )}
                          <Input
                            id="tax_rate"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="12"
                            className={cn("h-12 text-lg font-semibold", taxType === "FIXED" && "pl-8")}
                            value={form.watch("tax_rate") ?? ""}
                            onChange={(e) => form.setValue(
                              "tax_rate",
                              e.target.value ? parseFloat(e.target.value) : 0,
                              { shouldDirty: true }
                            )}
                          />
                          {taxType === "PERCENTAGE" && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </Field>
                    <Field>
                      <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Type
                      </FieldLabel>
                      <Select 
                        value={taxType} 
                        onValueChange={(value: "PERCENTAGE" | "FIXED") => form.setValue("tax_type", value, { shouldDirty: true })}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                          <SelectItem value="FIXED">Fixed Amount (₱)</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FieldLabel className="text-sm font-medium">Tax Inclusive Pricing</FieldLabel>
                        <FieldDescription className="text-xs">
                          When enabled, product prices already include this tax
                        </FieldDescription>
                      </div>
                      <Switch
                        checked={isInclusive}
                        onCheckedChange={(checked) => form.setValue("is_inclusive", checked, { shouldDirty: true })}
                      />
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="priority" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Priority
                    </FieldLabel>
                    <FormControl>
                      <Input
                        id="priority"
                        type="number"
                        min="0"
                        placeholder="0"
                        className="h-10"
                        value={form.watch("priority") ?? ""}
                        onChange={(e) => form.setValue(
                          "priority",
                          e.target.value ? parseInt(e.target.value) : 0,
                          { shouldDirty: true }
                        )}
                      />
                    </FormControl>
                    <FieldDescription>
                      Higher priority rules are checked first (useful for product-specific rules)
                    </FieldDescription>
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
                                  
                                  {product.primary_image ? (
                                    <Image
                                      src={product.primary_image}
                                      alt={product.name}
                                      width={40}
                                      height={40}
                                      className="rounded-md object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                                      <IconPackage className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{product.name}</p>
                                    {product.sku && (
                                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </FieldSet>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status */}
              <FieldSet className="p-4 rounded-lg border bg-card">
                <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Status</FieldLegend>
                <FieldGroup>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FieldLabel className="text-sm font-medium">Active</FieldLabel>
                      <FieldDescription className="text-xs">
                        Enable or disable this tax rule
                      </FieldDescription>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => form.setValue("is_active", checked, { shouldDirty: true })}
                    />
                  </div>
                </FieldGroup>
              </FieldSet>

              {/* Preview */}
              <FieldSet className="p-4 rounded-lg border bg-card">
                <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Preview</FieldLegend>
                <FieldGroup className="space-y-4">
                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Tax Rate</p>
                    <p className="text-2xl font-bold">
                      {taxType === "PERCENTAGE" 
                        ? `${(taxRate || 0).toFixed(2)}%`
                        : `₱${(taxRate || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                      }
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isInclusive ? "Inclusive (already in price)" : "Exclusive (added to price)"}
                    </p>
                  </div>
                  
                  {/* Example Calculation */}
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Example (₱1,000 order)</p>
                    {taxType === "PERCENTAGE" ? (
                      isInclusive ? (
                        <>
                          <p className="text-sm">Tax Amount: <span className="font-bold">₱{((1000 - (1000 / (1 + (taxRate || 0) / 100)))).toFixed(2)}</span></p>
                          <p className="text-xs text-muted-foreground">Already included in ₱1,000</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm">Tax Amount: <span className="font-bold">₱{((1000 * (taxRate || 0) / 100)).toFixed(2)}</span></p>
                          <p className="text-xs text-muted-foreground">Total: ₱{(1000 + (1000 * (taxRate || 0) / 100)).toFixed(2)}</p>
                        </>
                      )
                    ) : (
                      <>
                        <p className="text-sm">Tax Amount: <span className="font-bold">₱{(taxRate || 0).toFixed(2)}</span></p>
                        <p className="text-xs text-muted-foreground">Total: ₱{(1000 + (taxRate || 0)).toFixed(2)}</p>
                      </>
                    )}
                  </div>

                  {selectedProductIds.length > 0 && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-primary font-medium">
                        Applies to {selectedProductIds.length} specific product{selectedProductIds.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  )}
                </FieldGroup>
              </FieldSet>
            </div>
          </div>
        </form>
      </Form>

      {/* Floating Action Bar */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          "transition-[left] duration-200 ease-linear",
          !isMobile && sidebarState === "expanded" && "left-[var(--sidebar-width)]",
          !isMobile && sidebarState === "collapsed" && "left-[var(--sidebar-width-icon)]"
        )}
      >
        <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-2">
            {hasChanges ? (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                Unsaved changes
              </Badge>
            ) : (
              <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                <IconCheck className="h-3 w-3 mr-1" />
                No changes
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={isEditing ? handleDiscard : handleCancel}
              disabled={isSaving || (!hasChanges && isEditing)}
            >
              {isEditing ? "Discard" : "Cancel"}
            </Button>
            <Button
              type="submit"
              onClick={onSubmit}
              disabled={isSaving || !hasChanges}
            >
              {isSaving && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Rule"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

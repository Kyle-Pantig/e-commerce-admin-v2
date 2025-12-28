"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Image from "next/image"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Form,
  FormControl,
  FormDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  IconArrowLeft,
  IconUpload,
  IconTrash,
  IconPlus,
  IconLoader2,
  IconGripVertical,
  IconStar,
  IconStarFilled,
  IconCheck,
  IconX,
  IconEdit,
  IconChevronRight,
  IconSettings,
  IconFolder,
  IconFolderOpen,
} from "@tabler/icons-react"

import { productSchema, type ProductFormData } from "@/lib/validations/product"
import { productsApi } from "@/lib/api/services/products"
import { uploadApi } from "@/lib/api/services/upload"
import type { Product, Category, ProductStatus, Attribute } from "@/lib/api/types"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldSeparator,
} from "@/components/ui/field"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { LoadingState } from "@/components/ui/loading-state"

interface ProductFormProps {
  product?: Product
  categories: Category[]
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading?: boolean
  isCategoriesLoading?: boolean
  currentUserRole?: string
}

interface LocalImage {
  id: string
  url: string
  alt_text?: string
  display_order: number
  is_primary: boolean
  file?: File
  isNew?: boolean
}

interface LocalVariant {
  id?: string
  name: string
  sku: string
  price: number
  sale_price?: number
  stock: number
  low_stock_threshold?: number
  is_active: boolean
  options: Record<string, string>
  isExisting?: boolean
}

// Primary image display component (not sortable)
function PrimaryMediaDisplay({
  image,
  onRemove,
}: {
  image: LocalImage
  onRemove: () => void
}) {
  return (
    <div className="relative group rounded-xl overflow-hidden bg-muted transition-all border-2 border-dashed border-muted-foreground/20 aspect-square md:aspect-[16/9] w-full">
      <Image
        src={image.url}
        alt={image.alt_text || "Primary product image"}
        fill
        className="object-cover"
      />
      
      <Badge className="absolute top-4 right-4 bg-yellow-500 text-black border-none shadow-lg z-10">
        <IconStarFilled className="h-3 w-3 mr-1" />
        Primary Image
      </Badge>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-20">
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-9 w-9 bg-red-500 hover:bg-red-600 text-white border-none shadow-lg"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <IconTrash className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

// Sortable thumbnail item component
function SortableThumbnailItem({
  image,
  onRemove,
  onSetPrimary,
}: {
  image: LocalImage
  onRemove: () => void
  onSetPrimary: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-xl overflow-hidden bg-muted transition-all border aspect-square",
        isDragging && "shadow-2xl scale-[1.02] border-primary"
      )}
    >
      <Image
        src={image.url}
        alt={image.alt_text || "Product thumbnail"}
        fill
        className="object-cover"
      />
      
      {/* Drag Handle - top-left corner */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg cursor-grab active:cursor-grabbing text-white opacity-0 group-hover:opacity-100 transition-opacity z-30"
      >
        <IconGripVertical className="h-4 w-4" />
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-20">
        <Button
          type="button"
          variant="secondary"
          className="h-7 px-3 bg-white hover:bg-white/90 text-black border-none text-[9px] font-bold uppercase tracking-widest shadow-lg"
          onClick={(e) => {
            e.stopPropagation()
            onSetPrimary()
          }}
        >
          Set Primary
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-7 w-7 bg-red-500 hover:bg-red-600 text-white border-none shadow-lg"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <IconTrash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function ProductForm({ 
  product, 
  categories, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  isCategoriesLoading = false,
  currentUserRole 
}: ProductFormProps) {
  const router = useRouter()
  const { state: sidebarState, isMobile } = useSidebar()
  const isEditing = !!product

  // Local state for images
  const [localImages, setLocalImages] = useState<LocalImage[]>(() => {
    if (product?.images) {
      return [...product.images].sort((a, b) => a.display_order - b.display_order).map((img) => ({
        id: img.id,
        url: img.url,
        alt_text: img.alt_text || undefined,
        display_order: img.display_order,
        is_primary: img.is_primary,
      }))
    }
    return []
  })
  const [uploadingImages, setUploadingImages] = useState(false)

  // Local state for variants
  const [variants, setVariants] = useState<LocalVariant[]>(() => {
    if (product?.variants) {
      return product.variants.map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku || "",
        price: v.price || 0,
        sale_price: v.sale_price || undefined,
        stock: v.stock,
        low_stock_threshold: v.low_stock_threshold || undefined,
        is_active: v.is_active,
        options: (v.options as Record<string, string>) || {},
        isExisting: true
      }))
    }
    return []
  })

  // State for variant editing/adding
  const [editingVariant, setEditingVariant] = useState<LocalVariant | null>(null)
  const [originalVariant, setOriginalVariant] = useState<LocalVariant | null>(null)
  const [isAddingVariant, setIsAddingVariant] = useState(false)
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null)

  // State for new variant options
  const [newOptionKey, setNewOptionKey] = useState("")
  const [newOptionValue, setNewOptionValue] = useState("")

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Flatten categories for dropdown with parent path and children info
  const flatCategories = useMemo(() => {
    const result: { 
      id: string
      name: string
      level: number
      parentPath: string[]
      hasChildren: boolean
    }[] = []
    
    const processCategory = (
      cat: Category, 
      level: number = 0, 
      parentPath: string[] = []
    ) => {
      const hasChildren = !!(cat.children && cat.children.length > 0)
      result.push({ 
        id: cat.id, 
        name: cat.name, 
        level,
        parentPath: [...parentPath],
        hasChildren
      })
      if (cat.children) {
        cat.children.forEach((child) => 
          processCategory(child, level + 1, [...parentPath, cat.name])
        )
      }
    }
    categories.forEach((cat) => processCategory(cat))
    return result
  }, [categories])

  // Form setup
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      short_description: product?.short_description || "",
      sku: product?.sku || "",
      status: (product?.status as ProductStatus) || "DRAFT",
      base_price: product?.base_price || 0,
      sale_price: product?.sale_price || undefined,
      cost_price: product?.cost_price || undefined,
      category_id: product?.category_id || "",
      stock: product?.stock || 0,
      low_stock_threshold: product?.low_stock_threshold || undefined,
      track_inventory: product?.track_inventory ?? true,
      weight: product?.weight || undefined,
      length: product?.length || undefined,
      width: product?.width || undefined,
      height: product?.height || undefined,
      meta_title: product?.meta_title || "",
      meta_description: product?.meta_description || "",
      is_featured: product?.is_featured || false,
      has_variants: product?.has_variants || false,
      attribute_values: product?.attribute_values?.map((av) => ({
        attribute_id: av.attribute_id,
        value: av.value,
      })) || [],
    },
  })

  // Attribute values array management
  const { fields: attributeFields, append: appendAttribute, remove: removeAttribute } = useFieldArray({
    control: form.control,
    name: "attribute_values",
  })

  const selectedCategoryId = form.watch("category_id")
  const { data: categoryAttributes = [], isLoading: isAttributesLoading } = useQuery<Attribute[]>({
    queryKey: ["category-attributes", selectedCategoryId],
    queryFn: () => productsApi.getCategoryAttributes(selectedCategoryId),
    enabled: !!selectedCategoryId,
  })

  // Track if we've initialized the form to prevent false dirty state
  const [isInitialized, setIsInitialized] = useState(false)
  
  useEffect(() => {
    if (product && !isInitialized) {
      // Reset form once on initial load to ensure clean state
      form.reset({
        name: product.name || "",
        description: product.description || "",
        short_description: product.short_description || "",
        sku: product.sku || "",
        status: (product.status as ProductStatus) || "DRAFT",
        base_price: product.base_price || 0,
        sale_price: product.sale_price || undefined,
        cost_price: product.cost_price || undefined,
        category_id: product.category_id || "",
        stock: product.stock || 0,
        low_stock_threshold: product.low_stock_threshold || undefined,
        track_inventory: product.track_inventory ?? true,
        weight: product.weight || undefined,
        length: product.length || undefined,
        width: product.width || undefined,
        height: product.height || undefined,
        meta_title: product.meta_title || "",
        meta_description: product.meta_description || "",
        is_featured: product.is_featured || false,
        has_variants: product.has_variants || false,
        attribute_values: product.attribute_values?.map((av) => ({
          attribute_id: av.attribute_id,
          value: av.value,
        })) || [],
      }, { keepDefaultValues: false })
      setIsInitialized(true)
    } else if (!product) {
      setIsInitialized(false)
    }
  }, [product?.id, isInitialized, form])

  // Watch for changes to enable/disable update button
  const formValues = form.watch()
  const { isDirty } = form.formState

  const imagesChanged = useMemo(() => {
    if (!product) return localImages.length > 0
    
    const originalImages = [...(product.images || [])]
      .sort((a, b) => a.display_order - b.display_order)
      .map(img => ({
        id: img.id,
        url: img.url,
        is_primary: img.is_primary,
        display_order: img.display_order
      }))
    
    const currentImages = [...localImages]
      .sort((a, b) => a.display_order - b.display_order)
      .map(img => ({
        id: img.id,
        url: img.url,
        is_primary: img.is_primary,
        display_order: img.display_order
      }))
    
    if (currentImages.length !== originalImages.length) return true
    
    // Deep comparison
    return currentImages.some((img, idx) => {
      const orig = originalImages[idx]
      if (!orig) return true
      return (
        img.id !== orig.id ||
        img.url !== orig.url ||
        img.is_primary !== orig.is_primary ||
        img.display_order !== orig.display_order
      )
    })
  }, [localImages, product])

  const variantsChanged = useMemo(() => {
    if (!product) return variants.length > 0
    
    const originalVariants = (product.variants || []).map(v => ({
      id: v.id,
      name: v.name,
      sku: v.sku || "",
      price: v.price || 0,
      sale_price: v.sale_price ?? null,
      stock: v.stock,
      low_stock_threshold: v.low_stock_threshold ?? null,
      is_active: v.is_active,
      options: (v.options as Record<string, string>) || {}
    }))
    
    const currentVariants = variants.map(v => ({
      id: v.id,
      name: v.name,
      sku: v.sku || "",
      price: v.price || 0,
      sale_price: v.sale_price ?? null,
      stock: v.stock,
      low_stock_threshold: v.low_stock_threshold ?? null,
      is_active: v.is_active,
      options: v.options || {}
    }))
    
    if (currentVariants.length !== originalVariants.length) return true
    
    // Separate existing and new variants
    const existingCurrent = currentVariants.filter(v => v.id)
    const newCurrent = currentVariants.filter(v => !v.id)
    
    // If there are new variants, there are changes
    if (newCurrent.length > 0) return true
    
    // Sort by ID for consistent comparison (only existing variants)
    const sortedOriginal = [...originalVariants].sort((a, b) => a.id.localeCompare(b.id))
    const sortedCurrent = [...existingCurrent].sort((a, b) => (a.id || "").localeCompare(b.id || ""))
    
    if (sortedCurrent.length !== sortedOriginal.length) return true
    
    // Deep comparison with normalized JSON
    const normalizeForComparison = (variant: typeof currentVariants[0]) => {
      const sortedOptions = Object.keys(variant.options)
        .sort()
        .reduce((acc, key) => {
          acc[key] = variant.options[key]
          return acc
        }, {} as Record<string, string>)
      
      return JSON.stringify({
        id: variant.id || "",
        name: variant.name,
        sku: variant.sku,
        price: variant.price,
        sale_price: variant.sale_price,
        stock: variant.stock,
        low_stock_threshold: variant.low_stock_threshold,
        is_active: variant.is_active,
        options: sortedOptions
      })
    }
    
    return sortedOriginal.some((orig, idx) => {
      const curr = sortedCurrent[idx]
      if (!curr) return true
      return normalizeForComparison(orig) !== normalizeForComparison(curr)
    })
  }, [variants, product])

  const hasChanges = isDirty || imagesChanged || variantsChanged

  const handleFormSubmit = (values: ProductFormData) => {
    const finalData = {
      ...values,
      images: localImages.map(img => ({
        url: img.url,
        alt_text: img.alt_text,
        display_order: img.display_order,
        is_primary: img.is_primary
      })),
      variants: variants.map(v => ({
        name: v.name,
        sku: v.sku,
        price: v.price,
        sale_price: v.sale_price,
        stock: v.stock,
        low_stock_threshold: v.low_stock_threshold,
        is_active: v.is_active,
        options: v.options
      }))
    }
    onSubmit(finalData)
  }

  // Image handling
  const handleImageUpload = async (files: FileList) => {
    setUploadingImages(true)
    try {
      const newImages: LocalImage[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const result = await uploadApi.uploadImage(file, {
          folder: "products",
          bucket: "products",
          product_id: product?.id,
        })
        newImages.push({
          id: `new-${Date.now()}-${i}`,
          url: result.url,
          alt_text: file.name,
          display_order: localImages.length + i,
          is_primary: localImages.length === 0 && i === 0,
          isNew: true,
        })
      }
      setLocalImages((prev) => [...prev, ...newImages])
      toast.success(`Uploaded ${files.length} image(s)`)
    } catch (error) {
      toast.error("Failed to upload images")
    } finally {
      setUploadingImages(false)
    }
  }

  const handleRemoveImage = (id: string) => {
    setLocalImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id)
      if (filtered.length > 0 && !filtered.some((img) => img.is_primary)) {
        filtered[0].is_primary = true
      }
      return filtered.map((img, idx) => ({ ...img, display_order: idx }))
    })
  }

  const handleSetPrimary = (id: string) => {
    setLocalImages((prev) =>
      prev.map((img) => ({
        ...img,
        is_primary: img.id === id,
      }))
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setLocalImages((prev) => {
      const oldIndex = prev.findIndex((img) => img.id === active.id)
      const newIndex = prev.findIndex((img) => img.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      return reordered.map((img, idx) => ({ ...img, display_order: idx }))
    })
  }

  // Variant handling
  const startAddVariant = () => {
    setEditingVariant({
      name: "",
      sku: "",
      price: form.getValues("base_price") || 0,
      stock: 0,
      is_active: true,
      options: {},
    })
    setOriginalVariant(null)
    setIsAddingVariant(true)
    setEditingVariantIndex(null)
  }

  const startEditVariant = (variant: LocalVariant, index: number) => {
    setEditingVariant({ ...variant })
    setOriginalVariant({ ...variant })
    setIsAddingVariant(false)
    setEditingVariantIndex(index)
  }

  const cancelVariantEdit = () => {
    setEditingVariant(null)
    setOriginalVariant(null)
    setIsAddingVariant(false)
    setEditingVariantIndex(null)
    setNewOptionKey("")
    setNewOptionValue("")
  }

  const saveVariant = () => {
    if (!editingVariant?.name) {
      toast.error("Variant name is required")
      return
    }
    
    setVariants(prev => {
      const updated = [...prev]
      if (isAddingVariant) {
        updated.push(editingVariant)
      } else if (editingVariantIndex !== null) {
        updated[editingVariantIndex] = editingVariant
      }
      return updated
    })
    
    cancelVariantEdit()
  }

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index))
  }

  const addVariantOption = () => {
    if (!editingVariant || !newOptionKey.trim() || !newOptionValue.trim()) return
    setEditingVariant({
      ...editingVariant,
      options: {
        ...editingVariant.options,
        [newOptionKey.trim()]: newOptionValue.trim()
      }
    })
    setNewOptionKey("")
    setNewOptionValue("")
  }

  const removeVariantOption = (key: string) => {
    if (!editingVariant) return
    const newOptions = { ...editingVariant.options }
    delete newOptions[key]
    setEditingVariant({ ...editingVariant, options: newOptions })
  }

  const hasEditingVariantChanges = useMemo(() => {
    if (!editingVariant) return false
    if (isAddingVariant) return true
    return JSON.stringify(editingVariant) !== JSON.stringify(originalVariant) || newOptionKey.trim() !== "" || newOptionValue.trim() !== ""
  }, [editingVariant, originalVariant, isAddingVariant, newOptionKey, newOptionValue])

  // Split images for layout
  const primaryImage = localImages.find(img => img.is_primary)
  const otherImages = localImages.filter(img => !img.is_primary)

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-12">
              {/* General Information */}
              <FieldSet>
                <FieldLegend>General Information</FieldLegend>
                <FieldGroup>
                  <Field data-invalid={form.formState.errors.name ? true : undefined}>
                    <FieldLabel htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Product Name *</FieldLabel>
                    <FormControl>
                      <Input id="name" placeholder="e.g. Premium Cotton T-Shirt" {...form.register("name")} className="h-10" />
                    </FormControl>
                    <FormMessage />
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field data-invalid={form.formState.errors.category_id ? true : undefined}>
                      <FieldLabel htmlFor="category_id" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category *</FieldLabel>
                      <Select 
                        onValueChange={(val) => form.setValue("category_id", val, { shouldDirty: true })} 
                        value={form.watch("category_id")}
                      >
                        <FormControl>
                          <SelectTrigger id="category_id" className="h-10">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {flatCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className={cn(
                                "flex items-center gap-2",
                                cat.level === 0 && "pl-0",
                                cat.level === 1 && "pl-4",
                                cat.level === 2 && "pl-8",
                                cat.level === 3 && "pl-12",
                                cat.level > 3 && "pl-16"
                              )}>
                                {cat.hasChildren ? (
                                  <IconFolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <IconFolder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className="font-medium truncate">{cat.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </Field>

                    <Field data-invalid={form.formState.errors.sku ? true : undefined}>
                      <FieldLabel htmlFor="sku" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SKU (Stock Keeping Unit)</FieldLabel>
                      <FormControl>
                        <Input id="sku" placeholder="e.g. TS-PRM-COT-001" {...form.register("sku")} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </Field>
                  </div>

                  <Field data-invalid={form.formState.errors.short_description ? true : undefined}>
                    <FieldLabel htmlFor="short_description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Short Description</FieldLabel>
                    <FormControl>
                      <Textarea 
                        id="short_description" 
                        placeholder="A brief summary of the product for list views..." 
                        className="resize-none"
                        {...form.register("short_description")} 
                      />
                    </FormControl>
                    <FormDescription>Maximum 500 characters.</FormDescription>
                    <FormMessage />
                  </Field>

                  <Field data-invalid={form.formState.errors.description ? true : undefined}>
                    <FieldLabel htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Description</FieldLabel>
                    <FormControl>
                      <Textarea 
                        id="description" 
                        placeholder="Detailed product information, features, and specifications..." 
                        className="min-h-[150px]"
                        {...form.register("description")} 
                      />
                    </FormControl>
                    <FormMessage />
                  </Field>
                </FieldGroup>
              </FieldSet>

              {/* Product Media */}
              <FieldSet>
                <FieldLegend>Product Media</FieldLegend>
                <div className="w-full">
                  <div className="w-full">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <div className="space-y-4">
                        {/* Primary Image Display */}
                          <div className="w-full">
                            {primaryImage ? (
                              <PrimaryMediaDisplay
                                image={primaryImage}
                                onRemove={() => handleRemoveImage(primaryImage.id)}
                              />
                            ) : (
                              <div className="relative aspect-square md:aspect-[16/9] rounded-xl border-2 border-dashed border-muted-foreground/20 overflow-hidden bg-muted/30 flex flex-col items-center justify-center text-muted-foreground p-6 text-center w-full">
                                <IconUpload className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-sm font-medium">No primary image selected</p>
                                <p className="text-xs mt-1">Upload images and set one as primary</p>
                              </div>
                            )}
                          </div>

                          {/* Thumbnails and Dropzone */}
                          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                            <SortableContext items={otherImages.map(img => img.id)} strategy={rectSortingStrategy}>
                              {otherImages.map((image) => (
                                <SortableThumbnailItem
                                  key={image.id}
                                  image={image}
                                  onRemove={() => handleRemoveImage(image.id)}
                                  onSetPrimary={() => handleSetPrimary(image.id)}
                                />
                              ))}
                            </SortableContext>
                            
                            <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary">
                              {uploadingImages ? (
                                <IconLoader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <>
                                  <IconPlus className="h-5 w-5" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Add</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                                disabled={uploadingImages}
                              />
                            </label>
                          </div>
                        </div>
                      </DndContext>
                  </div>
                </div>
              </FieldSet>

              {/* Variants & Options */}
              <FieldSet>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <FieldLegend className="mb-1">Variants & Options</FieldLegend>
                    <p className="text-sm text-muted-foreground">Manage different versions of your product.</p>
                  </div>
                  <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
                    <Checkbox 
                      id="has_variants" 
                      checked={form.watch("has_variants")}
                      onCheckedChange={(val) => form.setValue("has_variants", val === true, { shouldDirty: true })}
                    />
                    <Label htmlFor="has_variants" className="text-sm font-semibold cursor-pointer">
                      Enable Variants
                    </Label>
                  </div>
                </div>

                {form.watch("has_variants") && (
                  <div className="space-y-6">
                    {/* Variant Form (Inline Card) */}
                    {(isAddingVariant || editingVariant) ? (
                      <Card className="border-2 border-primary/20 shadow-lg py-0">
                        <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between">
                          <CardTitle className="text-sm font-bold">
                            {isAddingVariant ? "Add New Variant" : `Edit Variant: ${editingVariant?.name}`}
                          </CardTitle>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelVariantEdit}>
                            <IconX className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field>
                              <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Variant Name *</FieldLabel>
                              <Input 
                                placeholder="e.g. Red - Small" 
                                value={editingVariant?.name || ""} 
                                onChange={(e) => setEditingVariant(prev => prev ? { ...prev, name: e.target.value } : null)}
                                className="h-10"
                              />
                            </Field>
                            <Field>
                              <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Variant SKU</FieldLabel>
                              <Input 
                                placeholder="e.g. TS-RED-SM" 
                                value={editingVariant?.sku || ""} 
                                onChange={(e) => setEditingVariant(prev => prev ? { ...prev, sku: e.target.value } : null)}
                                className="h-10 font-mono text-sm"
                              />
                            </Field>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Field>
                              <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Price ($)</FieldLabel>
                              <Input 
                                type="number" 
                                step="0.01"
                                value={editingVariant?.price || 0} 
                                onChange={(e) => setEditingVariant(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null)}
                                className="h-10"
                              />
                            </Field>
                            <Field>
                              <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sale Price ($)</FieldLabel>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="Optional"
                                value={editingVariant?.sale_price ?? ""} 
                                onChange={(e) => setEditingVariant(prev => prev ? { ...prev, sale_price: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                                className="h-10"
                              />
                            </Field>
                            <Field>
                              <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stock</FieldLabel>
                              <Input 
                                type="number" 
                                value={editingVariant?.stock || 0} 
                                onChange={(e) => setEditingVariant(prev => prev ? { ...prev, stock: parseInt(e.target.value) || 0 } : null)}
                                className="h-10"
                              />
                            </Field>
                            <Field>
                              <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Low Stock Alert</FieldLabel>
                              <Input 
                                type="number" 
                                placeholder="Optional"
                                value={editingVariant?.low_stock_threshold ?? ""} 
                                onChange={(e) => setEditingVariant(prev => prev ? { ...prev, low_stock_threshold: e.target.value ? parseInt(e.target.value) : undefined } : null)}
                                className="h-10"
                              />
                            </Field>
                          </div>

                          <div className="space-y-3 pt-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                              Variant Options (e.g. Color: Red)
                            </Label>
                            
                            <div className="flex gap-3">
                              <Input 
                                placeholder="Option (e.g. Color)" 
                                value={newOptionKey} 
                                onChange={(e) => setNewOptionKey(e.target.value)} 
                                className="h-9 text-sm" 
                              />
                              <Input 
                                placeholder="Value (e.g. Red)" 
                                value={newOptionValue} 
                                onChange={(e) => setNewOptionValue(e.target.value)} 
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVariantOption(); } }}
                                className="h-9 text-sm" 
                              />
                              <Button type="button" variant="outline" size="sm" onClick={addVariantOption} className="h-9 px-3">
                                <IconPlus className="h-4 w-4 mr-2" />
                                Add
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              {editingVariant && Object.entries(editingVariant.options).map(([k, v]) => (
                                <Badge key={k} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1.5 h-8">
                                  <span className="font-bold text-xs">{k}:</span>
                                  <span className="text-xs">{v}</span>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-destructive hover:text-white" onClick={() => removeVariantOption(k)}>
                                    <IconX className="h-3 w-3" />
                                  </Button>
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-6 border-t">
                            <div className="flex items-center space-x-3 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
                              <Label htmlFor="var-active-editing" className="text-[10px] font-bold uppercase tracking-widest text-primary cursor-pointer">Active Variant</Label>
                              <Checkbox 
                                id="var-active-editing" 
                                checked={editingVariant?.is_active ?? true} 
                                onCheckedChange={(val) => setEditingVariant(prev => prev ? { ...prev, is_active: val === true } : null)}
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <Button type="button" variant="ghost" onClick={cancelVariantEdit}>Cancel</Button>
                              <Button 
                                type="button"
                                onClick={saveVariant}
                                disabled={!editingVariant?.name || !hasEditingVariantChanges}
                                className="shadow-lg shadow-primary/20"
                              >
                                <IconCheck className="h-4 w-4 mr-2" />
                                {isAddingVariant ? "Add Variant" : "Update Variant"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-hidden rounded-xl border border-muted-foreground/10">
                          <Table>
                            <TableHeader className="bg-muted/50">
                              <TableRow>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Variant Name</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest">SKU</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Price</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Stock</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
                                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {variants.length > 0 ? (
                                variants.map((v, idx) => (
                                  <TableRow key={idx} className="group hover:bg-muted/30">
                                    <TableCell>
                                      <div className="font-medium">{v.name}</div>
                                      {v.options && Object.keys(v.options).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {Object.entries(v.options).map(([k, val]) => (
                                            <Badge key={k} variant="secondary" className="text-[10px] px-1.5 h-4 font-normal">
                                              {k}: {val}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-xs">{v.sku || "—"}</TableCell>
                                    <TableCell className="font-medium">
                                      <div className="flex flex-col">
                                        <span className={cn(v.sale_price && "text-xs text-muted-foreground line-through")}>
                                          ${v.price.toFixed(2)}
                                        </span>
                                        {v.sale_price && (
                                          <span className="text-red-600 font-bold text-sm">
                                            ${v.sale_price.toFixed(2)}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={v.stock > 0 ? "outline" : "destructive"} className="font-normal">
                                        {v.stock} in stock
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {v.is_active ? (
                                        <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">Active</Badge>
                                      ) : (
                                        <Badge variant="secondary">Inactive</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => startEditVariant(v, idx)}>
                                          <IconEdit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeVariant(idx)}>
                                          <IconTrash className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No variants created yet.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                          {variants.length > 0 ? (
                            variants.map((v, idx) => (
                              <Card key={idx} className="overflow-hidden">
                                <div className="flex p-4 gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                      <h4 className="font-semibold truncate pr-2">{v.name}</h4>
                                      <div className="flex gap-1 flex-shrink-0">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditVariant(v, idx)}>
                                          <IconEdit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeVariant(idx)}>
                                          <IconTrash className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{v.sku || "NO SKU"}</div>
                                    <div className="flex flex-col mt-2">
                                      <span className={cn("font-bold text-sm", v.sale_price && "text-xs text-muted-foreground line-through")}>
                                        ${v.price.toFixed(2)}
                                      </span>
                                      {v.sale_price && (
                                        <span className="font-bold text-sm text-red-600">
                                          ${v.sale_price.toFixed(2)}
                                        </span>
                                      )}
                                      <Badge variant={v.stock > 0 ? "outline" : "destructive"} className="text-[10px] h-4 font-normal mt-1 w-fit">
                                        {v.stock} in stock
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            ))
                          ) : (
                            <div className="p-8 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                              No variants added.
                            </div>
                          )}
                        </div>

                        <Button type="button" variant="outline" className="w-full h-12 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all" onClick={startAddVariant}>
                          <IconPlus className="h-4 w-4 mr-2" />
                          Create New Variant
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </FieldSet>

              {/* Product Attributes */}
              {selectedCategoryId && (
                <FieldSet>
                  <FieldLegend>Product Attributes</FieldLegend>
                  <div className="space-y-6">
                    {isAttributesLoading ? (
                      <LoadingState variant="centered" text="Retrieving category attributes..." />
                    ) : categoryAttributes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-6 rounded-xl border border-dashed border-muted-foreground/20">
                        {categoryAttributes.map((attr) => {
                          const fieldIndex = attributeFields.findIndex(f => f.attribute_id === attr.id)
                          const currentValue = fieldIndex !== -1 ? form.watch(`attribute_values.${fieldIndex}.value`) : ""
                          
                          return (
                            <Field key={attr.id}>
                              <FieldLabel htmlFor={`attr-${attr.id}`} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {attr.name}{attr.is_required && " *"}
                              </FieldLabel>
                              <FormControl>
                                {attr.type === "SELECT" && attr.options ? (
                                  <Select 
                                    onValueChange={(val) => {
                                      const idx = attributeFields.findIndex(f => f.attribute_id === attr.id)
                                      if (idx === -1) {
                                        appendAttribute({ attribute_id: attr.id, value: val })
                                      } else {
                                        form.setValue(`attribute_values.${idx}.value`, val, { shouldDirty: true })
                                      }
                                    }}
                                    value={currentValue}
                                  >
                                    <SelectTrigger id={`attr-${attr.id}`} className="h-10">
                                      <SelectValue placeholder={`Select ${attr.name.toLowerCase()}`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(attr.options as string[]).map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : attr.type === "BOOLEAN" ? (
                                  <div className="flex items-center space-x-2 h-10">
                                    <Checkbox 
                                      id={`attr-${attr.id}`}
                                      checked={currentValue === "true"}
                                      onCheckedChange={(val) => {
                                        const idx = attributeFields.findIndex(f => f.attribute_id === attr.id)
                                        if (idx === -1) {
                                          appendAttribute({ attribute_id: attr.id, value: val ? "true" : "false" })
                                        } else {
                                          form.setValue(`attribute_values.${idx}.value`, val ? "true" : "false", { shouldDirty: true })
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`attr-${attr.id}`} className="font-normal cursor-pointer text-sm">
                                      {currentValue === "true" ? attr.true_label || "Yes" : attr.false_label || "No"}
                                    </Label>
                                  </div>
                                ) : (
                                  <Input 
                                    id={`attr-${attr.id}`}
                                    type={attr.type === "NUMBER" ? "number" : "text"}
                                    placeholder={attr.placeholder || `Enter ${attr.name.toLowerCase()}...`}
                                    className="h-10"
                                    value={currentValue}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      const idx = attributeFields.findIndex(f => f.attribute_id === attr.id)
                                      if (idx === -1) {
                                        appendAttribute({ attribute_id: attr.id, value: val })
                                      } else {
                                        form.setValue(`attribute_values.${idx}.value`, val, { shouldDirty: true })
                                      }
                                    }}
                                  />
                                )}
                              </FormControl>
                              {attr.unit && <FieldDescription className="text-xs">Unit: {attr.unit}</FieldDescription>}
                            </Field>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 bg-muted/5 rounded-xl border border-dashed border-muted-foreground/10 text-muted-foreground">
                        <IconSettings className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">No specific attributes for this category.</p>
                      </div>
                    )}
                  </div>
                </FieldSet>
              )}
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-1 space-y-12">
              {/* Product Visibility */}
              <FieldSet className="p-6 rounded-xl border bg-muted/10">
                <FieldLegend className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Product Visibility</FieldLegend>
                <FieldGroup>
                  <Field data-invalid={form.formState.errors.status ? true : undefined}>
                    <FieldLabel htmlFor="status" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</FieldLabel>
                    <Select 
                      onValueChange={(val) => form.setValue("status", val as ProductStatus, { shouldDirty: true })} 
                      value={form.watch("status")}
                    >
                      <FormControl>
                        <SelectTrigger id="status" className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="DISABLED">Disabled</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </Field>

                  <div className="flex items-center justify-between mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Label htmlFor="is_featured" className="text-[10px] font-bold uppercase tracking-widest text-primary cursor-pointer">
                      Featured Product
                    </Label>
                    <Checkbox 
                      id="is_featured" 
                      checked={form.watch("is_featured")}
                      onCheckedChange={(val) => form.setValue("is_featured", val === true, { shouldDirty: true })}
                    />
                  </div>
                </FieldGroup>
              </FieldSet>

              {/* Pricing */}
              <FieldSet className="p-6 rounded-xl border bg-muted/10">
                <FieldLegend className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pricing</FieldLegend>
                <FieldGroup>
                  <Field data-invalid={form.formState.errors.base_price ? true : undefined}>
                    <FieldLabel htmlFor="base_price" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Base Price *</FieldLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input 
                          id="base_price" 
                          type="number" 
                          step="0.01" 
                          min="0"
                          className="pl-7 h-10"
                          {...form.register("base_price", { valueAsNumber: true })} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </Field>

                  <Field data-invalid={form.formState.errors.sale_price ? true : undefined}>
                    <FieldLabel htmlFor="sale_price" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sale Price</FieldLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input 
                          id="sale_price" 
                          type="number" 
                          step="0.01" 
                          min="0"
                          className="pl-7 h-10"
                          placeholder="Optional"
                          {...form.register("sale_price", { 
                            valueAsNumber: true,
                            setValueAs: (v) => v === "" ? undefined : parseFloat(v)
                          })} 
                        />
                      </div>
                    </FormControl>
                  </Field>

                  <Field data-invalid={form.formState.errors.cost_price ? true : undefined}>
                    <FieldLabel htmlFor="cost_price" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cost Price</FieldLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input 
                          id="cost_price" 
                          type="number" 
                          step="0.01" 
                          min="0"
                          className="pl-7 h-10"
                          placeholder="For profit calculations"
                          {...form.register("cost_price", { 
                            valueAsNumber: true,
                            setValueAs: (v) => v === "" ? undefined : parseFloat(v)
                          })} 
                        />
                      </div>
                    </FormControl>
                  </Field>
                </FieldGroup>
              </FieldSet>

              {/* Inventory */}
              <FieldSet className="p-6 rounded-xl border bg-muted/10">
                <FieldLegend className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">Inventory</FieldLegend>
                <FieldGroup>
                  <div className="flex items-center justify-between -mt-2 mb-2 p-3 rounded-lg bg-background/50 border border-dashed border-muted-foreground/20">
                    <Label htmlFor="track_inventory" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none cursor-pointer">Track Stock</Label>
                    <Checkbox 
                      id="track_inventory" 
                      checked={form.watch("track_inventory")}
                      onCheckedChange={(val) => form.setValue("track_inventory", val === true, { shouldDirty: true })}
                    />
                  </div>
                  
                  <div className="space-y-6">
                    <Field data-invalid={form.formState.errors.stock ? true : undefined}>
                      <FieldLabel htmlFor="stock" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Available Stock</FieldLabel>
                      <FormControl>
                        <Input id="stock" type="number" min="0" className="h-10" disabled={!form.watch("track_inventory")} {...form.register("stock", { valueAsNumber: true })} />
                      </FormControl>
                      <FormMessage />
                    </Field>
                    <Field data-invalid={form.formState.errors.low_stock_threshold ? true : undefined}>
                      <FieldLabel htmlFor="low_stock_threshold" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Low Stock Alert</FieldLabel>
                      <FormControl>
                        <Input id="low_stock_threshold" type="number" min="0" className="h-10" placeholder="Alert level" disabled={!form.watch("track_inventory")} {...form.register("low_stock_threshold", { valueAsNumber: true, setValueAs: (v) => v === "" ? undefined : parseInt(v) })} />
                      </FormControl>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>

              {/* Physical Properties */}
              <FieldSet className="p-6 rounded-xl border bg-muted/10">
                <FieldLegend className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Physical Properties</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="weight" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Weight (kg)</FieldLabel>
                    <FormControl>
                      <Input id="weight" type="number" step="0.01" min="0" placeholder="0.00" className="h-10" {...form.register("weight", { valueAsNumber: true, setValueAs: (v) => v === "" ? undefined : parseFloat(v) })} />
                    </FormControl>
                  </Field>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Dimensions (cm)</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <Field>
                        <FieldLabel htmlFor="length" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Length</FieldLabel>
                        <FormControl>
                          <Input id="length" type="number" step="0.1" min="0" className="h-9 text-sm" {...form.register("length", { valueAsNumber: true, setValueAs: (v) => v === "" ? undefined : parseFloat(v) })} />
                        </FormControl>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="width" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Width</FieldLabel>
                        <FormControl>
                          <Input id="width" type="number" step="0.1" min="0" className="h-9 text-sm" {...form.register("width", { valueAsNumber: true, setValueAs: (v) => v === "" ? undefined : parseFloat(v) })} />
                        </FormControl>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="height" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Height</FieldLabel>
                        <FormControl>
                          <Input id="height" type="number" step="0.1" min="0" className="h-9 text-sm" {...form.register("height", { valueAsNumber: true, setValueAs: (v) => v === "" ? undefined : parseFloat(v) })} />
                        </FormControl>
                      </Field>
                    </div>
                  </div>
                </FieldGroup>
              </FieldSet>

              {/* Search Optimization */}
              <FieldSet className="p-6 rounded-xl border bg-muted/10">
                <FieldLegend className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Search Optimization (SEO)</FieldLegend>
                <FieldGroup>
                  <Field data-invalid={form.formState.errors.meta_title ? true : undefined}>
                    <FieldLabel htmlFor="meta_title" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Meta Title</FieldLabel>
                    <FormControl>
                      <Input id="meta_title" placeholder="SEO optimized title" {...form.register("meta_title")} className="h-10" />
                    </FormControl>
                  </Field>
                  <Field data-invalid={form.formState.errors.meta_description ? true : undefined}>
                    <FieldLabel htmlFor="meta_description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Meta Description</FieldLabel>
                    <FormControl>
                      <Textarea id="meta_description" placeholder="Snippet for search engines..." className="h-24 resize-none" {...form.register("meta_description")} />
                    </FormControl>
                  </Field>
                  <div className="pt-4 mt-4 border-t border-muted-foreground/10 space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Search Preview</Label>
                    <div className="p-3 rounded-lg bg-white border shadow-sm space-y-1 text-left overflow-hidden">
                      <div className="text-blue-700 text-sm font-medium truncate">{form.watch("meta_title") || form.watch("name") || "Meta Title"}</div>
                      <div className="text-green-800 text-[10px] truncate">yourstore.com/products/{product?.slug || "product-url"}</div>
                      <div className="text-gray-600 text-[11px] line-clamp-2 leading-tight">{form.watch("meta_description") || form.watch("short_description") || "No description provided."}</div>
                    </div>
                  </div>
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
              hasChanges ? "translate-y-0 opacity-100 scale-100" : "translate-y-20 opacity-0 scale-95"
            )}>
              <div className="flex flex-col pr-8 border-r">
                <span className="text-sm font-bold flex items-center gap-2">
                  {isEditing ? "Unsaved Changes" : "New Product"}
                  <Badge variant="secondary" className="font-mono text-[10px] px-1.5 h-4">MODIFIED</Badge>
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">Review your modifications before applying.</span>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => { form.reset(); setLocalImages(product?.images?.map(img => ({ id: img.id, url: img.url, alt_text: img.alt_text || undefined, display_order: img.display_order, is_primary: img.is_primary })) || []); setVariants(product?.variants?.map(v => ({ id: v.id, name: v.name, sku: v.sku || "", price: v.price || 0, sale_price: v.sale_price || undefined, stock: v.stock, low_stock_threshold: v.low_stock_threshold || undefined, is_active: v.is_active, options: (v.options as Record<string, string>) || {}, isExisting: true })) || []); toast.info("Changes discarded"); }} className="h-10 px-6 font-semibold border-2">Discard</Button>
                <Button type="submit" className="h-10 px-8 font-bold shadow-lg shadow-primary/20" disabled={isLoading || !hasChanges}>{isLoading ? <><IconLoader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><IconCheck className="h-4 w-4 mr-2" />{isEditing ? "Update Product" : "Publish Product"}</>}</Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}

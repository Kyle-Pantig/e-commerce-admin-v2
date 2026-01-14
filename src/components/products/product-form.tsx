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
  IconInfoCircle,
  IconPhoto,
  IconBox,
  IconTags,
  IconCrop,
  IconWand,
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
import { ImageCropModal } from "@/components/shared"
import { DateTimePicker } from "@/components/ui/date-time-picker"

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
  croppedBlob?: Blob // Stores cropped image until form submission
  originalUrl?: string // Original URL before cropping (for cropping source)
  cropAspectRatio?: number // Last used aspect ratio for cropping (0 = Free)
  cropArea?: { x: number; y: number; width: number; height: number } // Last crop position (percentages)
}

interface LocalVariant {
  id?: string
  name: string
  sku: string
  price: number
  sale_price?: number
  cost_price?: number
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
  onCrop,
}: {
  image: LocalImage
  onRemove: () => void
  onCrop: () => void
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
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-9 w-9 bg-white hover:bg-white/90 text-black border-none shadow-lg"
            onClick={(e) => {
              e.stopPropagation()
              onCrop()
            }}
            title="Crop image"
          >
            <IconCrop className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-9 w-9 bg-red-500 hover:bg-red-600 text-white border-none shadow-lg"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            title="Remove image"
          >
            <IconTrash className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Sortable thumbnail item component
function SortableThumbnailItem({
  image,
  onRemove,
  onSetPrimary,
  onCrop,
}: {
  image: LocalImage
  onRemove: () => void
  onSetPrimary: () => void
  onCrop: () => void
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
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-7 w-7 bg-white hover:bg-white/90 text-black border-none shadow-lg"
            onClick={(e) => {
              e.stopPropagation()
              onCrop()
            }}
            title="Crop image"
          >
            <IconCrop className="h-4 w-4" />
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
            title="Remove image"
          >
            <IconTrash className="h-4 w-4" />
          </Button>
        </div>
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
  
  // State for image cropping
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageToCropId, setImageToCropId] = useState<string | null>(null)
  
  // Get the current image from localImages (ensures we always have latest version including cropped blob URL)
  const imageToCrop = imageToCropId ? localImages.find(img => img.id === imageToCropId) : null

  // Local state for variants
  const [variants, setVariants] = useState<LocalVariant[]>(() => {
    if (product?.variants) {
      return product.variants.map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku || "",
        price: v.price || 0,
        sale_price: v.sale_price || undefined,
        cost_price: v.cost_price || undefined,
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

  // State for variant generation
  const [variantOptions, setVariantOptions] = useState<Record<string, string[]>>(() => {
    // Initialize from existing variants if any
    if (product?.variants && product.variants.length > 0) {
      const options: Record<string, Set<string>> = {}
      product.variants.forEach(v => {
        if (v.options) {
          Object.entries(v.options as Record<string, string>).forEach(([key, value]) => {
            if (!options[key]) options[key] = new Set()
            options[key].add(value)
          })
        }
      })
      const result: Record<string, string[]> = {}
      Object.entries(options).forEach(([key, values]) => {
        result[key] = Array.from(values)
      })
      return result
    }
    return {}
  })
  const [newOptionTypeName, setNewOptionTypeName] = useState("")
  const [newOptionTypeValue, setNewOptionTypeValue] = useState("")
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<number>>(new Set())
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkEditField, setBulkEditField] = useState<"price" | "sale_price" | "stock" | "status">("price")
  const [bulkEditValue, setBulkEditValue] = useState("")
  const [stockAdjustMode, setStockAdjustMode] = useState<"add" | "subtract">("add")

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
      is_new: product?.is_new ?? true, // Default to true for new products
      new_until: product?.new_until || null,
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
        is_new: product.is_new ?? true,
        new_until: product.new_until || null,
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

  // Compare form values with original product values
  const formValuesChanged = useMemo(() => {
    // Don't check for changes until form is initialized
    if (!isInitialized && product) {
      return false
    }

    if (!product) {
      // For new products, check if any required fields are filled
      return !!(
        formValues.name ||
        formValues.description ||
        formValues.category_id ||
        formValues.base_price > 0 ||
        localImages.length > 0 ||
        variants.length > 0
      )
    }

    const currentValues = formValues
    const originalValues = {
      name: product.name || "",
      description: product.description || "",
      short_description: product.short_description || "",
      sku: product.sku || "",
      status: (product.status as ProductStatus) || "DRAFT",
      base_price: product.base_price || 0,
      sale_price: product.sale_price ?? undefined,
      cost_price: product.cost_price ?? undefined,
      category_id: product.category_id || "",
      stock: product.stock || 0,
      low_stock_threshold: product.low_stock_threshold ?? undefined,
      track_inventory: product.track_inventory ?? true,
      weight: product.weight ?? undefined,
      length: product.length ?? undefined,
      width: product.width ?? undefined,
      height: product.height ?? undefined,
      meta_title: product.meta_title || "",
      meta_description: product.meta_description || "",
      is_featured: product.is_featured || false,
      has_variants: product.has_variants || false,
      is_new: product.is_new ?? true,
      new_until: product.new_until || null,
      attribute_values: (product.attribute_values || []).map((av) => ({
        attribute_id: av.attribute_id,
        value: av.value,
      })),
    }

    // Normalize values for comparison (handle undefined/null/empty string differences)
    const normalize = (val: any) => {
      if (val === null || val === undefined || val === "") return undefined
      if (typeof val === "number") return val === 0 ? 0 : val // Preserve 0
      if (typeof val === "boolean") return val
      if (Array.isArray(val)) {
        if (val.length === 0) return undefined
        // For attribute_values array, sort by attribute_id for consistent comparison
        const sorted = [...val].sort((a, b) => {
          if (a.attribute_id && b.attribute_id) {
            return a.attribute_id.localeCompare(b.attribute_id)
          }
          return JSON.stringify(a).localeCompare(JSON.stringify(b))
        })
        return JSON.stringify(sorted)
      }
      const str = String(val).trim()
      return str === "" ? undefined : str
    }

    // Compare each field with proper type handling
    const compareField = (field: string, current: any, original: any): boolean => {
      
      // Handle numbers - compare as numbers, treating null/undefined/empty as undefined
      if (typeof original === "number" || typeof current === "number" || field === "base_price" || field === "sale_price" || field === "cost_price" || field === "stock" || field === "low_stock_threshold" || field === "weight" || field === "length" || field === "width" || field === "height") {
        const currNum = current === "" || current === null || current === undefined ? undefined : Number(current)
        const origNum = original === "" || original === null || original === undefined ? undefined : Number(original)
        if (currNum !== origNum && !(isNaN(currNum as number) && isNaN(origNum as number))) {
          return true
        }
        return false
      }
      
      // Handle booleans
      if (typeof original === "boolean" || typeof current === "boolean" || field === "is_featured" || field === "has_variants" || field === "track_inventory" || field === "is_new") {
        if (Boolean(current) !== Boolean(original)) {
          return true
        }
        return false
      }
      
      // Handle strings and other types
      return normalize(current) !== normalize(original)
    }

    const fields: Array<[string, any, any]> = [
      ["name", currentValues.name, originalValues.name],
      ["description", currentValues.description, originalValues.description],
      ["short_description", currentValues.short_description, originalValues.short_description],
      ["sku", currentValues.sku, originalValues.sku],
      ["status", currentValues.status, originalValues.status],
      ["base_price", currentValues.base_price, originalValues.base_price],
      ["sale_price", currentValues.sale_price, originalValues.sale_price],
      ["cost_price", currentValues.cost_price, originalValues.cost_price],
      ["category_id", currentValues.category_id, originalValues.category_id],
      ["stock", currentValues.stock, originalValues.stock],
      ["low_stock_threshold", currentValues.low_stock_threshold, originalValues.low_stock_threshold],
      ["track_inventory", currentValues.track_inventory, originalValues.track_inventory],
      ["weight", currentValues.weight, originalValues.weight],
      ["length", currentValues.length, originalValues.length],
      ["width", currentValues.width, originalValues.width],
      ["height", currentValues.height, originalValues.height],
      ["meta_title", currentValues.meta_title, originalValues.meta_title],
      ["meta_description", currentValues.meta_description, originalValues.meta_description],
      ["is_featured", currentValues.is_featured, originalValues.is_featured],
      ["has_variants", currentValues.has_variants, originalValues.has_variants],
      ["is_new", currentValues.is_new, originalValues.is_new],
      ["new_until", currentValues.new_until, originalValues.new_until],
    ]

    for (const [field, current, original] of fields) {
      if (compareField(field, current, original)) {
        return true
      }
    }

    // Compare attribute_values
    const currentAttrs = normalize(currentValues.attribute_values)
    const originalAttrs = normalize(originalValues.attribute_values)
    if (currentAttrs !== originalAttrs) {
      return true
    }

    return false
  }, [formValues, product, localImages.length, variants.length, isInitialized])

  const imagesChanged = useMemo(() => {
    // Don't check for changes until form is initialized
    if (!isInitialized && product) {
      return false
    }

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
  }, [localImages, product, isInitialized])

  const variantsChanged = useMemo(() => {
    // Don't check for changes until form is initialized
    if (!isInitialized && product) {
      return false
    }

    if (!product) return variants.length > 0
    
    const originalVariants = (product.variants || []).map(v => ({
      id: v.id,
      name: v.name,
      sku: v.sku || "",
      price: v.price || 0,
      sale_price: v.sale_price ?? null,
      cost_price: v.cost_price ?? null,
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
      cost_price: v.cost_price ?? null,
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
        cost_price: variant.cost_price,
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
  }, [variants, product, isInitialized])

  const hasChanges = formValuesChanged || imagesChanged || variantsChanged

  const handleFormSubmit = async (values: ProductFormData) => {
    // First, upload any cropped images that haven't been uploaded yet
    const updatedImages = await Promise.all(
      localImages.map(async (img) => {
        if (img.croppedBlob) {
          // Upload the cropped image
          try {
            const file = new File([img.croppedBlob], `cropped-${Date.now()}.jpg`, {
              type: "image/jpeg",
            })
            const result = await uploadApi.uploadImage(file, {
              folder: "products",
              bucket: "products",
              product_id: product?.id,
            })
            // Revoke the blob URL to free memory
            if (img.url.startsWith("blob:")) {
              URL.revokeObjectURL(img.url)
            }
            return {
              url: result.url,
              alt_text: img.alt_text,
              display_order: img.display_order,
              is_primary: img.is_primary,
            }
          } catch (error) {
            console.error("Failed to upload cropped image:", error)
            toast.error("Failed to upload cropped image")
            throw error
          }
        }
        return {
          url: img.url,
          alt_text: img.alt_text,
          display_order: img.display_order,
          is_primary: img.is_primary,
        }
      })
    )

    const finalData = {
      ...values,
      images: updatedImages,
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

  // Image cropping handlers
  const handleOpenCropModal = (imageId: string) => {
    setImageToCropId(imageId)
    setCropModalOpen(true)
  }

  const handleCloseCropModal = () => {
    setCropModalOpen(false)
    setImageToCropId(null)
  }

  const handleCropComplete = async (
    croppedBlob: Blob, 
    aspectRatio?: number,
    cropArea?: { x: number; y: number; width: number; height: number }
  ) => {
    if (!imageToCropId) return

    // Create a local blob URL for preview (no upload yet)
    const blobUrl = URL.createObjectURL(croppedBlob)

    // Update the local image with the cropped preview
    setLocalImages((prev) =>
      prev.map((img) =>
        img.id === imageToCropId
          ? {
              ...img,
              url: blobUrl, // Use blob URL for preview
              originalUrl: img.originalUrl || img.url, // Keep original URL (for re-cropping from source)
              croppedBlob: croppedBlob, // Store blob for later upload
              cropAspectRatio: aspectRatio, // Remember the aspect ratio used
              cropArea: cropArea, // Remember the crop position/size
              isNew: true, // Mark as modified
            }
          : img
      )
    )

    toast.success("Image cropped - click Save to apply changes")
  }

  // Variant handling
  const startAddVariant = () => {
    setEditingVariant({
      name: "",
      sku: "",
      price: form.getValues("base_price") || 0,
      cost_price: form.getValues("cost_price") || undefined,
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

  // Variant Generation Functions
  const addOptionType = () => {
    if (!newOptionTypeName.trim()) return
    const name = newOptionTypeName.trim()
    if (variantOptions[name]) return // Already exists
    setVariantOptions(prev => ({ ...prev, [name]: [] }))
    setNewOptionTypeName("")
  }

  const removeOptionType = (typeName: string) => {
    setVariantOptions(prev => {
      const newOptions = { ...prev }
      delete newOptions[typeName]
      return newOptions
    })
  }

  const addOptionValue = (typeName: string) => {
    if (!newOptionTypeValue.trim()) return
    const value = newOptionTypeValue.trim()
    if (variantOptions[typeName]?.includes(value)) return // Already exists
    setVariantOptions(prev => ({
      ...prev,
      [typeName]: [...(prev[typeName] || []), value]
    }))
    setNewOptionTypeValue("")
  }

  const removeOptionValue = (typeName: string, value: string) => {
    setVariantOptions(prev => ({
      ...prev,
      [typeName]: prev[typeName]?.filter(v => v !== value) || []
    }))
  }

  const generateVariants = () => {
    const optionTypes = Object.keys(variantOptions).filter(k => variantOptions[k].length > 0)
    if (optionTypes.length === 0) {
      toast.error("Please add at least one option type with values")
      return
    }

    // Generate all combinations
    const generateCombinations = (types: string[], index: number, current: Record<string, string>): Record<string, string>[] => {
      if (index === types.length) return [current]
      
      const typeName = types[index]
      const values = variantOptions[typeName]
      const results: Record<string, string>[] = []
      
      for (const value of values) {
        const newCurrent = { ...current, [typeName]: value }
        results.push(...generateCombinations(types, index + 1, newCurrent))
      }
      
      return results
    }

    const combinations = generateCombinations(optionTypes, 0, {})
    const basePrice = form.getValues("base_price") || 0
    const baseCostPrice = form.getValues("cost_price") || undefined
    const baseSku = form.getValues("sku") || ""

    // Create variants from combinations
    const newVariants: LocalVariant[] = combinations.map((options, idx) => {
      // Generate name from options (e.g., "Red - Large")
      const name = Object.values(options).join(" - ")
      // Generate SKU suffix from options
      const skuSuffix = Object.values(options).map(v => v.substring(0, 3).toUpperCase()).join("-")
      
      // Check if variant already exists
      const existingVariant = variants.find(v => {
        const vOptions = v.options || {}
        return Object.keys(options).every(k => vOptions[k] === options[k]) &&
               Object.keys(vOptions).every(k => options[k] === vOptions[k])
      })

      if (existingVariant) return existingVariant

      return {
        name,
        sku: baseSku ? `${baseSku}-${skuSuffix}` : skuSuffix,
        price: basePrice,
        cost_price: baseCostPrice,
        stock: 0,
        is_active: true,
        options
      }
    })

    setVariants(newVariants)
    toast.success(`Generated ${newVariants.length} variant${newVariants.length !== 1 ? "s" : ""}`)
  }

  // Bulk Variant Operations
  const toggleVariantSelection = (index: number) => {
    setSelectedVariantIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const selectAllVariants = () => {
    if (selectedVariantIds.size === variants.length) {
      setSelectedVariantIds(new Set())
    } else {
      setSelectedVariantIds(new Set(variants.map((_, i) => i)))
    }
  }

  const applyBulkEdit = () => {
    if (selectedVariantIds.size === 0) return

    setVariants(prev => prev.map((v, idx) => {
      if (!selectedVariantIds.has(idx)) return v

      switch (bulkEditField) {
        case "price":
          return { ...v, price: parseFloat(bulkEditValue) || v.price }
        case "sale_price":
          // Allow clearing sale price with 0 or empty
          const salePrice = parseFloat(bulkEditValue)
          return { ...v, sale_price: salePrice > 0 ? salePrice : undefined }
        case "stock":
          // Add or subtract based on mode
          const amount = Math.abs(parseInt(bulkEditValue) || 0)
          const adjustment = stockAdjustMode === "add" ? amount : -amount
          const newStock = Math.max(0, v.stock + adjustment)
          return { ...v, stock: newStock }
        case "status":
          return { ...v, is_active: bulkEditValue === "active" }
        default:
          return v
      }
    }))

    const action = bulkEditField === "stock" ? 
      (stockAdjustMode === "add" ? "Added stock to" : "Removed stock from") : "Updated"
    toast.success(`${action} ${selectedVariantIds.size} variant${selectedVariantIds.size !== 1 ? "s" : ""}`)
    setSelectedVariantIds(new Set())
    setBulkEditOpen(false)
    setBulkEditValue("")
  }

  const deleteSelectedVariants = () => {
    setVariants(prev => prev.filter((_, idx) => !selectedVariantIds.has(idx)))
    toast.success(`Deleted ${selectedVariantIds.size} variant${selectedVariantIds.size !== 1 ? "s" : ""}`)
    setSelectedVariantIds(new Set())
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
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconInfoCircle className="h-5 w-5 text-primary" />
                  </div>
                  <FieldLegend className="mb-0">General Information</FieldLegend>
                </div>
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
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconPhoto className="h-5 w-5 text-primary" />
                  </div>
                  <FieldLegend className="mb-0">Product Media</FieldLegend>
                </div>
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
                                onCrop={() => handleOpenCropModal(primaryImage.id)}
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
                                  onCrop={() => handleOpenCropModal(image.id)}
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
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconBox className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <FieldLegend className="mb-1">Variants & Options</FieldLegend>
                      <p className="text-sm text-muted-foreground">Manage different versions of your product.</p>
                    </div>
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
                    {/* Variant Generator */}
                    <Card className="border border-dashed border-primary/30 bg-primary/5">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <IconWand className="h-4 w-4 text-primary" />
                          Auto-Generate Variants
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">Define option types (e.g., Size, Color) and their values to automatically generate all variant combinations.</p>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-4">
                        {/* Option Types List */}
                        {Object.keys(variantOptions).length > 0 && (
                          <div className="space-y-3">
                            {Object.entries(variantOptions).map(([typeName, values]) => (
                              <div key={typeName} className="p-3 bg-background rounded-lg border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-semibold">{typeName}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeOptionType(typeName)}>
                                    <IconX className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {values.map(value => (
                                    <Badge key={value} variant="secondary" className="pl-2 pr-1 py-0.5 text-xs">
                                      {value}
                                      <button onClick={() => removeOptionValue(typeName, value)} className="ml-1 hover:text-destructive">
                                        <IconX className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder={`Add ${typeName} value...`}
                                    className="h-8 text-sm flex-1"
                                    value={newOptionTypeValue}
                                    onChange={(e) => setNewOptionTypeValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault()
                                        addOptionValue(typeName)
                                      }
                                    }}
                                    onFocus={() => setNewOptionTypeValue("")}
                                  />
                                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => addOptionValue(typeName)}>
                                    <IconPlus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add New Option Type */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="New option type (e.g., Size, Color)..."
                            className="h-9 text-sm"
                            value={newOptionTypeName}
                            onChange={(e) => setNewOptionTypeName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                addOptionType()
                              }
                            }}
                          />
                          <Button type="button" variant="outline" size="sm" className="h-9" onClick={addOptionType}>
                            <IconPlus className="h-4 w-4 mr-1" />
                            Add Type
                          </Button>
                        </div>

                        {/* Generate Button */}
                        {Object.keys(variantOptions).length > 0 && (
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                              {Object.values(variantOptions).reduce((acc, vals) => acc * (vals.length || 1), 1)} possible combinations
                            </span>
                            <Button type="button" onClick={generateVariants} className="h-9">
                              <IconWand className="h-4 w-4 mr-2" />
                              Generate Variants
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Bulk Actions Bar */}
                    {selectedVariantIds.size > 0 && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {selectedVariantIds.size} variant{selectedVariantIds.size !== 1 ? "s" : ""} selected
                          </span>
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedVariantIds(new Set())}>
                            Deselect All
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Select value={bulkEditField} onValueChange={(v) => setBulkEditField(v as typeof bulkEditField)}>
                            <SelectTrigger size="sm" className="w-full sm:w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="price">Price</SelectItem>
                              <SelectItem value="sale_price">Sale Price</SelectItem>
                              <SelectItem value="stock">Stock</SelectItem>
                              <SelectItem value="status">Status</SelectItem>
                            </SelectContent>
                          </Select>
                          {bulkEditField === "status" ? (
                            <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                              <SelectTrigger size="sm" className="w-full sm:w-[100px]">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : bulkEditField === "stock" ? (
                            <div className="flex items-center h-8">
                              <div className="flex h-full rounded-l-md border border-r-0 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => setStockAdjustMode("add")}
                                  className={cn(
                                    "h-full w-8 flex items-center justify-center text-sm font-bold transition-colors",
                                    stockAdjustMode === "add" 
                                      ? "bg-green-500 text-white" 
                                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                  )}
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStockAdjustMode("subtract")}
                                  className={cn(
                                    "h-full w-8 flex items-center justify-center text-sm font-bold transition-colors border-l",
                                    stockAdjustMode === "subtract" 
                                      ? "bg-red-500 text-white" 
                                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                  )}
                                >
                                  −
                                </button>
                              </div>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="w-[70px] sm:w-[80px] h-8 rounded-l-none border-l-0"
                                value={bulkEditValue}
                                onChange={(e) => setBulkEditValue(e.target.value)}
                              />
                            </div>
                          ) : (
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="w-full sm:w-[100px] h-8"
                              value={bulkEditValue}
                              onChange={(e) => setBulkEditValue(e.target.value)}
                            />
                          )}
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button type="button" size="sm" className="h-8 flex-1 sm:flex-initial" onClick={applyBulkEdit} disabled={!bulkEditValue}>
                              Apply
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-8 text-destructive hover:text-destructive" onClick={deleteSelectedVariants}>
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

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

                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <Field>
                              <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Price ($) *</FieldLabel>
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
                              <FieldLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cost Price ($)</FieldLabel>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="For profit calc"
                                value={editingVariant?.cost_price ?? ""}
                                onChange={(e) => setEditingVariant(prev => prev ? { ...prev, cost_price: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                                className="h-10"
                              />
                            </Field>
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
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
                            
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                              <Input 
                                placeholder="Option (e.g. Color)" 
                                value={newOptionKey} 
                                onChange={(e) => setNewOptionKey(e.target.value)} 
                                className="h-9 text-sm flex-1" 
                              />
                              <Input 
                                placeholder="Value (e.g. Red)" 
                                value={newOptionValue} 
                                onChange={(e) => setNewOptionValue(e.target.value)} 
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVariantOption(); } }}
                                className="h-9 text-sm flex-1" 
                              />
                              <Button type="button" variant="outline" size="sm" onClick={addVariantOption} className="h-9 px-3 w-full sm:w-auto">
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

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t">
                            <div className="flex items-center space-x-3 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
                              <Label htmlFor="var-active-editing" className="text-[10px] font-bold uppercase tracking-widest text-primary cursor-pointer">Active Variant</Label>
                              <Checkbox 
                                id="var-active-editing" 
                                checked={editingVariant?.is_active ?? true} 
                                onCheckedChange={(val) => setEditingVariant(prev => prev ? { ...prev, is_active: val === true } : null)}
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <Button type="button" variant="ghost" onClick={cancelVariantEdit} className="flex-1 sm:flex-initial">Cancel</Button>
                              <Button 
                                type="button"
                                onClick={saveVariant}
                                disabled={!editingVariant?.name || !hasEditingVariantChanges}
                                className="shadow-lg shadow-primary/20 flex-1 sm:flex-initial"
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
                                <TableHead className="w-10">
                                  <Checkbox 
                                    checked={variants.length > 0 && selectedVariantIds.size === variants.length}
                                    onCheckedChange={selectAllVariants}
                                  />
                                </TableHead>
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
                                  <TableRow key={idx} className={cn("group hover:bg-muted/30", selectedVariantIds.has(idx) && "bg-primary/5")}>
                                    <TableCell>
                                      <Checkbox 
                                        checked={selectedVariantIds.has(idx)}
                                        onCheckedChange={() => toggleVariantSelection(idx)}
                                      />
                                    </TableCell>
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
                                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                    No variants created yet. Use the generator above or add manually.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                          {/* Mobile Select All */}
                          {variants.length > 0 && (
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  checked={variants.length > 0 && selectedVariantIds.size === variants.length}
                                  onCheckedChange={selectAllVariants}
                                />
                                <span className="text-sm text-muted-foreground">Select All</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{variants.length} variant{variants.length !== 1 ? "s" : ""}</span>
                            </div>
                          )}
                          {variants.length > 0 ? (
                            variants.map((v, idx) => (
                              <Card key={idx} className={cn("overflow-hidden", selectedVariantIds.has(idx) && "ring-2 ring-primary")}>
                                <div className="flex p-3 gap-3">
                                  <div className="flex items-start pt-0.5">
                                    <Checkbox 
                                      checked={selectedVariantIds.has(idx)}
                                      onCheckedChange={() => toggleVariantSelection(idx)}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <h4 className="font-semibold text-sm truncate">{v.name}</h4>
                                        <div className="text-[10px] text-muted-foreground font-mono">{v.sku || "NO SKU"}</div>
                                      </div>
                                      <div className="flex gap-1 flex-shrink-0">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditVariant(v, idx)}>
                                          <IconEdit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeVariant(idx)}>
                                          <IconTrash className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {/* Options badges */}
                                    {v.options && Object.keys(v.options).length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {Object.entries(v.options).map(([k, val]) => (
                                          <Badge key={k} variant="secondary" className="text-[10px] px-1.5 h-5 font-normal">
                                            {k}: {val}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Price & Stock row */}
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                                      <div className="flex items-baseline gap-2">
                                        <span className={cn("font-bold", v.sale_price && "text-xs text-muted-foreground line-through")}>
                                          ${v.price.toFixed(2)}
                                        </span>
                                        {v.sale_price && (
                                          <span className="font-bold text-red-600">
                                            ${v.sale_price.toFixed(2)}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={v.stock > 0 ? "outline" : "destructive"} className="text-[10px] h-5 font-normal">
                                          {v.stock} in stock
                                        </Badge>
                                        {v.is_active ? (
                                          <Badge variant="default" className="bg-green-500/10 text-green-600 text-[10px] h-5">Active</Badge>
                                        ) : (
                                          <Badge variant="secondary" className="text-[10px] h-5">Inactive</Badge>
                                        )}
                                      </div>
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
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconTags className="h-5 w-5 text-primary" />
                    </div>
                    <FieldLegend className="mb-0">Product Attributes</FieldLegend>
                  </div>
                  <div className="space-y-6">
                    {isAttributesLoading ? (
                      <LoadingState variant="centered" text="Retrieving category attributes..." />
                    ) : categoryAttributes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-6 rounded-xl border border-dashed border-muted-foreground/20">
                        {categoryAttributes.map((attr) => {
                          // Get current value from form values directly
                          const allAttributeValues = form.watch("attribute_values") || []
                          const existingValue = allAttributeValues.find((av: any) => av.attribute_id === attr.id)
                          const currentValue = existingValue?.value || ""
                          const fieldIndex = attributeFields.findIndex(f => f.attribute_id === attr.id)
                          
                          return (
                            <Field key={attr.id}>
                              <FieldLabel htmlFor={`attr-${attr.id}`} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {attr.name}{attr.is_required && " *"}
                              </FieldLabel>
                              <FormControl>
                                {attr.type === "SELECT" && attr.options ? (
                                  <Select 
                                    onValueChange={(val) => {
                                      const allValues = form.getValues("attribute_values") || []
                                      const idx = allValues.findIndex((av: any) => av.attribute_id === attr.id)
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
                                        const allValues = form.getValues("attribute_values") || []
                                        const idx = allValues.findIndex((av: any) => av.attribute_id === attr.id)
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
                                      const allValues = form.getValues("attribute_values") || []
                                      const idx = allValues.findIndex((av: any) => av.attribute_id === attr.id)
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
              <FieldSet className="p-6 border border-border/50 rounded-2xl">
                <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Product Visibility</FieldLegend>
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

                  <div className="mt-4 p-3 rounded-lg bg-green-500/5 border border-green-500/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_new" className="text-[10px] font-bold uppercase tracking-widest text-green-600 cursor-pointer">
                        New Product
                      </Label>
                      <Checkbox 
                        id="is_new" 
                        checked={form.watch("is_new")}
                        onCheckedChange={(val) => form.setValue("is_new", val === true, { shouldDirty: true })}
                      />
                    </div>
                    {form.watch("is_new") && (
                      <div className="pt-2 border-t border-green-500/10 space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          New Until (Optional)
                        </Label>
                        <DateTimePicker
                          dateLabel="Expiry Date"
                          timeLabel="Expiry Time"
                          value={form.watch("new_until") ? new Date(form.watch("new_until")!) : null}
                          onChange={(date) => form.setValue("new_until", date ? date.toISOString() : null, { shouldDirty: true })}
                          placeholder="Select date"
                          minDate={new Date()}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Auto-expire the &quot;New&quot; badge after this date
                        </p>
                      </div>
                    )}
                  </div>
                </FieldGroup>
              </FieldSet>

              {/* Pricing */}
              <FieldSet className="p-6 border border-border/50 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-0">Pricing</FieldLegend>
                  {variants.length > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      Managed by variants
                    </Badge>
                  )}
                </div>
                {variants.length > 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/20">
                      <p className="text-sm text-muted-foreground">
                        This product has variants. Pricing is managed individually for each variant.
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Price Range</p>
                          <p className="text-sm font-medium mt-1">
                            {variants.length > 0 ? (
                              <>
                                ${Math.min(...variants.map(v => v.sale_price ?? v.price)).toFixed(2)} - ${Math.max(...variants.map(v => v.price)).toFixed(2)}
                              </>
                            ) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">On Sale</p>
                          <p className="text-sm font-medium mt-1">
                            {variants.filter(v => v.sale_price).length} of {variants.length}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">With Cost</p>
                          <p className="text-sm font-medium mt-1">
                            {variants.filter(v => v.cost_price).length} of {variants.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
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
                )}
              </FieldSet>

              {/* Inventory */}
              <FieldSet className="p-6 border border-border/50 rounded-2xl">
                <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Inventory</FieldLegend>
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
                      <div className="flex items-center gap-2 mb-1.5">
                        <FieldLabel htmlFor="stock" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0">Available Stock</FieldLabel>
                        {variants.length > 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            Auto-calculated
                          </Badge>
                        )}
                      </div>
                      {variants.length > 0 ? (
                        // Product has variants - show calculated stock (read-only)
                        <div className="space-y-2">
                          <Input 
                            id="stock" 
                            type="number" 
                            className="h-10 bg-muted/50" 
                            value={variants.reduce((sum, v) => sum + (v.stock || 0), 0)}
                            disabled
                            readOnly
                          />
                          <p className="text-xs text-muted-foreground">
                            Total stock from {variants.length} variant{variants.length > 1 ? 's' : ''}. Edit individual variant stock in the Variants section.
                          </p>
                        </div>
                      ) : (
                        // No variants - allow manual stock input
                        <FormControl>
                          <Input id="stock" type="number" min="0" className="h-10" disabled={!form.watch("track_inventory")} {...form.register("stock", { valueAsNumber: true })} />
                        </FormControl>
                      )}
                      <FormMessage />
                    </Field>
                    <Field data-invalid={form.formState.errors.low_stock_threshold ? true : undefined}>
                      <FieldLabel htmlFor="low_stock_threshold" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Low Stock Alert</FieldLabel>
                      <FormControl>
                        <Input id="low_stock_threshold" type="number" min="0" className="h-10" placeholder="Alert level" disabled={!form.watch("track_inventory") || variants.length > 0} {...form.register("low_stock_threshold", { valueAsNumber: true, setValueAs: (v) => v === "" ? undefined : parseInt(v) })} />
                      </FormControl>
                      {variants.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Low stock alerts are managed per variant.
                        </p>
                      )}
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>

              {/* Physical Properties */}
              <FieldSet className="p-6 border border-border/50 rounded-2xl">
                <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Physical Properties</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="weight" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Weight (kg)</FieldLabel>
                    <FormControl>
                      <Input id="weight" type="number" step="0.01" min="0" placeholder="0.00" className="h-10" {...form.register("weight", { 
                        setValueAs: (v) => {
                          if (v === "" || v === null || v === undefined || v === "0" || v === 0) return undefined
                          const num = typeof v === "number" ? v : parseFloat(String(v))
                          return isNaN(num) || num <= 0 ? undefined : num
                        }
                      })} />
                    </FormControl>
                  </Field>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Dimensions (cm)</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <Field>
                        <FieldLabel htmlFor="length" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Length</FieldLabel>
                        <FormControl>
                          <Input id="length" type="number" step="0.1" min="0" className="h-9 text-sm" {...form.register("length", { 
                            setValueAs: (v) => {
                              if (v === "" || v === null || v === undefined || v === "0" || v === 0) return undefined
                              const num = typeof v === "number" ? v : parseFloat(String(v))
                              return isNaN(num) || num <= 0 ? undefined : num
                            }
                          })} />
                        </FormControl>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="width" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Width</FieldLabel>
                        <FormControl>
                          <Input id="width" type="number" step="0.1" min="0" className="h-9 text-sm" {...form.register("width", { 
                            setValueAs: (v) => {
                              if (v === "" || v === null || v === undefined || v === "0" || v === 0) return undefined
                              const num = typeof v === "number" ? v : parseFloat(String(v))
                              return isNaN(num) || num <= 0 ? undefined : num
                            }
                          })} />
                        </FormControl>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="height" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Height</FieldLabel>
                        <FormControl>
                          <Input id="height" type="number" step="0.1" min="0" className="h-9 text-sm" {...form.register("height", { 
                            setValueAs: (v) => {
                              if (v === "" || v === null || v === undefined || v === "0" || v === 0) return undefined
                              const num = typeof v === "number" ? v : parseFloat(String(v))
                              return isNaN(num) || num <= 0 ? undefined : num
                            }
                          })} />
                        </FormControl>
                      </Field>
                    </div>
                  </div>
                </FieldGroup>
              </FieldSet>

              {/* Search Optimization */}
              <FieldSet className="p-6 border border-border/50 rounded-2xl">
                <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Search Optimization (SEO)</FieldLegend>
                <FieldGroup>
                  <Field data-invalid={form.formState.errors.meta_title ? true : undefined}>
                    <FieldLabel htmlFor="meta_title" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Meta Title</FieldLabel>
                    <FormControl>
                      <div className="relative">
                        <Input id="meta_title" placeholder="SEO optimized title" {...form.register("meta_title")} className="h-10 pr-16" />
                        <span className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono",
                          (form.watch("meta_title")?.length || 0) > 60 ? "text-destructive" : 
                          (form.watch("meta_title")?.length || 0) >= 50 ? "text-green-600" : "text-muted-foreground"
                        )}>
                          {form.watch("meta_title")?.length || 0}/60
                        </span>
                      </div>
                    </FormControl>
                  </Field>
                  <Field data-invalid={form.formState.errors.meta_description ? true : undefined}>
                    <FieldLabel htmlFor="meta_description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Meta Description</FieldLabel>
                    <FormControl>
                      <div className="relative">
                        <Textarea id="meta_description" placeholder="Snippet for search engines..." className="h-24 resize-none pr-16" {...form.register("meta_description")} />
                        <span className={cn(
                          "absolute right-3 bottom-3 text-[10px] font-mono",
                          (form.watch("meta_description")?.length || 0) > 160 ? "text-destructive" : 
                          (form.watch("meta_description")?.length || 0) >= 150 ? "text-green-600" : "text-muted-foreground"
                        )}>
                          {form.watch("meta_description")?.length || 0}/160
                        </span>
                      </div>
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
                <Button type="button" variant="outline" onClick={() => { form.reset(); setLocalImages(product?.images?.map(img => ({ id: img.id, url: img.url, alt_text: img.alt_text || undefined, display_order: img.display_order, is_primary: img.is_primary })) || []); setVariants(product?.variants?.map(v => ({ id: v.id, name: v.name, sku: v.sku || "", price: v.price || 0, sale_price: v.sale_price || undefined, cost_price: v.cost_price || undefined, stock: v.stock, low_stock_threshold: v.low_stock_threshold || undefined, is_active: v.is_active, options: (v.options as Record<string, string>) || {}, isExisting: true })) || []); toast.info("Changes discarded"); }} className="h-10 px-6 font-semibold border-2">Discard</Button>
                <Button type="submit" className="h-10 px-8 font-bold shadow-lg shadow-primary/20" disabled={isLoading || !hasChanges}>{isLoading ? <><IconLoader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><IconCheck className="h-4 w-4 mr-2" />{isEditing ? "Update Product" : "Publish Product"}</>}</Button>
              </div>
            </div>
          </div>
        </form>
      </Form>

      {/* Image Crop Modal */}
      {imageToCrop && (
        <ImageCropModal
          key={imageToCrop.id} // Re-mount when image changes
          open={cropModalOpen}
          onClose={handleCloseCropModal}
          imageSrc={imageToCrop.originalUrl || imageToCrop.url} // Use original for re-cropping
          previewSrc={imageToCrop.croppedBlob ? imageToCrop.url : undefined} // Show current crop preview
          onCropComplete={handleCropComplete}
          aspectRatio={imageToCrop.cropAspectRatio} // Use stored aspect ratio (0 = Free, undefined = default 1:1)
          initialCrop={imageToCrop.cropArea} // Restore previous crop position/size
          title="Crop Product Image"
        />
      )}
    </div>
  )
}

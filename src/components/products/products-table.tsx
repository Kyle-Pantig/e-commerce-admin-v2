"use client"

import { useState, useMemo, useEffect, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DeleteConfirmDialog, Pagination } from "@/components/shared"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconDots,
  IconEdit,
  IconTrash,
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
  IconEye,
  IconStar,
  IconStarFilled,
  IconPackage,
  IconSearch,
  IconX,
  IconLoader2,
} from "@tabler/icons-react"
import Image from "next/image"
import { cn, formatPrice, formatDiscountBadge } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"

// Import shared API services and types
import { productsApi, type ProductListResponse } from "@/lib/api/services/products"
import { categoriesApi } from "@/lib/api/services/categories"
import { discountsApi, type DiscountCode } from "@/lib/api/services/discounts"
import type { ProductListItem, Category, ProductStatus } from "@/lib/api/types"

// Helper to check if product or its variants has an applicable discount
function getProductDiscountInfo(
  product: ProductListItem,
  autoApplyDiscounts: DiscountCode[]
): DiscountCode | null {
  for (const discount of autoApplyDiscounts) {
    const hasProductRestriction = discount.applicable_products && discount.applicable_products.length > 0
    const hasVariantRestriction = discount.applicable_variants && discount.applicable_variants.length > 0
    
    if (hasProductRestriction || hasVariantRestriction) {
      // Check product level first
      if (hasProductRestriction && discount.applicable_products?.includes(product.id)) {
        return discount
      }
      // Check if any variant of this product is included
      if (hasVariantRestriction && product.variants) {
        const hasMatchingVariant = product.variants.some(v => 
          discount.applicable_variants?.includes(v.id)
        )
        if (hasMatchingVariant) {
          return discount
        }
      }
      continue
    }
    
    // No restrictions - applies to all
    return discount
  }
  return null
}

interface ProductsTableProps {
  currentUserRole?: string
  canEdit?: boolean
}

export function ProductsTable({ currentUserRole, canEdit = true }: ProductsTableProps) {
  const isAdmin = currentUserRole?.toUpperCase() === "ADMIN"
  const hasEditPermission = isAdmin || canEdit
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const { state: sidebarState } = useSidebar()
  const isMobile = useIsMobile()
  
  // UI State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<ProductStatus>("ACTIVE")
  const [duplicatingProductId, setDuplicatingProductId] = useState<string | null>(null)
  
  // Filter State - Initialize from URL params
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page")
    return pageParam ? parseInt(pageParam, 10) : 1
  })
  const [perPage] = useState(20)
  const [search, setSearch] = useState(() => searchParams.get("search") || "")
  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") || "")
  // Store category slug in URL, but use ID for API calls
  const [categorySlug, setCategorySlug] = useState<string>(() => searchParams.get("category") || "")
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get("status") || "")

  // React Query: Fetch categories (for filters) using shared API service - needed early for categoryFilter
  const {
    data: categories = [],
  } = useQuery<Category[], Error>({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list({ include_inactive: true }),
    retry: 1,
  })

  // Flatten categories for filter dropdown (include slug for URL)
  const flatCategories = useMemo(() => {
    const result: { id: string; slug: string; name: string; level: number }[] = []
    const processCategory = (cat: Category, level: number = 0) => {
      result.push({ id: cat.id, slug: cat.slug, name: cat.name, level })
      if (cat.children) {
        cat.children.forEach((child: Category) => processCategory(child, level + 1))
      }
    }
    categories.forEach((cat: Category) => processCategory(cat))
    return result
  }, [categories])

  // Convert category slug to ID for API calls
  const categoryFilter = useMemo(() => {
    if (!categorySlug) return ""
    const category = flatCategories.find((cat) => cat.slug === categorySlug)
    return category?.id || ""
  }, [categorySlug, flatCategories])

  // Update URL immediately when filters change (using window.history for instant updates)
  const updateURL = (updates: {
    page?: number
    search?: string
    category?: string
    status?: string
  }) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (updates.page !== undefined) {
      if (updates.page === 1) {
        params.delete("page")
      } else {
        params.set("page", updates.page.toString())
      }
    }
    
    if (updates.search !== undefined) {
      if (updates.search === "") {
        params.delete("search")
      } else {
        params.set("search", updates.search)
      }
    }
    
    if (updates.category !== undefined) {
      if (updates.category === "") {
        params.delete("category")
      } else {
        params.set("category", updates.category)
      }
    }
    
    if (updates.status !== undefined) {
      if (updates.status === "") {
        params.delete("status")
      } else {
        params.set("status", updates.status)
      }
    }
    
    const newURL = params.toString() ? `?${params.toString()}` : ""
    const fullPath = `/products${newURL}`
    
    // Update URL immediately using startTransition for instant feel
    startTransition(() => {
      router.replace(fullPath, { scroll: false })
    })
    
    // Also update browser history immediately for instant URL change
    if (typeof window !== "undefined") {
      const newState = { ...window.history.state }
      window.history.replaceState(newState, "", fullPath)
    }
  }

  // React Query: Fetch products using shared API service
  const {
    data: productsData,
    isLoading,
    error,
  } = useQuery<ProductListResponse, Error>({
    queryKey: ["products", page, perPage, search, categoryFilter, statusFilter, sorting],
    queryFn: () => productsApi.list({
      page,
      per_page: perPage,
      search: search || undefined,
      category_id: categoryFilter || undefined,
      status: (statusFilter as ProductStatus) || undefined,
      sort_by: sorting[0]?.id || "created_at",
      sort_order: sorting[0]?.desc ? "desc" : "asc",
      include_inactive: true,
    }),
    retry: 1,
  })

  // Fetch auto-apply discounts for discount badges
  const { data: autoApplyDiscounts = [] } = useQuery<DiscountCode[]>({
    queryKey: ["discounts", "auto-apply"],
    queryFn: () => discountsApi.getAutoApplyDiscounts(),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (productId: string) => productsApi.delete(productId),
    onSuccess: () => {
      toast.success("Product deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setDeleteDialogOpen(false)
      setSelectedProduct(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete product")
    },
  })

  // Bulk operations mutations
  const bulkStatusMutation = useMutation({
    mutationFn: ({ productIds, status }: { productIds: string[]; status: ProductStatus }) =>
      productsApi.bulkUpdateStatus(productIds, status),
    onSuccess: (response) => {
      toast.success(response.message || `Updated ${response.affected_count} products`)
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setBulkStatusDialogOpen(false)
      setSelectedProductIds(new Set())
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update products")
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (productIds: string[]) => productsApi.bulkDelete(productIds),
    onSuccess: (response) => {
      toast.success(response.message || `Deleted ${response.affected_count} products`)
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setBulkDeleteDialogOpen(false)
      setSelectedProductIds(new Set())
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete products")
    },
  })

  const handleEdit = (product: ProductListItem) => {
    router.push(`/products/${product.slug}/edit`)
  }

  const handleDelete = (product: ProductListItem) => {
    setSelectedProduct(product)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedProduct) {
      deleteMutation.mutate(selectedProduct.id)
    }
  }

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Fetch full product data
      const product = await productsApi.get(productId)
      
      // Create new product with duplicated data
      const duplicateData = {
        name: `${product.name} (Copy)`,
        description: product.description || "",
        short_description: product.short_description || "",
        sku: product.sku ? `${product.sku}-COPY` : "",
        status: "DRAFT" as ProductStatus,
        base_price: product.base_price,
        sale_price: product.sale_price,
        cost_price: product.cost_price,
        category_id: product.category_id,
        stock: product.stock,
        low_stock_threshold: product.low_stock_threshold,
        track_inventory: product.track_inventory,
        weight: product.weight,
        length: product.length,
        width: product.width,
        height: product.height,
        meta_title: product.meta_title || "",
        meta_description: product.meta_description || "",
        is_featured: false,
        has_variants: product.has_variants,
        images: product.images?.map(img => ({
          url: img.url,
          alt_text: img.alt_text,
          display_order: img.display_order,
          is_primary: img.is_primary,
        })) || [],
        variants: product.variants?.map(v => ({
          name: v.name,
          sku: v.sku ? `${v.sku}-COPY` : "",
          price: v.price,
          sale_price: v.sale_price,
          stock: v.stock,
          low_stock_threshold: v.low_stock_threshold,
          is_active: v.is_active,
          options: v.options || {},
          image_url: v.image_url || "",
        })) || [],
        attribute_values: product.attribute_values?.map(av => ({
          attribute_id: av.attribute_id,
          value: av.value,
        })) || [],
      }
      
      return productsApi.create(duplicateData)
    },
    onSuccess: (newProduct) => {
      setDuplicatingProductId(null)
      toast.success("Product duplicated successfully")
      queryClient.invalidateQueries({ queryKey: ["products"] })
      router.push(`/products/${newProduct.slug}/edit`)
    },
    onError: (error: Error) => {
      setDuplicatingProductId(null)
      toast.error(error.message || "Failed to duplicate product")
    },
  })

  const handleDuplicate = (product: ProductListItem) => {
    setDuplicatingProductId(product.id)
    duplicateMutation.mutate(product.id)
  }

  const handleSearch = () => {
    // Update URL immediately, then state
    updateURL({ search: searchInput, page: 1 })
    setSearch(searchInput)
    setPage(1)
  }

  const handleClearSearch = () => {
    setSearchInput("")
    setSearch("")
    setPage(1)
    updateURL({ search: "", page: 1 })
  }

  const handleCategoryFilterChange = (value: string) => {
    const categorySlug = value === "all" ? "" : value
    // Update URL immediately, then state
    updateURL({ category: categorySlug, page: 1 })
    setCategorySlug(categorySlug)
    setPage(1)
  }

  const handleStatusFilterChange = (value: string) => {
    const status = value === "all" ? "" : value
    // Update URL immediately, then state
    updateURL({ status, page: 1 })
    setStatusFilter(status)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    // Update URL immediately, then state
    updateURL({ page: newPage })
    setPage(newPage)
  }

  // Sync state with URL when it changes (e.g., browser back/forward)
  useEffect(() => {
    const urlPage = searchParams.get("page")
    const urlSearch = searchParams.get("search") || ""
    const urlCategorySlug = searchParams.get("category") || ""
    const urlStatus = searchParams.get("status") || ""

    const newPage = urlPage ? parseInt(urlPage, 10) : 1
    if (newPage !== page) {
      setPage(newPage)
    }
    if (urlSearch !== search) {
      setSearch(urlSearch)
      setSearchInput(urlSearch)
    }
    if (urlCategorySlug !== categorySlug) {
      setCategorySlug(urlCategorySlug)
    }
    if (urlStatus !== statusFilter) {
      setStatusFilter(urlStatus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]) // Only sync when URL params change externally

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "N/A"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default"
      case "DRAFT":
        return "secondary"
      case "DISABLED":
        return "outline"
      case "ARCHIVED":
        return "destructive"
      default:
        return "default"
    }
  }

  // Handle errors
  if (error) {
    if (error.message === "Not authenticated") {
      toast.error("Not authenticated")
      router.push("/login")
      return null
    }
  }

  // Toggle row selection
  const toggleRowSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const toggleAllSelection = () => {
    if (selectedProductIds.size === productsData?.items.length) {
      setSelectedProductIds(new Set())
    } else {
      setSelectedProductIds(new Set(productsData?.items.map((p) => p.id) || []))
    }
  }

  // Columns definition
  const columns: ColumnDef<ProductListItem>[] = useMemo(() => [
    // Only show checkbox column if user has edit permission
    ...(hasEditPermission ? [{
      id: "select",
      header: () => (
        <Checkbox
          checked={productsData?.items.length ? selectedProductIds.size === productsData.items.length : false}
          onCheckedChange={toggleAllSelection}
        />
      ),
      cell: ({ row }: { row: { original: ProductListItem } }) => (
        <Checkbox
          checked={selectedProductIds.has(row.original.id)}
          onCheckedChange={() => toggleRowSelection(row.original.id)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    }] : []),
    {
      accessorKey: "primary_image",
      header: "Image",
      cell: ({ row }) => (
        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted">
          {row.original.primary_image ? (
            <Image
              src={row.original.primary_image}
              alt={row.original.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <IconPackage className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8"
        >
          Name
          {column.getIsSorted() === "asc" ? (
            <IconArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <IconArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium flex items-center gap-1">
            {row.original.name}
            {row.original.is_featured && (
              <IconStarFilled className="h-4 w-4 text-yellow-500" />
            )}
          </div>
          {row.original.sku && (
            <div className="text-xs text-muted-foreground">SKU: {row.original.sku}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category_name",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.category_name || "N/A"}</Badge>
      ),
    },
    {
      accessorKey: "base_price",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8"
        >
          Price
          {column.getIsSorted() === "asc" ? (
            <IconArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <IconArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{formatPrice(row.original.base_price)}</div>
          {row.original.sale_price && (
            <div className="text-xs text-green-600">
              Sale: {formatPrice(row.original.sale_price)}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "discount",
      header: "Discount",
      cell: ({ row }) => {
        const discount = getProductDiscountInfo(row.original, autoApplyDiscounts)
        if (!discount) return <span className="text-muted-foreground text-xs">-</span>
        
        return (
          <Badge variant="destructive" className="text-xs whitespace-nowrap">
            {formatDiscountBadge(discount.discount_value, discount.discount_type as "PERCENTAGE" | "FIXED_AMOUNT")}
          </Badge>
        )
      },
    },
    {
      accessorKey: "stock",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8"
        >
          Stock
          {column.getIsSorted() === "asc" ? (
            <IconArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <IconArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original
        const hasVariants = product.has_variants
        
        // Calculate stock: sum of variant stocks if has_variants, otherwise main stock
        let stock = product.stock
        let variantCount = 0
        
        if (hasVariants && product.variants && product.variants.length > 0) {
          stock = product.variants.reduce((sum: number, v: { stock: number }) => sum + (v.stock || 0), 0)
          variantCount = product.variants.length
        }
        
        const lowThreshold = 10 // Default low stock threshold
        const isLow = stock <= lowThreshold && stock > 0
        const isOut = stock === 0
        
        return (
          <div className="flex flex-col gap-1">
            <Badge
              variant={isOut ? "destructive" : isLow ? "outline" : "secondary"}
              className={isLow ? "border-yellow-500 text-yellow-600" : ""}
            >
              {isOut ? "Out of Stock" : `${stock} in stock`}
            </Badge>
            {hasVariants && variantCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {variantCount} variant{variantCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getStatusColor(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8"
        >
          Created
          {column.getIsSorted() === "asc" ? (
            <IconArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <IconArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-muted-foreground text-sm">
          {formatDate(row.original.created_at)}
        </div>
      ),
    },
    ...(hasEditPermission
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: ({ row }: { row: { original: ProductListItem } }) => {
              const product = row.original
              const isActionLoading = deleteMutation.isPending
              const isDuplicating = duplicatingProductId === product.id

              // Show spinner when duplicating this specific product
              if (isDuplicating) {
                return (
                  <Button variant="ghost" size="icon" disabled>
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                  </Button>
                )
              }

              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isActionLoading}>
                      <IconDots className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {hasEditPermission && (
                      <DropdownMenuItem onClick={() => handleEdit(product)}>
                        <IconEdit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => window.open(`/products/${product.slug}`, "_blank")}>
                      <IconEye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    {hasEditPermission && (
                      <>
                        <DropdownMenuItem
                          onClick={() => handleDuplicate(product)}
                          disabled={duplicateMutation.isPending}
                        >
                          <IconPlus className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(product)}
                          className="text-destructive"
                        >
                          <IconTrash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            },
          },
        ]
      : []),
  ], [isAdmin, hasEditPermission, deleteMutation.isPending, duplicatingProductId, selectedProductIds, productsData?.items])

  // Initialize table
  const table = useReactTable({
    data: productsData?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    manualSorting: true,
  })

  // Loading state
  if (isLoading && !productsData) {
    return (
      <div className="px-4 lg:px-6 space-y-4">
        {/* Filters Skeleton - Match actual layout */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <div className="relative max-w-sm w-full">
              <Skeleton className="h-9 w-full rounded-md border" />
            </div>
            <Skeleton className="h-9 w-9 rounded-md border" />
          </div>
          <Skeleton className="h-9 w-[180px] rounded-md border" />
          <Skeleton className="h-9 w-[140px] rounded-md border" />
          {hasEditPermission && <Skeleton className="h-9 w-[140px] rounded-md border" />}
        </div>
        
        {/* Table Skeleton */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                {hasEditPermission && <TableHead className="w-[80px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-12 w-12 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  {hasEditPermission && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6 space-y-4">

      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Search Row */}
        <div className="relative flex-1 flex">
          <Input
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="rounded-r-none border-r-0 pr-8 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border focus:outline-none shadow-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
              aria-label="Clear search"
            >
              <IconX className="h-4 w-4" />
            </button>
          )}
          <Button variant="outline" onClick={handleSearch} className="rounded-l-none border-l cursor-pointer hover:bg-transparent! shadow-none">
            <IconSearch className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
            <Select value={categorySlug || "all"} onValueChange={handleCategoryFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {flatCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug}>
                    {"  ".repeat(cat.level)}{cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter || "all"} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {hasEditPermission && (
            <Button onClick={() => router.push("/products/new")} className="w-full sm:w-auto sm:ml-auto">
              <IconPlus className="mr-2 h-4 w-4" />
              Create Product
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <ScrollArea className="w-full whitespace-nowrap">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={hasEditPermission ? 8 : 7}
                    className="text-center text-muted-foreground py-8"
                  >
                    <IconPackage className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No products found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Pagination */}
      {productsData && (
        <Pagination
          page={page}
          totalPages={productsData.total_pages}
          total={productsData.total}
          perPage={perPage}
          onPageChange={handlePageChange}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        itemName={selectedProduct?.name}
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
      />

      {/* Bulk Status Update Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Update status for {selectedProductIds.size} product{selectedProductIds.size !== 1 ? "s" : ""}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>New Status</Label>
            <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as ProductStatus)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                bulkStatusMutation.mutate({
                  productIds: Array.from(selectedProductIds),
                  status: bulkStatus,
                })
              }}
              disabled={bulkStatusMutation.isPending}
            >
              {bulkStatusMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <DeleteConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Products"
        description={`Are you sure you want to delete ${selectedProductIds.size} product${selectedProductIds.size !== 1 ? "s" : ""}? This action cannot be undone.`}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedProductIds))}
        isDeleting={bulkDeleteMutation.isPending}
      />

      {/* Floating Bulk Actions Bar */}
      {/* Floating Action Bar - Only show for users with edit permission */}
      {hasEditPermission && (
        <div className={cn(
          "fixed bottom-6 z-50 transition-all duration-300 ease-in-out px-4 flex justify-center pointer-events-none",
          isMobile ? "w-full left-0" : sidebarState === "expanded" ? "w-[calc(100%-18rem)] left-72" : "w-[calc(100%-3rem)] left-12"
        )}>
          <div className={cn(
            "bg-background/95 backdrop-blur-md border shadow-2xl rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 pointer-events-auto transition-all transform duration-500",
            selectedProductIds.size > 0 ? "translate-y-0 opacity-100 scale-100" : "translate-y-20 opacity-0 scale-95 pointer-events-none"
          )}>
            <div className="flex items-center gap-3 sm:pr-6 sm:border-r">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {selectedProductIds.size}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">
                  Product{selectedProductIds.size !== 1 ? "s" : ""} Selected
                </span>
                <span className="text-xs text-muted-foreground hidden sm:block">Choose an action below</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkStatusDialogOpen(true)}
                disabled={bulkStatusMutation.isPending}
                className="h-9 whitespace-nowrap"
              >
                <IconEdit className="h-4 w-4 mr-2" />
                Update Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={bulkDeleteMutation.isPending}
                className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <IconTrash className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedProductIds.size === productsData?.items.length) {
                    setSelectedProductIds(new Set())
                  } else {
                    setSelectedProductIds(new Set(productsData?.items.map(p => p.id) || []))
                  }
                }}
                className="h-9 text-muted-foreground hover:text-foreground"
              >
                {selectedProductIds.size === productsData?.items.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


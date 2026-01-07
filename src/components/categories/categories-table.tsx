"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeleteConfirmDialog } from "@/components/shared"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { IconDots, IconEdit, IconTrash, IconPlus, IconArrowUp, IconArrowDown, IconArrowsSort, IconChevronRight, IconFolder, IconFolderOpen, IconPhoto } from "@tabler/icons-react"
import { CategoryDialog } from "./category-dialog"

// Import shared API services and types
import { categoriesApi, flattenCategories } from "@/lib/api/services/categories"
import type { Category, CategoryCreate, CategoryUpdate } from "@/lib/api/types"

interface CategoriesTableProps {
  currentUserRole?: string
  canEdit?: boolean
}

// Extended type with level for UI
type CategoryWithLevel = Category & { level?: number }

export function CategoriesTable({ currentUserRole, canEdit = true }: CategoriesTableProps) {
  const isAdmin = currentUserRole?.toUpperCase() === "ADMIN"
  const hasEditPermission = isAdmin || canEdit
  const router = useRouter()
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithLevel | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  // React Query: Fetch categories using shared API service
  const {
    data: categories = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list({ include_inactive: true }),
    retry: 1,
  })

  // React Query: Create category mutation
  const createMutation = useMutation({
    mutationFn: (data: CategoryCreate) => categoriesApi.create(data),
    onSuccess: () => {
      toast.success("Category created successfully")
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setCreateDialogOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create category")
    },
  })

  // React Query: Update category mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryUpdate }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      toast.success("Category updated successfully")
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setEditDialogOpen(false)
      setSelectedCategory(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update category")
    },
  })

  // React Query: Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => categoriesApi.delete(categoryId),
    onSuccess: () => {
      toast.success("Category deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setDeleteDialogOpen(false)
      setSelectedCategory(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete category")
    },
  })

  const handleEdit = (category: CategoryWithLevel) => {
    setSelectedCategory(category)
    setEditDialogOpen(true)
  }

  const handleDelete = (category: CategoryWithLevel) => {
    setSelectedCategory(category)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedCategory) {
      deleteMutation.mutate(selectedCategory.id)
    }
  }

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

  // Memoize flattened categories using shared utility function
  const flatCategoriesData = useMemo(() => {
    return flattenCategories(categories)
  }, [categories])

  // Handle errors
  if (error) {
    if (error.message === "Not authenticated") {
      toast.error("Not authenticated")
      router.push("/login")
      return null
    }
  }

  // Memoize columns to avoid recreating on every render
  const columns: ColumnDef<CategoryWithLevel>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 data-[state=open]:bg-accent"
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
        )
      },
      cell: ({ row }) => {
        const level = row.original.level || 0
        const hasChildren = row.original.children && row.original.children.length > 0
        const indentSize = level * 24 // 24px per level
        
        return (
          <div className="flex items-center gap-2 font-medium" style={{ paddingLeft: `${indentSize}px` }}>
            {level > 0 && (
              <IconChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            {hasChildren ? (
              <IconFolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <IconFolder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span>{row.original.name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "image",
      header: "Image",
      cell: ({ row }) => {
        const imageUrl = row.original.image
        return imageUrl ? (
          <div className="w-12 h-12 rounded-md overflow-hidden border bg-muted">
            <img
              src={imageUrl}
              alt={row.original.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image on error
                e.currentTarget.style.display = "none"
              }}
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-md border bg-muted flex items-center justify-center">
            <IconPhoto className="h-5 w-5 text-muted-foreground" />
          </div>
        )
      },
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => (
        <div className="text-muted-foreground text-sm">{row.original.slug}</div>
      ),
    },
    {
      accessorKey: "display_order",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            Order
            {column.getIsSorted() === "asc" ? (
              <IconArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <IconArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <IconArrowsSort className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        )
      },
      cell: ({ row }) => row.original.display_order,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 data-[state=open]:bg-accent"
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
        )
      },
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {formatDate(row.original.created_at)}
        </div>
      ),
    },
    ...(isAdmin
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: ({ row }: { row: { original: CategoryWithLevel } }) => {
              const category = row.original
              const isActionLoading =
                updateMutation.isPending || deleteMutation.isPending

              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isActionLoading}>
                      <IconDots className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleEdit(category)}
                      disabled={isActionLoading}
                    >
                      <IconEdit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(category)}
                      disabled={isActionLoading}
                      className="text-destructive"
                    >
                      <IconTrash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            },
          },
        ]
      : []),
  ], [isAdmin, updateMutation.isPending, deleteMutation.isPending])

  // Initialize TanStack Table
  const table = useReactTable({
    data: flatCategoriesData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="px-4 lg:px-6">
        <div className="rounded-md border">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {hasEditPermission && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    {hasEditPermission && (
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6">
      {hasEditPermission && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <IconPlus className="mr-2 h-4 w-4" />
            Create Category
          </Button>
        </div>
      )}
      <div className="rounded-md border">
        <ScrollArea className="w-full">
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
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                    colSpan={hasEditPermission ? 6 : 5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No categories found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Create Category Dialog */}
      <CategoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
            categories={categories}
        onSubmit={(data) => createMutation.mutate(data as CategoryCreate)}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createMutation.isPending}
          />

      {/* Edit Category Dialog */}
      <CategoryDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setSelectedCategory(null)
        }}
              category={selectedCategory}
        categories={categories}
        onSubmit={(data) => {
          if (selectedCategory) {
            updateMutation.mutate({
                id: selectedCategory.id, 
              data: data as CategoryUpdate,
            })
                }
        }}
              onCancel={() => {
                setEditDialogOpen(false)
                setSelectedCategory(null)
              }}
              isLoading={updateMutation.isPending}
            />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setSelectedCategory(null)
        }}
        title="Delete Category"
        itemName={selectedCategory?.name}
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
        disabled={!!(selectedCategory?.children && selectedCategory.children.length > 0)}
        warning={
          selectedCategory?.children && selectedCategory.children.length > 0
            ? `Warning: This category has ${selectedCategory.children.length} subcategory(ies). Please delete or reassign them first.`
            : undefined
        }
      />
    </div>
  )
}


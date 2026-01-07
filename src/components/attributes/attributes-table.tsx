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
import { IconDots, IconEdit, IconTrash, IconPlus, IconArrowUp, IconArrowDown, IconArrowsSort, IconCheck, IconX } from "@tabler/icons-react"
import { AttributeDialog } from "./attribute-dialog"

// Import shared API services and types
import { attributesApi } from "@/lib/api/services/attributes"
import { categoriesApi } from "@/lib/api/services/categories"
import type { Attribute, AttributeCreate, AttributeUpdate, Category } from "@/lib/api/types"

interface AttributesTableProps {
  currentUserRole?: string
  canEdit?: boolean
}

export function AttributesTable({ currentUserRole, canEdit = true }: AttributesTableProps) {
  const isAdmin = currentUserRole?.toUpperCase() === "ADMIN"
  const hasEditPermission = isAdmin || canEdit
  const router = useRouter()
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  // React Query: Fetch attributes using shared API service
  const {
    data: attributes = [],
    isLoading,
    error,
  } = useQuery<Attribute[], Error>({
    queryKey: ["attributes"],
    queryFn: () => attributesApi.list({ include_inactive: true }),
    retry: 1,
  })

  // React Query: Fetch categories (for form) using shared API service
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
  } = useQuery<Category[], Error>({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list({ include_inactive: true }),
    retry: 1,
    enabled: createDialogOpen || editDialogOpen, // Only fetch when form is open
  })

  // React Query: Create attribute mutation
  const createMutation = useMutation({
    mutationFn: (data: AttributeCreate) => attributesApi.create(data),
    onSuccess: () => {
      toast.success("Attribute created successfully")
      queryClient.invalidateQueries({ queryKey: ["attributes"] })
      setCreateDialogOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create attribute")
    },
  })

  // React Query: Update attribute mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AttributeUpdate }) =>
      attributesApi.update(id, data),
    onSuccess: () => {
      toast.success("Attribute updated successfully")
      queryClient.invalidateQueries({ queryKey: ["attributes"] })
      setEditDialogOpen(false)
      setSelectedAttribute(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update attribute")
    },
  })

  // React Query: Delete attribute mutation
  const deleteMutation = useMutation({
    mutationFn: (attributeId: string) => attributesApi.delete(attributeId),
    onSuccess: () => {
      toast.success("Attribute deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["attributes"] })
      setDeleteDialogOpen(false)
      setSelectedAttribute(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete attribute")
    },
  })

  const handleEdit = (attribute: Attribute) => {
    setSelectedAttribute(attribute)
    setEditDialogOpen(true)
  }

  const handleDelete = (attribute: Attribute) => {
    setSelectedAttribute(attribute)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedAttribute) {
      deleteMutation.mutate(selectedAttribute.id)
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case "TEXT":
        return "default"
      case "NUMBER":
        return "secondary"
      case "SELECT":
        return "outline"
      case "BOOLEAN":
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

  // Memoize columns to avoid recreating on every render
  const columns: ColumnDef<Attribute>[] = useMemo(() => [
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
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            Type
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
        <Badge variant={getTypeColor(row.original.type)}>
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "is_required",
      header: () => <div className="text-center">Required</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          {row.original.is_required ? (
            <IconCheck className="h-5 w-5 text-green-600" />
          ) : (
            <IconX className="h-5 w-5 text-red-600" />
          )}
        </div>
      ),
    },
    {
      accessorKey: "is_filterable",
      header: () => <div className="text-center">Filterable</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          {row.original.is_filterable ? (
            <IconCheck className="h-5 w-5 text-green-600" />
          ) : (
            <IconX className="h-5 w-5 text-red-600" />
          )}
        </div>
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
            cell: ({ row }: { row: { original: Attribute } }) => {
              const attribute = row.original
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
                      onClick={() => handleEdit(attribute)}
                      disabled={isActionLoading}
                    >
                      <IconEdit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(attribute)}
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
    data: attributes,
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
          <ScrollArea className="w-full whitespace-nowrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Filterable</TableHead>
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
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
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
            Create Attribute
          </Button>
        </div>
      )}
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
                    colSpan={hasEditPermission ? 8 : 7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No attributes found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Create Attribute Dialog */}
      <AttributeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        categories={categories}
        onSubmit={(data) => createMutation.mutate(data as AttributeCreate)}
        onCancel={() => setCreateDialogOpen(false)}
        isLoading={createMutation.isPending}
        isCategoriesLoading={isCategoriesLoading}
      />

      {/* Edit Attribute Dialog */}
      <AttributeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        attribute={selectedAttribute}
        categories={categories}
        onSubmit={(data) => {
          if (selectedAttribute) {
            updateMutation.mutate({
              id: selectedAttribute.id,
              data: data as AttributeUpdate,
            })
          }
        }}
        onCancel={() => setEditDialogOpen(false)}
        isLoading={updateMutation.isPending}
        isCategoriesLoading={isCategoriesLoading}
      />

      {/* Delete Attribute Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Attribute"
        itemName={selectedAttribute?.name}
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
        description={`This action cannot be undone. This will permanently delete the attribute "${selectedAttribute?.name}".`}
      />
    </div>
  )
}



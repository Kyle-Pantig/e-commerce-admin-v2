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
import { DeleteConfirmDialog, Pagination } from "@/components/shared"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconDots,
  IconEye,
  IconTrash,
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
  IconReceipt,
  IconSearch,
  IconX,
} from "@tabler/icons-react"

import { ordersApi, type OrderListResponse } from "@/lib/api/services/orders"
import type { OrderListItem, OrderStatus, PaymentStatus } from "@/lib/api/types"
import { formatPrice } from "@/lib/utils"

interface OrdersTableProps {
  currentUserRole?: string
  canEdit?: boolean
}

// Status badge configuration
const statusConfig: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  CONFIRMED: { label: "Confirmed", variant: "default" },
  PROCESSING: { label: "Processing", variant: "default" },
  SHIPPED: { label: "Shipped", variant: "default" },
  DELIVERED: { label: "Delivered", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  REFUNDED: { label: "Refunded", variant: "outline" },
  ON_HOLD: { label: "On Hold", variant: "secondary" },
}

const paymentStatusConfig: Record<PaymentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  PAID: { label: "Paid", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
  REFUNDED: { label: "Refunded", variant: "outline" },
  PARTIALLY_REFUNDED: { label: "Partial Refund", variant: "outline" },
}

export function OrdersTable({ currentUserRole, canEdit = true }: OrdersTableProps) {
  const isAdmin = currentUserRole?.toUpperCase() === "ADMIN"
  const hasEditPermission = isAdmin || canEdit
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // UI State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  // Filter State - Initialize from URL params
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page")
    return pageParam ? parseInt(pageParam, 10) : 1
  })
  const [perPage] = useState(20)
  const [search, setSearch] = useState(() => searchParams.get("search") || "")
  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") || "")
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get("status") || "")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(() => searchParams.get("payment_status") || "")

  // Update URL when filters change
  const updateURL = (updates: {
    page?: number
    search?: string
    status?: string
    payment_status?: string
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

    if (updates.status !== undefined) {
      if (updates.status === "") {
        params.delete("status")
      } else {
        params.set("status", updates.status)
      }
    }

    if (updates.payment_status !== undefined) {
      if (updates.payment_status === "") {
        params.delete("payment_status")
      } else {
        params.set("payment_status", updates.payment_status)
      }
    }

    const newURL = params.toString() ? `?${params.toString()}` : ""
    const fullPath = `/orders${newURL}`

    startTransition(() => {
      router.replace(fullPath, { scroll: false })
    })

    if (typeof window !== "undefined") {
      const newState = { ...window.history.state }
      window.history.replaceState(newState, "", fullPath)
    }
  }

  // React Query: Fetch orders
  const {
    data: ordersData,
    isLoading,
    error,
  } = useQuery<OrderListResponse, Error>({
    queryKey: ["orders", page, perPage, search, statusFilter, paymentStatusFilter, sorting],
    queryFn: () =>
      ordersApi.list({
        page,
        per_page: perPage,
        search: search || undefined,
        status: (statusFilter as OrderStatus) || undefined,
        payment_status: (paymentStatusFilter as PaymentStatus) || undefined,
        sort_by: (sorting[0]?.id as "created_at" | "updated_at" | "total" | "order_number") || "created_at",
        sort_order: sorting[0]?.desc ? "desc" : "asc",
      }),
    retry: 1,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.delete(orderId),
    onSuccess: () => {
      toast.success("Order deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      setDeleteDialogOpen(false)
      setSelectedOrder(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete order")
    },
  })

  const handleView = (order: OrderListItem) => {
    router.push(`/orders/${order.order_number}`)
  }

  const handleDelete = (order: OrderListItem) => {
    setSelectedOrder(order)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedOrder) {
      deleteMutation.mutate(selectedOrder.id)
    }
  }

  const handleSearch = () => {
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

  const handleStatusFilterChange = (value: string) => {
    const status = value === "all" ? "" : value
    updateURL({ status, page: 1 })
    setStatusFilter(status)
    setPage(1)
  }

  const handlePaymentStatusFilterChange = (value: string) => {
    const paymentStatus = value === "all" ? "" : value
    updateURL({ payment_status: paymentStatus, page: 1 })
    setPaymentStatusFilter(paymentStatus)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage })
    setPage(newPage)
  }

  // Sync state with URL when it changes
  useEffect(() => {
    const urlPage = searchParams.get("page")
    const urlSearch = searchParams.get("search") || ""
    const urlStatus = searchParams.get("status") || ""
    const urlPaymentStatus = searchParams.get("payment_status") || ""

    const newPage = urlPage ? parseInt(urlPage, 10) : 1
    if (newPage !== page) setPage(newPage)
    if (urlSearch !== search) {
      setSearch(urlSearch)
      setSearchInput(urlSearch)
    }
    if (urlStatus !== statusFilter) setStatusFilter(urlStatus)
    if (urlPaymentStatus !== paymentStatusFilter) setPaymentStatusFilter(urlPaymentStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "N/A"
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

  // Columns definition
  const columns: ColumnDef<OrderListItem>[] = useMemo(
    () => [
      {
        accessorKey: "order_number",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8"
          >
            Order #
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
          <div className="font-mono font-medium">{row.original.order_number}</div>
        ),
      },
      {
        accessorKey: "customer_name",
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.customer_name}</div>
            <div className="text-xs text-muted-foreground">{row.original.customer_email}</div>
          </div>
        ),
      },
      {
        accessorKey: "items_count",
        header: "Items",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.items_count} items</Badge>
        ),
      },
      {
        accessorKey: "total",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8"
          >
            Total
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
          <div className="font-medium">{formatPrice(row.original.total)}</div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status
          const config = statusConfig[status]
          return (
            <Badge variant={config?.variant || "default"}>
              {config?.label || status}
            </Badge>
          )
        },
      },
      {
        accessorKey: "payment_status",
        header: "Payment",
        cell: ({ row }) => {
          const status = row.original.payment_status
          const config = paymentStatusConfig[status]
          return (
            <Badge variant={config?.variant || "default"}>
              {config?.label || status}
            </Badge>
          )
        },
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
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const order = row.original

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <IconDots className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleView(order)}>
                  <IconEye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {hasEditPermission && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(order)}
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
    ],
    [isAdmin]
  )

  // Initialize table
  const table = useReactTable({
    data: ordersData?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    manualSorting: true,
  })

  // Loading state
  if (isLoading && !ordersData) {
    return (
      <div className="px-4 lg:px-6 space-y-4">
        {/* Filters Skeleton */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="h-9 w-9" />
          </div>
          <Skeleton className="h-9 w-[150px]" />
          <Skeleton className="h-9 w-[150px]" />
          {hasEditPermission && <Skeleton className="h-9 w-[140px]" />}
        </div>

        {/* Table Skeleton */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
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
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative max-w-sm w-full">
            <Input
              placeholder="Search orders..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pr-8"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <IconX className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="outline" onClick={handleSearch}>
            <IconSearch className="h-4 w-4" />
          </Button>
        </div>

        <Select value={statusFilter || "all"} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="SHIPPED">Shipped</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentStatusFilter || "all"} onValueChange={handlePaymentStatusFilterChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Payments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>

        {hasEditPermission && (
          <Button onClick={() => router.push("/orders/new")}>
            <IconPlus className="mr-2 h-4 w-4" />
            Create Order
          </Button>
        )}
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
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    <IconReceipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No orders found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Pagination */}
      {ordersData && (
        <Pagination
          page={page}
          totalPages={ordersData.total_pages}
          total={ordersData.total}
          perPage={perPage}
          onPageChange={handlePageChange}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Order"
        itemName={selectedOrder?.order_number}
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}

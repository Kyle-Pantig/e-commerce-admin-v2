"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Link from "next/link"
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconPercentage,
  IconCurrencyPeso,
  IconCheck,
  IconX,
  IconCopy,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Pagination, DeleteConfirmDialog } from "@/components/shared"
import { discountsApi, type DiscountCode, type DiscountCodeListResponse } from "@/lib/api"
import { formatPrice, formatDiscount as formatDiscountUtil } from "@/lib/utils"
import { format } from "date-fns"

interface DiscountsTableProps {
  canEdit?: boolean
}

export function DiscountsTable({ canEdit = true }: DiscountsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // State
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountCode | null>(null)

  // Pagination
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("per_page") || "20")

  // Query
  const { data, isLoading, error } = useQuery<DiscountCodeListResponse>({
    queryKey: ["discounts", { page, perPage, search }],
    queryFn: () => discountsApi.list({ page, per_page: perPage, search: search || undefined }),
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => discountsApi.delete(id),
    onSuccess: () => {
      toast.success("Discount code deleted")
      queryClient.invalidateQueries({ queryKey: ["discounts"] })
      setDeleteDialogOpen(false)
      setSelectedDiscount(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete discount code")
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => discountsApi.toggle(id),
    onSuccess: (discount) => {
      toast.success(`Discount code ${discount.is_active ? "activated" : "deactivated"}`)
      queryClient.invalidateQueries({ queryKey: ["discounts"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to toggle discount status")
    },
  })

  // Handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (search) {
      params.set("search", search)
    } else {
      params.delete("search")
    }
    params.set("page", "1")
    router.push(`/settings/discounts?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`/settings/discounts?${params.toString()}`)
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success("Code copied to clipboard")
  }

  const handleDelete = (discount: DiscountCode) => {
    setSelectedDiscount(discount)
    setDeleteDialogOpen(true)
  }

  const formatDiscountValue = (discount: DiscountCode) => {
    return formatDiscountUtil(discount.discount_value, discount.discount_type as "PERCENTAGE" | "FIXED_AMOUNT")
  }

  const getStatusBadge = (discount: DiscountCode) => {
    const now = new Date()
    
    if (!discount.is_active) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    
    if (discount.start_date && new Date(discount.start_date) > now) {
      return <Badge variant="outline">Scheduled</Badge>
    }
    
    if (discount.end_date && new Date(discount.end_date) < now) {
      return <Badge variant="destructive">Expired</Badge>
    }
    
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return <Badge variant="destructive">Exhausted</Badge>
    }
    
    return <Badge variant="default">Active</Badge>
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="px-4 lg:px-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[300px]" />
          {canEdit && <Skeleton className="h-10 w-[150px]" />}
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Max Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                {canEdit && <TableHead className="w-[80px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  {canEdit && <TableCell><Skeleton className="h-8 w-8" /></TableCell>}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-[300px]">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search discount codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        
        {canEdit && (
          <Button asChild>
            <Link href="/settings/discounts/new">
              <IconPlus className="mr-2 h-4 w-4" />
              Create Code
            </Link>
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Min Order</TableHead>
              <TableHead>Max Discount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              {canEdit && <TableHead className="w-[80px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 10 : 9} className="text-center text-muted-foreground py-8">
                  No discount codes found
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((discount) => (
                <TableRow key={discount.id}>
                  {/* Code */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-sm bg-muted px-2 py-1 rounded">
                        {discount.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyCode(discount.code)}
                      >
                        <IconCopy className="h-3 w-3" />
                      </Button>
                    </div>
                    {discount.description && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">{discount.description}</p>
                    )}
                  </TableCell>
                  
                  {/* Type */}
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {discount.discount_type === "PERCENTAGE" ? (
                        <>
                          <IconPercentage className="h-3 w-3" />
                          Percentage
                        </>
                      ) : (
                        <>
                          <IconCurrencyPeso className="h-3 w-3" />
                          Fixed
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  
                  {/* Value */}
                  <TableCell>
                    <span className="font-medium">{formatDiscountValue(discount)}</span>
                  </TableCell>
                  
                  {/* Min Order */}
                  <TableCell>
                    {discount.minimum_order_amount ? (
                      <span>{formatPrice(discount.minimum_order_amount)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  
                  {/* Max Discount */}
                  <TableCell>
                    {discount.maximum_discount ? (
                      <span>{formatPrice(discount.maximum_discount)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  
                  {/* Status */}
                  <TableCell>{getStatusBadge(discount)}</TableCell>
                  
                  {/* Usage */}
                  <TableCell>
                    <span className="font-medium">{discount.usage_count}</span>
                    {discount.usage_limit ? (
                      <span className="text-muted-foreground"> / {discount.usage_limit}</span>
                    ) : (
                      <span className="text-muted-foreground"> / ∞</span>
                    )}
                  </TableCell>
                  
                  {/* Start Date */}
                  <TableCell>
                    {discount.start_date ? (
                      <span className="text-sm whitespace-nowrap">
                        {format(new Date(discount.start_date), "MMM d, yyyy HH:mm")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  
                  {/* End Date */}
                  <TableCell>
                    {discount.end_date ? (
                      <span className="text-sm whitespace-nowrap">
                        {format(new Date(discount.end_date), "MMM d, yyyy HH:mm")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  
                  {/* Actions */}
                  {canEdit && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <IconEdit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/settings/discounts/${discount.id}/edit`}>
                              <IconEdit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleMutation.mutate(discount.id)}>
                            {discount.is_active ? (
                              <>
                                <IconX className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <IconCheck className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(discount)}
                            className="text-destructive"
                          >
                            <IconTrash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <Pagination
          page={page}
          totalPages={data.total_pages}
          total={data.total}
          perPage={data.per_page}
          onPageChange={handlePageChange}
        />
      )}

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => selectedDiscount && deleteMutation.mutate(selectedDiscount.id)}
        title="Delete Discount Code"
        itemName={selectedDiscount?.code}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}


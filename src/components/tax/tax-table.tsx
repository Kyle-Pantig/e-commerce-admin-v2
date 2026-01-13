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
  IconReceipt,
  IconCheck,
  IconX,
  IconPackage,
  IconPercentage,
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
import { taxApi, type TaxRule, type TaxRuleListResponse } from "@/lib/api"
import { formatPrice } from "@/lib/utils"

interface TaxTableProps {
  canEdit?: boolean
}

export function TaxTable({ canEdit = true }: TaxTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // State
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<TaxRule | null>(null)

  // Pagination
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("per_page") || "20")

  // Query
  const { data, isLoading, error } = useQuery<TaxRuleListResponse>({
    queryKey: ["tax-rules", { page, perPage, search }],
    queryFn: () => taxApi.list({ page, per_page: perPage, search: search || undefined }),
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => taxApi.delete(id),
    onSuccess: () => {
      toast.success("Tax rule deleted")
      queryClient.invalidateQueries({ queryKey: ["tax-rules"] })
      setDeleteDialogOpen(false)
      setSelectedRule(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete tax rule")
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => taxApi.toggle(id),
    onSuccess: (rule) => {
      toast.success(`Tax rule ${rule.is_active ? "activated" : "deactivated"}`)
      queryClient.invalidateQueries({ queryKey: ["tax-rules"] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to toggle tax rule status")
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
    router.push(`/settings/tax?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`/settings/tax?${params.toString()}`)
  }

  const handleDelete = (rule: TaxRule) => {
    setSelectedRule(rule)
    setDeleteDialogOpen(true)
  }

  const formatTaxRate = (rule: TaxRule) => {
    if (rule.tax_type === "PERCENTAGE") {
      return `${rule.tax_rate}%`
    }
    return formatPrice(rule.tax_rate)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[300px]" />
          {canEdit && <Skeleton className="h-10 w-[150px]" />}
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Tax Rate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-[80px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-[300px]">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tax rules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        
        {canEdit && (
          <Button asChild>
            <Link href="/settings/tax/new">
              <IconPlus className="mr-2 h-4 w-4" />
              Create Rule
            </Link>
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tax Rate</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead className="w-[80px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-8">
                  <div className="flex flex-col items-center gap-2">
                    <IconReceipt className="h-8 w-8 text-muted-foreground/50" />
                    <p>No tax rules found</p>
                    {canEdit && (
                      <Button asChild variant="outline" size="sm" className="mt-2">
                        <Link href="/settings/tax/new">
                          <IconPlus className="mr-2 h-4 w-4" />
                          Create your first rule
                        </Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((rule) => (
                <TableRow key={rule.id}>
                  {/* Name */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <IconReceipt className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {rule.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Tax Rate */}
                  <TableCell>
                    <span className="font-semibold text-lg">{formatTaxRate(rule)}</span>
                  </TableCell>
                  
                  {/* Type */}
                  <TableCell>
                    {rule.tax_type === "PERCENTAGE" ? (
                      <Badge variant="secondary" className="gap-1">
                        <IconPercentage className="h-3 w-3" />
                        Percentage
                      </Badge>
                    ) : (
                      <Badge variant="outline">Fixed Amount</Badge>
                    )}
                  </TableCell>
                  
                  {/* Inclusive/Exclusive */}
                  <TableCell>
                    {rule.is_inclusive ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Inclusive
                      </Badge>
                    ) : (
                      <Badge variant="outline">Exclusive</Badge>
                    )}
                  </TableCell>
                  
                  {/* Products */}
                  <TableCell>
                    {rule.applicable_products && rule.applicable_products.length > 0 ? (
                      <Badge variant="outline" className="gap-1">
                        <IconPackage className="h-3 w-3" />
                        {rule.applicable_products.length} product{rule.applicable_products.length > 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">All Products</Badge>
                    )}
                  </TableCell>
                  
                  {/* Priority */}
                  <TableCell>
                    <span className="font-mono text-sm">{rule.priority}</span>
                  </TableCell>
                  
                  {/* Status */}
                  <TableCell>
                    {rule.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
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
                            <Link href={`/settings/tax/${rule.id}/edit`}>
                              <IconEdit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleMutation.mutate(rule.id)}>
                            {rule.is_active ? (
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
                            onClick={() => handleDelete(rule)}
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
        onConfirm={() => selectedRule && deleteMutation.mutate(selectedRule.id)}
        title="Delete Tax Rule"
        itemName={selectedRule?.name}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  )
}

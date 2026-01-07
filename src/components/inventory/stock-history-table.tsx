"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { inventoryApi, type StockAdjustment, type StockAdjustmentType } from "@/lib/api"
import {
  IconArrowUp,
  IconArrowDown,
  IconHistory,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"

const TYPE_LABELS: Record<StockAdjustmentType, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  INCREASE: { label: "Increase", variant: "default" },
  DECREASE: { label: "Decrease", variant: "destructive" },
  SALE: { label: "Sale", variant: "secondary" },
  RETURN: { label: "Return", variant: "default" },
  RESTOCK: { label: "Restock", variant: "default" },
  CORRECTION: { label: "Correction", variant: "outline" },
  DAMAGE: { label: "Damage", variant: "destructive" },
  EXPIRED: { label: "Expired", variant: "destructive" },
  TRANSFER_IN: { label: "Transfer In", variant: "default" },
  TRANSFER_OUT: { label: "Transfer Out", variant: "destructive" },
  INITIAL: { label: "Initial", variant: "secondary" },
}

interface StockHistoryTableProps {
  productId?: string
  variantId?: string
  title?: string
}

export function StockHistoryTable({ productId, variantId, title = "Stock History" }: StockHistoryTableProps) {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<StockAdjustmentType | "all">("all")
  const perPage = 10

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "history", productId, variantId, page, typeFilter],
    queryFn: () =>
      productId
        ? inventoryApi.getProductHistory(productId, { page, per_page: perPage, include_variants: true })
        : inventoryApi.getHistory({
            variant_id: variantId,
            type: typeFilter === "all" ? undefined : typeFilter,
            page,
            per_page: perPage,
          }),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconHistory className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <IconHistory className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>
            {data?.total || 0} total adjustments
          </CardDescription>
        </div>
        {!productId && !variantId && (
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as StockAdjustmentType | "all"); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([type, { label }]) => (
                <SelectItem key={type} value={type}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {data?.items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No stock adjustments found
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product / Variant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Action By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((adjustment) => (
                  <AdjustmentRow key={adjustment.id} adjustment={adjustment} />
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {data && data.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {data.total_pages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <IconChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                    disabled={page === data.total_pages}
                  >
                    <IconChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function AdjustmentRow({ adjustment }: { adjustment: StockAdjustment }) {
  const typeInfo = TYPE_LABELS[adjustment.type] || { label: adjustment.type, variant: "outline" as const }
  const isPositive = adjustment.quantity > 0

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{adjustment.product_name || "Unknown Product"}</div>
        {adjustment.variant_name && (
          <div className="text-sm text-muted-foreground">{adjustment.variant_name}</div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className={`flex items-center justify-end gap-1 font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <IconArrowUp className="h-4 w-4" /> : <IconArrowDown className="h-4 w-4" />}
          {isPositive ? '+' : ''}{adjustment.quantity}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="text-muted-foreground text-sm">{adjustment.previous_stock}</div>
        <div className="font-medium">{adjustment.new_stock}</div>
      </TableCell>
      <TableCell>
        <div className="max-w-[200px] truncate text-sm text-muted-foreground">
          {adjustment.reason || "-"}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {adjustment.adjusted_by || <span className="text-muted-foreground">System</span>}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(adjustment.created_at), { addSuffix: true })}
        </div>
      </TableCell>
    </TableRow>
  )
}


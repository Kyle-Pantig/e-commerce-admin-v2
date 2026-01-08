"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  IconArrowLeft,
  IconPackage,
  IconTruck,
  IconCheck,
  IconClock,
  IconBan,
  IconCurrencyDollar,
  IconUser,
  IconMail,
  IconPhone,
  IconMapPin,
  IconLoader2,
  IconReceipt,
  IconHistory,
  IconCreditCard,
  IconNote,
  IconFileInvoice,
} from "@tabler/icons-react"
import Image from "next/image"

import { ordersApi } from "@/lib/api/services/orders"
import type { Order, OrderStatus, PaymentStatus } from "@/lib/api/types"
import { formatPrice } from "@/lib/utils"

interface OrderDetailProps {
  orderNumber: string
  currentUserRole?: string
}

// Status badge configuration
const statusConfig: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: IconClock, color: "text-amber-500" },
  CONFIRMED: { label: "Confirmed", variant: "default", icon: IconCheck, color: "text-blue-500" },
  PROCESSING: { label: "Processing", variant: "default", icon: IconPackage, color: "text-indigo-500" },
  SHIPPED: { label: "Shipped", variant: "default", icon: IconTruck, color: "text-purple-500" },
  DELIVERED: { label: "Delivered", variant: "default", icon: IconCheck, color: "text-green-500" },
  CANCELLED: { label: "Cancelled", variant: "destructive", icon: IconBan, color: "text-red-500" },
  REFUNDED: { label: "Refunded", variant: "outline", icon: IconCurrencyDollar, color: "text-orange-500" },
  ON_HOLD: { label: "On Hold", variant: "secondary", icon: IconClock, color: "text-slate-500" },
}

const paymentStatusConfig: Record<PaymentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  PENDING: { label: "Pending", variant: "secondary", color: "bg-amber-500" },
  PAID: { label: "Paid", variant: "default", color: "bg-green-500" },
  FAILED: { label: "Failed", variant: "destructive", color: "bg-red-500" },
  REFUNDED: { label: "Refunded", variant: "outline", color: "bg-orange-500" },
  PARTIALLY_REFUNDED: { label: "Partial Refund", variant: "outline", color: "bg-yellow-500" },
}

const allStatuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "ON_HOLD",
]

export function OrderDetail({ orderNumber, currentUserRole }: OrderDetailProps) {
  const isAdmin = currentUserRole?.toUpperCase() === "ADMIN"
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("")
  const [statusNote, setStatusNote] = useState("")

  // Fetch order data by order number
  const { data: order, isLoading, error } = useQuery<Order, Error>({
    queryKey: ["order", orderNumber],
    queryFn: () => ordersApi.getByOrderNumber(orderNumber),
    retry: 1,
  })

  // Update status mutation (uses order ID internally)
  const updateStatusMutation = useMutation({
    mutationFn: ({ status, note }: { status: OrderStatus; note?: string }) =>
      ordersApi.updateStatus(order!.id, { status, note }),
    onSuccess: () => {
      toast.success("Order status updated successfully")
      queryClient.invalidateQueries({ queryKey: ["order", orderNumber] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      setStatusDialogOpen(false)
      setNewStatus("")
      setStatusNote("")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update order status")
    },
  })

  const handleStatusChange = () => {
    if (!newStatus) return
    updateStatusMutation.mutate({ status: newStatus, note: statusNote || undefined })
  }

  if (isLoading) {
    return (
      <div className="px-4 lg:px-6 pb-32">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1 min-w-0 space-y-12">
            <Skeleton className="h-96 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <aside className="w-full lg:w-[400px] space-y-8 shrink-0">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </aside>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="px-4 lg:px-6">
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6">
          <p className="text-destructive font-medium">Failed to load order: {error?.message || "Order not found"}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/orders")}>
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </div>
      </div>
    )
  }

  const statusData = statusConfig[order.status]
  const StatusIcon = statusData.icon
  const paymentData = paymentStatusConfig[order.payment_status]

  return (
    <div className="px-4 lg:px-6 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push("/orders")} className="shrink-0">
          <IconArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{order.order_number}</h1>
          <p className="text-muted-foreground text-sm">
            Created on {new Date(order.created_at).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setStatusDialogOpen(true)} className="shrink-0">
            Update Status
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Main Content Column */}
        <div className="flex-1 min-w-0 space-y-12">
          {/* Order Items */}
          <FieldSet>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <IconReceipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <FieldLegend className="mb-0">Order Items</FieldLegend>
                <p className="text-sm text-muted-foreground">
                  {order.items.length} item{order.items.length !== 1 ? "s" : ""} in this order
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {item.product_image ? (
                      <Image
                        src={item.product_image}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <IconPackage className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{item.product_name}</h4>
                    {item.variant_name && (
                      <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                    )}
                    {item.product_sku && (
                      <p className="text-xs text-muted-foreground/70 font-mono mt-1">SKU: {item.product_sku}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {formatPrice(item.subtotal)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Totals */}
            <div className="mt-6 p-4 rounded-xl bg-muted/20 border border-border/50">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">{formatPrice(order.shipping_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">{formatPrice(order.tax_amount)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span className="font-medium">-{formatPrice(order.discount_amount)}</span>
                  </div>
                )}
                <Separator className="my-3" />
                <div className="flex justify-between font-bold text-xl">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </FieldSet>

          {/* Status Timeline */}
          <FieldSet>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <IconHistory className="h-5 w-5 text-primary" />
              </div>
              <FieldLegend className="mb-0">Status History</FieldLegend>
            </div>
            
            <div className="space-y-4">
              {order.status_history.map((history, index) => {
                const historyStatus = statusConfig[history.to_status]
                const HistoryIcon = historyStatus.icon
                return (
                  <div key={history.id} className="flex gap-4">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center border-2 border-border/50`}>
                        <HistoryIcon className={`h-5 w-5 ${historyStatus.color}`} />
                      </div>
                      {index < order.status_history.length - 1 && (
                        <div className="absolute top-10 left-1/2 w-0.5 h-[calc(100%-0.5rem)] -translate-x-1/2 bg-border/50" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={historyStatus.variant} className="text-xs">
                          {historyStatus.label}
                        </Badge>
                        {history.from_status && (
                          <span className="text-xs text-muted-foreground">
                            from {statusConfig[history.from_status].label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1.5">
                        {new Date(history.created_at).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {history.changed_by && ` by ${history.changed_by}`}
                      </p>
                      {history.note && (
                        <p className="text-sm mt-2 p-3 bg-muted/30 rounded-lg border border-border/30">{history.note}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </FieldSet>
        </div>

        {/* Sidebar Column */}
        <aside className="w-full lg:w-[400px] space-y-8 shrink-0">
          {/* Payment */}
          <FieldSet className="p-6 border border-border/50 rounded-2xl">
            <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Payment</FieldLegend>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${paymentData.color}`} />
                  <span className="text-sm text-muted-foreground">Status</span>
                </div>
                <Badge variant={paymentData.variant}>
                  {paymentData.label}
                </Badge>
              </div>
              
              {order.payment_method && (
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <IconCreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Method</span>
                  </div>
                  <span className="text-sm font-medium">
                    {order.payment_method.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex items-center justify-between pt-2">
                <span className="font-semibold">Total Amount</span>
                <span className="text-xl font-bold text-primary">{formatPrice(order.total)}</span>
              </div>
            </div>
          </FieldSet>

          {/* Customer */}
          <FieldSet className="p-6 border border-border/50 rounded-2xl">
            <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Customer</FieldLegend>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl">
                <IconUser className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{order.customer_name}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl">
                <IconMail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${order.customer_email}`} className="text-primary hover:underline text-sm">
                  {order.customer_email}
                </a>
              </div>
              {order.customer_phone && (
                <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl">
                  <IconPhone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${order.customer_phone}`} className="text-primary hover:underline text-sm">
                    {order.customer_phone}
                  </a>
                </div>
              )}
            </div>
          </FieldSet>

          {/* Shipping Address */}
          <FieldSet className="p-6 border border-border/50 rounded-2xl">
            <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Shipping Address</FieldLegend>
            
            <div className="p-4 bg-muted/20 rounded-xl">
              <div className="flex gap-3">
                <IconMapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <address className="not-italic text-sm space-y-1">
                  <p className="font-medium">{order.shipping_address}</p>
                  <p className="text-muted-foreground">
                    {order.shipping_city}
                    {order.shipping_state && `, ${order.shipping_state}`}
                    {order.shipping_zip && ` ${order.shipping_zip}`}
                  </p>
                  <p className="text-muted-foreground">{order.shipping_country}</p>
                </address>
              </div>
            </div>
            
            {order.tracking_number && (
              <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <IconTruck className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-primary">Tracking Number</p>
                </div>
                <p className="font-mono text-sm bg-background/50 p-2 rounded-lg">{order.tracking_number}</p>
                {order.shipping_carrier && (
                  <p className="text-xs text-muted-foreground mt-2">via {order.shipping_carrier}</p>
                )}
              </div>
            )}
          </FieldSet>

          {/* Billing Address */}
          <FieldSet className="p-6 border border-border/50 rounded-2xl">
            <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Billing Address</FieldLegend>
            
            {order.billing_address ? (
              <div className="p-4 bg-muted/20 rounded-xl">
                <div className="flex gap-3">
                  <IconFileInvoice className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <address className="not-italic text-sm space-y-1">
                    <p className="font-medium">{order.billing_address}</p>
                    <p className="text-muted-foreground">
                      {order.billing_city}
                      {order.billing_state && `, ${order.billing_state}`}
                      {order.billing_zip && ` ${order.billing_zip}`}
                    </p>
                    {order.billing_country && (
                      <p className="text-muted-foreground">{order.billing_country}</p>
                    )}
                  </address>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/10 rounded-xl border border-dashed border-border/50">
                <p className="text-sm text-muted-foreground text-center">Same as shipping address</p>
              </div>
            )}
          </FieldSet>

          {/* Notes */}
          {(order.notes || order.internal_notes) && (
            <FieldSet className="p-6 border border-border/50 rounded-2xl">
              <FieldLegend variant="label" className="text-xs uppercase tracking-widest font-black text-muted-foreground/80 mb-4">Notes</FieldLegend>
              
              <div className="space-y-4">
                {order.notes && (
                  <div className="p-4 bg-muted/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <IconNote className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Note</p>
                    </div>
                    <p className="text-sm">{order.notes}</p>
                  </div>
                )}
                {isAdmin && order.internal_notes && (
                  <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <IconNote className="h-4 w-4 text-amber-600" />
                      <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Internal Note</p>
                    </div>
                    <p className="text-sm">{order.internal_notes}</p>
                  </div>
                )}
              </div>
            </FieldSet>
          )}
        </aside>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order {order.order_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Status</label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {allStatuses.map((status) => {
                    const config = statusConfig[status]
                    const Icon = config.icon
                    return (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note (optional)</label>
              <Textarea
                placeholder="Add a note about this status change..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStatusChange} 
              disabled={!newStatus || updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

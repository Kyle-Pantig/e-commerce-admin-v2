"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { IconReceipt, IconClock, IconCheck, IconTruck, IconX, IconCreditCard } from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { analyticsApi, type RecentOrder } from "@/lib/api/services/analytics"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  PENDING: { label: "Pending", variant: "secondary", icon: IconClock },
  CONFIRMED: { label: "Confirmed", variant: "outline", icon: IconCheck },
  PROCESSING: { label: "Processing", variant: "outline", icon: IconClock },
  SHIPPED: { label: "Shipped", variant: "default", icon: IconTruck },
  DELIVERED: { label: "Delivered", variant: "default", icon: IconCheck },
  CANCELLED: { label: "Cancelled", variant: "destructive", icon: IconX },
}

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Unpaid", className: "text-orange-600" },
  PAID: { label: "Paid", className: "text-green-600" },
  FAILED: { label: "Failed", className: "text-red-600" },
  REFUNDED: { label: "Refunded", className: "text-blue-600" },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) {
    return `${diffMins}m ago`
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function RecentOrders() {
  const { data, isLoading, error } = useQuery<RecentOrder[]>({
    queryKey: ["recent-orders"],
    queryFn: () => analyticsApi.getRecentOrders(6),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconReceipt className="h-5 w-5" />
            Recent Orders
          </CardTitle>
          <CardDescription>Latest customer orders</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
          No orders yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconReceipt className="h-5 w-5" />
          Recent Orders
        </CardTitle>
        <CardDescription>Latest customer orders</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((order) => {
          const status = statusConfig[order.status] || statusConfig.PENDING
          const paymentStatus = paymentStatusConfig[order.payment_status] || paymentStatusConfig.PENDING
          const StatusIcon = status.icon

          return (
            <Link
              key={order.id}
              href={`/orders/${order.order_number}`}
              className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary flex-shrink-0">
                <StatusIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{order.order_number}</p>
                  <span className={`text-xs font-medium ${paymentStatus.className}`}>
                    {paymentStatus.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {order.customer_name || order.customer_email}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="font-semibold text-sm">${order.total.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
              </div>
            </Link>
          )
        })}
        <Button variant="ghost" className="w-full" asChild>
          <Link href="/orders">
            View all orders
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}


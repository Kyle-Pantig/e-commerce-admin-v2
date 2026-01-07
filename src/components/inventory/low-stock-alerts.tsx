"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { inventoryApi, type LowStockAlert } from "@/lib/api"
import {
  IconAlertTriangle,
  IconPackageOff,
  IconExternalLink,
  IconBox,
} from "@tabler/icons-react"

interface LowStockAlertsProps {
  limit?: number
  showViewAll?: boolean
}

export function LowStockAlerts({ limit = 10, showViewAll = true }: LowStockAlertsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "low-stock-alerts", limit],
    queryFn: () => inventoryApi.getLowStockAlerts({ threshold: 10, include_out_of_stock: true }),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconAlertTriangle className="h-5 w-5 text-orange-500" />
            Stock Alerts
          </CardTitle>
          <CardDescription>Products that need attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconAlertTriangle className="h-5 w-5 text-orange-500" />
            Stock Alerts
          </CardTitle>
          <CardDescription>Products that need attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <IconBox className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>All products are well stocked!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayedAlerts = data.alerts.slice(0, limit)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <IconAlertTriangle className="h-5 w-5 text-orange-500" />
            Stock Alerts
          </CardTitle>
          <CardDescription>
            {data.critical_count > 0 && (
              <span className="text-red-500 font-medium">{data.critical_count} critical • </span>
            )}
            {data.total_low_stock} low stock • {data.total_out_of_stock} out of stock
          </CardDescription>
        </div>
        {showViewAll && data.alerts.length > limit && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/alerts">
              View All
              <IconExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedAlerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AlertItem({ alert }: { alert: LowStockAlert }) {
  const isOutOfStock = alert.status === "out_of_stock"
  const isCritical = alert.current_stock <= 5

  return (
    <Link
      href={`/products/${alert.slug}/edit`}
      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
    >
      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        {alert.image ? (
          <Image
            src={alert.image}
            alt={alert.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <IconBox className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate group-hover:text-primary transition-colors">
          {alert.name}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          {alert.sku && <span>SKU: {alert.sku}</span>}
          {alert.type === "variant" && (
            <Badge variant="outline" className="text-xs">Variant</Badge>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge 
          variant={isOutOfStock ? "destructive" : isCritical ? "destructive" : "secondary"}
          className="flex items-center gap-1"
        >
          {isOutOfStock ? (
            <>
              <IconPackageOff className="h-3 w-3" />
              Out of Stock
            </>
          ) : (
            <>
              <IconAlertTriangle className="h-3 w-3" />
              {alert.current_stock} left
            </>
          )}
        </Badge>
      </div>
    </Link>
  )
}


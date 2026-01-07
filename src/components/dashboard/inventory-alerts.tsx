"use client"

import { useQuery } from "@tanstack/react-query"
import Image from "next/image"
import Link from "next/link"
import { IconAlertTriangle, IconPackage, IconPackageOff } from "@tabler/icons-react"
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
import { analyticsApi, type LowStockProduct } from "@/lib/api/services/analytics"

export function InventoryAlerts() {
  const { data, isLoading, error } = useQuery<LowStockProduct[]>({
    queryKey: ["low-stock"],
    queryFn: () => analyticsApi.getLowStock(10, 8),
    refetchInterval: 60000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconAlertTriangle className="h-5 w-5 text-orange-500" />
            Inventory Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
          Failed to load inventory data
        </CardContent>
      </Card>
    )
  }

  const outOfStock = data?.filter(p => p.status === "out_of_stock") || []
  const lowStock = data?.filter(p => p.status === "low_stock") || []

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconAlertTriangle className="h-5 w-5 text-orange-500" />
            Inventory Alerts
          </CardTitle>
          <CardDescription>Products needing attention</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-32 text-center">
          <IconPackage className="h-8 w-8 text-green-500 mb-2" />
          <p className="text-muted-foreground">All products are well stocked!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconAlertTriangle className="h-5 w-5 text-orange-500" />
          Inventory Alerts
        </CardTitle>
        <CardDescription>
          {outOfStock.length} out of stock · {lowStock.length} low stock
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.slice(0, 6).map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}/edit`}
            className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <IconPackage className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {product.sku || "No SKU"}
              </p>
            </div>
            {product.status === "out_of_stock" ? (
              <Badge variant="destructive" className="flex-shrink-0 gap-1">
                <IconPackageOff className="h-3 w-3" />
                Out
              </Badge>
            ) : (
              <Badge variant="outline" className="flex-shrink-0 text-orange-600 border-orange-300">
                {product.stock} left
              </Badge>
            )}
          </Link>
        ))}
        {data.length > 6 && (
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/products?status=low_stock">
              View all {data.length} items
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}


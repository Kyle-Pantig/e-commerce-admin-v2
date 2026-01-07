"use client"

import { useQuery } from "@tanstack/react-query"
import Image from "next/image"
import Link from "next/link"
import { IconPackage, IconTrendingUp } from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { analyticsApi, type TopProduct } from "@/lib/api/services/analytics"

export function TopProducts() {
  const { data, isLoading, error } = useQuery<TopProduct[]>({
    queryKey: ["top-products"],
    queryFn: () => analyticsApi.getTopProducts(5),
    refetchInterval: 60000,
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
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
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
            <IconTrendingUp className="h-5 w-5" />
            Top Selling Products
          </CardTitle>
          <CardDescription>Best performers by units sold</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
          No sales data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconTrendingUp className="h-5 w-5" />
          Top Selling Products
        </CardTitle>
        <CardDescription>Best performers by units sold</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((product, index) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-center h-10 w-10 text-lg font-bold text-muted-foreground">
              #{index + 1}
            </div>
            <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <IconPackage className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{product.name}</p>
              <p className="text-sm text-muted-foreground">
                {product.total_sold} sold · ${product.total_revenue.toLocaleString()}
              </p>
            </div>
            <Badge variant="secondary" className="flex-shrink-0">
              ${product.price.toFixed(2)}
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}


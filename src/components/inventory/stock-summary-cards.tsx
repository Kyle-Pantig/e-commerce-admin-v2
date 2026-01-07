"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { inventoryApi } from "@/lib/api"
import {
  IconPackage,
  IconAlertTriangle,
  IconPackageOff,
  IconTrendingUp,
  IconCurrencyDollar,
  IconBox,
} from "@tabler/icons-react"

export function StockSummaryCards() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["inventory", "summary"],
    queryFn: () => inventoryApi.getSummary(),
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!summary) return null

  const cards = [
    {
      title: "Total Products",
      value: summary.total_products,
      description: `${summary.total_variants} variants tracked`,
      icon: IconPackage,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Stock Value",
      value: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(summary.total_stock_value),
      description: "Total inventory value",
      icon: IconCurrencyDollar,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Low Stock",
      value: summary.low_stock_count,
      description: "Items need restocking",
      icon: IconAlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Out of Stock",
      value: summary.out_of_stock_count,
      description: "Items unavailable",
      icon: IconPackageOff,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


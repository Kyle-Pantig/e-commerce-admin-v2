"use client"

import { useQuery } from "@tanstack/react-query"
import { IconTrendingDown, IconTrendingUp, IconCurrencyDollar, IconShoppingCart, IconPackage, IconUsers } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { analyticsApi, type DashboardAnalytics } from "@/lib/api/services/analytics"
import { formatPrice } from "@/lib/utils"

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}

export function DashboardStats() {
  const { data, isLoading, error } = useQuery<DashboardAnalytics>({
    queryKey: ["dashboard-analytics"],
    queryFn: () => analyticsApi.getDashboard(),
    refetchInterval: 60000, // Refetch every minute
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="@container/card">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32 mt-2" />
            </CardHeader>
            <CardFooter>
              <Skeleton className="h-4 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="p-6 text-center text-muted-foreground">
          Failed to load analytics data
        </Card>
      </div>
    )
  }

  const stats = [
    {
      title: "Total Revenue",
      value: formatPrice(data.revenue.this_month, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      change: data.revenue.growth_percent,
      description: `${formatPrice(data.revenue.today, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} today`,
      subtext: "Revenue this month",
      icon: IconCurrencyDollar,
    },
    {
      title: "Orders",
      value: formatNumber(data.orders.this_month),
      change: data.orders.growth_percent,
      description: `${data.orders.today} orders today`,
      subtext: "Orders this month",
      icon: IconShoppingCart,
    },
    {
      title: "Products",
      value: formatNumber(data.products.active),
      change: null,
      description: `${data.products.low_stock} low stock, ${data.products.out_of_stock} out of stock`,
      subtext: "Active products",
      icon: IconPackage,
    },
    {
      title: "Customers",
      value: formatNumber(data.customers.total),
      change: data.customers.growth_percent,
      description: `${data.customers.new_this_month} new this month`,
      subtext: "Total customers",
      icon: IconUsers,
    },
  ]

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="@container/card">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <stat.icon className="h-4 w-4" />
              {stat.title}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stat.value}
            </CardTitle>
            {stat.change !== null && (
              <CardAction>
                <Badge variant="outline" className={stat.change >= 0 ? "text-green-600" : "text-red-600"}>
                  {stat.change >= 0 ? <IconTrendingUp className="h-3 w-3" /> : <IconTrendingDown className="h-3 w-3" />}
                  {stat.change >= 0 ? "+" : ""}{stat.change}%
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {stat.description}
            </div>
            <div className="text-muted-foreground">
              {stat.subtext}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}


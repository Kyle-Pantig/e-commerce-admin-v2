"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { inventoryApi } from "@/lib/api"
import {
  IconArrowUp,
  IconArrowDown,
  IconTrendingUp,
  IconTrendingDown,
} from "@tabler/icons-react"

const chartConfig = {
  in: {
    label: "Stock In",
    color: "hsl(142, 76%, 36%)",
  },
  out: {
    label: "Stock Out",
    color: "hsl(0, 84%, 60%)",
  },
} satisfies ChartConfig

export function StockMovementChart() {
  const [days, setDays] = useState<"7" | "30" | "90">("30")

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "movements", days],
    queryFn: () => inventoryApi.getMovementReport(Number(days)),
  })

  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Stock Movement</CardTitle>
          <CardDescription>Inventory changes over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 flex-1" />
              ))}
            </div>
            <Skeleton className="h-[200px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const netPositive = data.net_change >= 0

  // Transform by_type data for the chart
  const chartData = Object.entries(data.by_type).map(([type, count]) => ({
    type: type.replace(/_/g, " "),
    in: ["INCREASE", "RETURN", "RESTOCK", "TRANSFER_IN", "INITIAL"].includes(type) ? count : 0,
    out: ["DECREASE", "SALE", "DAMAGE", "EXPIRED", "TRANSFER_OUT", "CORRECTION"].includes(type) ? count : 0,
  })).filter(d => d.in > 0 || d.out > 0)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Stock Movement</CardTitle>
        <CardDescription>
          <span className="hidden @[400px]/card:block">
            {new Date(data.period_start).toLocaleDateString()} - {new Date(data.period_end).toLocaleDateString()}
          </span>
          <span className="@[400px]/card:hidden">
            Last {days} days
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={days}
            onValueChange={(v) => v && setDays(v as typeof days)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[500px]/card:flex"
          >
            <ToggleGroupItem value="7">7d</ToggleGroupItem>
            <ToggleGroupItem value="30">30d</ToggleGroupItem>
            <ToggleGroupItem value="90">90d</ToggleGroupItem>
          </ToggleGroup>
          <Select value={days} onValueChange={(v) => setDays(v as typeof days)}>
            <SelectTrigger
              className="flex w-24 @[500px]/card:hidden"
              size="sm"
              aria-label="Select time range"
            >
              <SelectValue placeholder="30d" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7" className="rounded-lg">7 days</SelectItem>
              <SelectItem value="30" className="rounded-lg">30 days</SelectItem>
              <SelectItem value="90" className="rounded-lg">90 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid gap-3 grid-cols-3 mb-6">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-1.5 text-green-600 mb-1">
              <IconArrowUp className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">In</span>
            </div>
            <div className="text-xl font-bold text-green-600">{data.total_in.toLocaleString()}</div>
          </div>
          
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-1.5 text-red-600 mb-1">
              <IconArrowDown className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Out</span>
            </div>
            <div className="text-xl font-bold text-red-600">{data.total_out.toLocaleString()}</div>
          </div>
          
          <div className={`p-3 rounded-lg ${netPositive ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
            <div className={`flex items-center gap-1.5 ${netPositive ? 'text-green-600' : 'text-red-600'} mb-1`}>
              {netPositive ? <IconTrendingUp className="h-3.5 w-3.5" /> : <IconTrendingDown className="h-3.5 w-3.5" />}
              <span className="text-xs font-medium">Net</span>
            </div>
            <div className={`text-xl font-bold ${netPositive ? 'text-green-600' : 'text-red-600'}`}>
              {netPositive ? '+' : ''}{data.net_change.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-[180px] w-full">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                type="category"
                dataKey="type"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={80}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const label = name === "in" ? "Stock In" : "Stock Out"
                      return [value, label]
                    }}
                    indicator="dot"
                  />
                }
              />
              <Bar dataKey="in" fill="var(--color-in)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="out" fill="var(--color-out)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
            No stock movements in this period
          </div>
        )}

        {/* Top Products */}
        {(data.top_products_in.length > 0 || data.top_products_out.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2 mt-6 pt-6 border-t">
            {data.top_products_in.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <IconArrowUp className="h-4 w-4 text-green-500" />
                  Top Stock In
                </h4>
                <div className="space-y-2">
                  {data.top_products_in.slice(0, 3).map((product) => (
                    <div key={product.id} className="flex items-center justify-between text-sm">
                      <span className="truncate text-muted-foreground">{product.name}</span>
                      <span className="text-green-600 font-medium">+{product.in}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {data.top_products_out.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <IconArrowDown className="h-4 w-4 text-red-500" />
                  Top Stock Out
                </h4>
                <div className="space-y-2">
                  {data.top_products_out.slice(0, 3).map((product) => (
                    <div key={product.id} className="flex items-center justify-between text-sm">
                      <span className="truncate text-muted-foreground">{product.name}</span>
                      <span className="text-red-600 font-medium">-{product.out}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  StockSummaryCards,
  LowStockAlerts,
  StockMovementChart,
  StockHistoryTable,
} from "@/components/inventory"
import {
  IconDashboard,
  IconHistory,
  IconAlertTriangle,
} from "@tabler/icons-react"

interface InventoryDashboardProps {
  canEdit?: boolean
}

export function InventoryDashboard({ canEdit = true }: InventoryDashboardProps) {
  return (
    <div className="px-4 lg:px-6 space-y-6">
      {/* Summary Cards */}
      <StockSummaryCards />

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <IconDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <IconAlertTriangle className="h-4 w-4" />
            Stock Alerts
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <IconHistory className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <StockMovementChart />
            <LowStockAlerts limit={8} />
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <LowStockAlerts limit={50} showViewAll={false} />
        </TabsContent>

        <TabsContent value="history">
          <StockHistoryTable title="All Stock Adjustments" />
        </TabsContent>
      </Tabs>
    </div>
  )
}


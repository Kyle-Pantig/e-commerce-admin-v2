"use client"

import { DashboardStats, SalesChart, TopProducts, InventoryAlerts, RecentOrders } from "@/components/dashboard"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"

export function DashboardContent() {
  return (
    <div className="space-y-6 pb-8">
      {/* Stats Cards */}
      <DashboardStats />

      {/* Sales Chart */}
      <div className="px-4 lg:px-6">
        <SalesChart />
      </div>

      {/* Three Column Section: Top Products, Inventory Alerts, Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 lg:px-6">
        <TopProducts />
        <InventoryAlerts />
        <RecentOrders />
      </div>

      {/* Total Visitors Chart (keeping for future implementation) */}
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
    </div>
  )
}


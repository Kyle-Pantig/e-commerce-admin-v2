import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"
import { InventoryWrapper } from "./inventory-wrapper"

export default async function InventoryPage() {
  const user = await getAuthenticatedUser()

  return (
    <AppLayout
      user={user}
      title="Inventory Management"
      description="Track stock levels, adjustments, and alerts"
    >
      <Suspense fallback={<LoadingState variant="centered" text="Loading..." />}>
        <InventoryWrapper />
      </Suspense>
    </AppLayout>
  )
}

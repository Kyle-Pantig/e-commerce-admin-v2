import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"
import { InventoryWrapper } from "./inventory-wrapper"
import { NoAccess } from "@/components/shared"

export default async function InventoryPage() {
  const user = await getAuthenticatedUser()

  // Check permission for inventory module
  const hasAccess = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.inventory && user.permissions.inventory !== "none")
  
  const canEdit = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.inventory === "edit")

  if (!hasAccess) {
    return (
      <AppLayout user={user} title="Inventory" description="Access Denied">
        <NoAccess module="Inventory" />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title="Inventory Management"
      description="Track stock levels, adjustments, and alerts"
    >
      <Suspense fallback={<LoadingState variant="centered" text="Loading..." />}>
        <InventoryWrapper canEdit={canEdit} />
      </Suspense>
    </AppLayout>
  )
}

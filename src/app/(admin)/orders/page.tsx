import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { OrdersTable } from "@/components/orders"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"
import { NoAccess } from "@/components/shared"

export default async function OrdersPage() {
  const user = await getAuthenticatedUser()

  // Check permission for orders module
  const hasAccess = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.orders && user.permissions.orders !== "none")
  
  const canEdit = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.orders === "edit")

  if (!hasAccess) {
    return (
      <AppLayout user={user} title="Orders" description="Access Denied">
        <NoAccess module="Orders" />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title="Order Management"
      description="Manage your orders"
    >
      <Suspense fallback={<LoadingState variant="centered" text="Loading orders..." />}>
        <OrdersTable currentUserRole={user.role} canEdit={canEdit} />
      </Suspense>
    </AppLayout>
  )
}


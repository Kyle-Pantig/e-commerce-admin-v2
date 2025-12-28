import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { OrdersTable } from "@/components/orders"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"

export default async function OrdersPage() {
  const user = await getAuthenticatedUser()

  return (
    <AppLayout
      user={user}
      title="Order Management"
      description="Manage your orders"
    >
      <Suspense fallback={<LoadingState variant="centered" text="Loading orders..." />}>
        <OrdersTable currentUserRole={user.role} />
      </Suspense>
    </AppLayout>
  )
}


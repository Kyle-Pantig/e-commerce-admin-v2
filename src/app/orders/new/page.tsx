import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { OrderForm } from "@/components/orders"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"

export default async function NewOrderPage() {
  const user = await getAuthenticatedUser()

  return (
    <AppLayout
      user={user}
      title="Create Order"
      description="Create a new order"
    >
      <Suspense fallback={<LoadingState variant="centered" text="Loading..." />}>
        <OrderForm currentUserRole={user.role} />
      </Suspense>
    </AppLayout>
  )
}

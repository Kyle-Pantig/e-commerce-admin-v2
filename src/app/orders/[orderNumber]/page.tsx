import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { OrderDetail } from "@/components/orders"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"

interface OrderPageProps {
  params: Promise<{ orderNumber: string }>
}

export default async function OrderPage({ params }: OrderPageProps) {
  const user = await getAuthenticatedUser()
  const { orderNumber } = await params

  return (
    <AppLayout
      user={user}
      title="Order Details"
      description="View and manage order"
    >
      <Suspense fallback={<LoadingState variant="centered" text="Loading order..." />}>
        <OrderDetail orderNumber={orderNumber} currentUserRole={user.role} />
      </Suspense>
    </AppLayout>
  )
}

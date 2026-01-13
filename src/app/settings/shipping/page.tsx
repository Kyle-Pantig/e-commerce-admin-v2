import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"
import { NoAccess } from "@/components/shared"
import { ShippingTable } from "@/components/shipping"

export default async function ShippingPage() {
  const user = await getAuthenticatedUser()

  // Check permission - using products permission for shipping
  const hasAccess = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.products && user.permissions.products !== "none")
  
  const canEdit = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.products === "edit")

  if (!hasAccess) {
    return (
      <AppLayout user={user} title="Shipping Rules" description="Access Denied">
        <NoAccess module="Shipping Rules" />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title="Shipping Rules"
      description="Manage shipping fees and free shipping thresholds"
    >
      <div className="px-4 lg:px-6 w-full">
        <Suspense fallback={<LoadingState variant="centered" text="Loading shipping rules..." />}>
          <ShippingTable canEdit={canEdit} />
        </Suspense>
      </div>
    </AppLayout>
  )
}

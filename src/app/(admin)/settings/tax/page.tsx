import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"
import { NoAccess } from "@/components/shared"
import { TaxTable } from "@/components/tax"

export default async function TaxPage() {
  const user = await getAuthenticatedUser()

  // Check permission - using products permission for tax
  const hasAccess = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.products && user.permissions.products !== "none")
  
  const canEdit = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.products === "edit")

  if (!hasAccess) {
    return (
      <AppLayout user={user} title="Tax Rules" description="Access Denied">
        <NoAccess module="Tax Rules" />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title="Tax Rules"
      description="Manage tax rates for your store"
    >
      <div className="px-4 lg:px-6 w-full">
        <Suspense fallback={<LoadingState variant="centered" text="Loading tax rules..." />}>
          <TaxTable canEdit={canEdit} />
        </Suspense>
      </div>
    </AppLayout>
  )
}

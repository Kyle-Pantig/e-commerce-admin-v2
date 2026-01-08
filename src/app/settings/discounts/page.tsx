import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"
import { NoAccess } from "@/components/shared"
import { DiscountsTable } from "@/components/discounts/discounts-table"

export default async function DiscountsPage() {
  const user = await getAuthenticatedUser()

  // Check permission - using products permission for now
  const hasAccess = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.products && user.permissions.products !== "none")
  
  const canEdit = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.products === "edit")

  if (!hasAccess) {
    return (
      <AppLayout user={user} title="Discount Codes" description="Access Denied">
        <NoAccess module="Discount Codes" />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title="Discount Codes"
      description="Create and manage promotional discount codes"
    >
      <Suspense fallback={<LoadingState variant="centered" text="Loading discounts..." />}>
        <DiscountsTable canEdit={canEdit} />
      </Suspense>
    </AppLayout>
  )
}


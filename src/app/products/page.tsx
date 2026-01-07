import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { ProductsTable } from "@/components/products"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"
import { NoAccess } from "@/components/shared"

export default async function ProductsPage() {
  const user = await getAuthenticatedUser()

  // Check permission for products module
  const hasAccess = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.products && user.permissions.products !== "none")
  
  const canEdit = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.products === "edit")

  if (!hasAccess) {
    return (
      <AppLayout user={user} title="Products" description="Access Denied">
        <NoAccess module="Products" />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title="Product Management"
      description="Manage your product catalog"
    >
      <Suspense fallback={<LoadingState variant="centered" text="Loading products..." />}>
        <ProductsTable currentUserRole={user.role} canEdit={canEdit} />
      </Suspense>
    </AppLayout>
  )
}


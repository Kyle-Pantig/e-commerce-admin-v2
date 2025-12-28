import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { ProductsTable } from "@/components/products"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"

export default async function ProductsPage() {
  const user = await getAuthenticatedUser()

  return (
    <AppLayout
      user={user}
      title="Product Management"
      description="Manage your product catalog"
    >
      <Suspense fallback={<LoadingState variant="centered" text="Loading products..." />}>
        <ProductsTable currentUserRole={user.role} />
      </Suspense>
    </AppLayout>
  )
}


import { getAuthenticatedUser } from "@/lib/auth"
import { CategoriesTable } from "@/components/categories"
import { AppLayout } from "@/components/app-layout"
import { NoAccess } from "@/components/shared"

export default async function CategoriesPage() {
  const user = await getAuthenticatedUser()

  // Check permission for categories module
  const hasAccess = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.categories && user.permissions.categories !== "none")
  
  const canEdit = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.categories === "edit")

  if (!hasAccess) {
    return (
      <AppLayout user={user} title="Categories" description="Access Denied">
        <NoAccess module="Categories" />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title="Category Management"
      description="Manage product categories and subcategories"
    >
      <CategoriesTable currentUserRole={user.role} canEdit={canEdit} />
    </AppLayout>
  )
}


import { getAuthenticatedUser } from "@/lib/auth"
import { CategoriesTable } from "@/components/categories"
import { AppLayout } from "@/components/app-layout"

export default async function CategoriesPage() {
  const user = await getAuthenticatedUser()

  return (
    <AppLayout
      user={user}
      title="Category Management"
      description="Manage product categories and subcategories"
    >
      <CategoriesTable currentUserRole={user.role} />
    </AppLayout>
  )
}


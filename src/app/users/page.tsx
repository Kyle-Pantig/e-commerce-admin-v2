import { getAuthenticatedUser } from "@/lib/auth"
import { UsersTable } from "@/components/users"
import { AppLayout } from "@/components/app-layout"

export default async function UsersPage() {
  const user = await getAuthenticatedUser()

  return (
    <AppLayout
      user={user}
      title="User Management"
      description="Manage user accounts, approve or decline access requests"
    >
      <UsersTable currentUserRole={user.role} />
    </AppLayout>
  )
}


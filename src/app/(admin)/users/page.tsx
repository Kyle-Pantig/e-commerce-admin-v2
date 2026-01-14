import { getAuthenticatedUser } from "@/lib/auth"
import { UsersTable } from "@/components/users"
import { AppLayout } from "@/components/app-layout"
import { NoAccess } from "@/components/shared"

export default async function UsersPage() {
  const user = await getAuthenticatedUser()

  // Check permission for users module (staff can view, only admin can edit)
  const hasAccess = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.users && user.permissions.users !== "none")
  
  // Only admin can edit users - staff can only view
  const canEdit = user.role === "ADMIN"

  if (!hasAccess) {
    return (
      <AppLayout user={user} title="Users" description="Access Denied">
        <NoAccess module="Users" />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title="User Management"
      description="Manage user accounts, approve or decline access requests"
    >
      <UsersTable currentUserRole={user.role} canEdit={canEdit} />
    </AppLayout>
  )
}


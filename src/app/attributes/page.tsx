import { getAuthenticatedUser } from "@/lib/auth"
import { AttributesTable } from "@/components/attributes"
import { AppLayout } from "@/components/app-layout"
import { NoAccess } from "@/components/shared"

export default async function AttributesPage() {
  const user = await getAuthenticatedUser()

  // Check permission for attributes module
  const hasAccess = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.attributes && user.permissions.attributes !== "none")
  
  const canEdit = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.attributes === "edit")

  if (!hasAccess) {
    return (
      <AppLayout user={user} title="Attributes" description="Access Denied">
        <NoAccess module="Attributes" />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title="Attribute Management"
      description="Manage product attributes and specifications"
    >
      <AttributesTable currentUserRole={user.role} canEdit={canEdit} />
    </AppLayout>
  )
}


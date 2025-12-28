import { getAuthenticatedUser } from "@/lib/auth"
import { AttributesTable } from "@/components/attributes"
import { AppLayout } from "@/components/app-layout"

export default async function AttributesPage() {
  const user = await getAuthenticatedUser()

  return (
    <AppLayout
      user={user}
      title="Attribute Management"
      description="Manage product attributes and specifications"
    >
      <AttributesTable currentUserRole={user.role} />
    </AppLayout>
  )
}


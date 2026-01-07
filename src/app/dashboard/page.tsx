import { getAuthenticatedUser } from "@/lib/auth"
import { AppLayout } from "@/components/app-layout"
import { DashboardContent } from "./dashboard-content"
import { NoAccess } from "@/components/shared"

export default async function Page() {
  const user = await getAuthenticatedUser()

  // Check permission for analytics/dashboard module
  const hasAccess = user.role === "ADMIN" || 
    (user.role === "STAFF" && user.permissions?.analytics && user.permissions.analytics !== "none")

  if (!hasAccess) {
    return (
      <AppLayout user={user} title="Dashboard" description="Access Denied">
        <NoAccess module="Dashboard" />
      </AppLayout>
    )
  }

  return (
    <AppLayout user={user}>
      <DashboardContent />
    </AppLayout>
  )
}

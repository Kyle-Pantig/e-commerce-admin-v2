import { getAuthenticatedUser } from "@/lib/auth"
import { AppLayout } from "@/components/app-layout"
import { DashboardContent } from "./dashboard-content"

export default async function Page() {
  const user = await getAuthenticatedUser()

  return (
    <AppLayout user={user}>
      <DashboardContent />
    </AppLayout>
  )
}

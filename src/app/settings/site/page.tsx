import { Suspense } from "react"
import { getAuthenticatedUser } from "@/lib/auth"
import { NoAccess } from "@/components/shared"
import { AppLayout } from "@/components/app-layout"
import { SiteSettingsContent } from "./site-settings-content"
import { Skeleton } from "@/components/ui/skeleton"

export default async function SiteSettingsPage() {
  const user = await getAuthenticatedUser()

  // Check permission - using products permission for site content
  const hasAccess =
    user.role === "ADMIN" ||
    (user.role === "STAFF" && user.permissions?.products && user.permissions.products !== "none")

  if (!hasAccess) {
    return (
      <AppLayout user={user} title="Site Settings" description="Access Denied">
        <NoAccess module="Site Settings" />
      </AppLayout>
    )
  }

  return (
    <AppLayout user={user} title="Site Settings" description="Manage your website content">
      <Suspense fallback={<SiteSettingsLoading />}>
        <SiteSettingsContent />
      </Suspense>
    </AppLayout>
  )
}

function SiteSettingsLoading() {
  return (
    <div className="px-4 lg:px-6 w-full space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-[200px] w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
}

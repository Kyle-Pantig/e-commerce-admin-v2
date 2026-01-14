"use client"

import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { AppLayout } from "@/components/app-layout"
import { useEffect, useState } from "react"
import type { UserData } from "@/lib/auth"
import { LoadingState } from "@/components/ui/loading-state"
import { NoAccess } from "@/components/shared"
import { createClient } from "@/lib/supabase/client"
import { usersApi } from "@/lib/api/services/users"
import { DiscountCodeForm } from "@/components/discounts"

export default function NewDiscountPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<UserData | null>(null)
  const [canEdit, setCanEdit] = useState<boolean | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        try {
          const userInfo = await usersApi.me()
          const role = userInfo.role
          const permissions = userInfo.permissions
          
          // Check edit permission
          const hasEditPermission = role === "ADMIN" || 
            (role === "STAFF" && permissions?.discounts === "edit")
          setCanEdit(hasEditPermission)
          
          setUser({
            id: authUser.id,
            email: authUser.email || "",
            name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
            avatar: authUser.user_metadata?.avatar_url,
            role: userInfo.role || undefined,
            isApproved: userInfo.is_approved || undefined,
            permissions: userInfo.permissions || undefined,
          })
        } catch (error) {
          setCanEdit(false)
          setUser({
            id: authUser.id,
            email: authUser.email || "",
            name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
            avatar: authUser.user_metadata?.avatar_url,
          })
        }
      }
    }
    loadUser()
  }, [])

  // If permission check is complete and user doesn't have edit permission
  if (canEdit === false) {
    return (
      <AppLayout user={user} title="Access Denied" description="Create Discount">
        <NoAccess 
          module="Discounts" 
          description="You don't have permission to create discount codes. Contact your administrator for access."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title="Create Discount Code"
      description="Add a new promotional discount code"
    >
      <div className="px-4 lg:px-6 w-full">
        <div className="w-full">
          {!user || canEdit === null ? (
            <LoadingState variant="centered" text="Initializing..." />
          ) : (
            <DiscountCodeForm
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["discounts"] })
                router.push("/settings/discounts")
              }}
              onCancel={() => router.push("/settings/discounts")}
            />
          )}
        </div>
      </div>
    </AppLayout>
  )
}


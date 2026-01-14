"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"
import { NoAccess } from "@/components/shared"
import { TaxRuleForm } from "@/components/tax"
import { createClient } from "@/lib/supabase/client"
import { usersApi } from "@/lib/api/services/users"
import type { UserData } from "@/lib/auth"

export default function NewTaxRulePage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [canEdit, setCanEdit] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
            (role === "STAFF" && permissions?.products === "edit")
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
      setIsLoading(false)
    }
    loadUser()
  }, [])

  if (isLoading || !user) {
    return (
      <AppLayout user={null} title="New Tax Rule">
        <LoadingState variant="centered" text="Loading..." />
      </AppLayout>
    )
  }

  if (canEdit === false) {
    return (
      <AppLayout user={user} title="Access Denied" description="New Tax Rule">
        <NoAccess 
          module="Tax Rules" 
          description="You don't have permission to create tax rules."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title="New Tax Rule"
      description="Create a new tax rule"
    >
      <div className="px-4 lg:px-6 w-full">
        <TaxRuleForm />
      </div>
    </AppLayout>
  )
}

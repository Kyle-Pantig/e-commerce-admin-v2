"use client"

import { use, useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AppLayout } from "@/components/app-layout"
import { LoadingState } from "@/components/ui/loading-state"
import { NoAccess } from "@/components/shared"
import { ShippingRuleForm } from "@/components/shipping"
import { createClient } from "@/lib/supabase/client"
import { usersApi } from "@/lib/api/services/users"
import { shippingApi, type ShippingRule } from "@/lib/api"
import type { UserData } from "@/lib/auth"

interface EditShippingRulePageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditShippingRulePage({ params }: EditShippingRulePageProps) {
  const { id } = use(params)
  const [user, setUser] = useState<UserData | null>(null)
  const [canEdit, setCanEdit] = useState<boolean | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

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
      setIsLoadingUser(false)
    }
    loadUser()
  }, [])

  // Fetch shipping rule
  const { data: rule, isLoading: isLoadingRule, error } = useQuery<ShippingRule>({
    queryKey: ["shipping-rule", id],
    queryFn: () => shippingApi.get(id),
    enabled: !!id,
  })

  const isLoading = isLoadingUser || isLoadingRule

  if (isLoading || !user) {
    return (
      <AppLayout user={null} title="Edit Shipping Rule">
        <LoadingState variant="centered" text="Loading shipping rule..." />
      </AppLayout>
    )
  }

  if (canEdit === false) {
    return (
      <AppLayout user={user} title="Access Denied" description="Edit Shipping Rule">
        <NoAccess 
          module="Shipping Rules" 
          description="You don't have permission to edit shipping rules."
        />
      </AppLayout>
    )
  }

  if (error || !rule) {
    return (
      <AppLayout user={user} title="Not Found" description="Edit Shipping Rule">
        <div className="px-4 lg:px-6 w-full">
          <div className="text-center py-8">
            <p className="text-destructive">Shipping rule not found</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title={`Edit: ${rule.name}`}
      description="Update shipping rule details"
    >
      <div className="px-4 lg:px-6 w-full">
        <ShippingRuleForm rule={rule} />
      </div>
    </AppLayout>
  )
}

"use client"

import { useRouter, useParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AppLayout } from "@/components/app-layout"
import { useEffect, useState } from "react"
import type { UserData } from "@/lib/auth"
import { LoadingState } from "@/components/ui/loading-state"
import { NoAccess } from "@/components/shared"
import { createClient } from "@/lib/supabase/client"
import { usersApi } from "@/lib/api/services/users"
import { discountsApi } from "@/lib/api"
import { DiscountCodeForm } from "@/components/discounts"

export default function EditDiscountPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const discountId = params.id as string
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

  // Fetch discount data
  const { data: discount, isLoading: isDiscountLoading } = useQuery({
    queryKey: ["discount", discountId],
    queryFn: () => discountsApi.get(discountId),
    enabled: !!discountId,
  })

  // If permission check is complete and user doesn't have edit permission
  if (canEdit === false) {
    return (
      <AppLayout user={user} title="Access Denied" description="Edit Discount">
        <NoAccess 
          module="Discounts" 
          description="You don't have permission to edit discount codes. Contact your administrator for access."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title={discount ? `Edit: ${discount.code}` : "Edit Discount Code"}
      description="Update discount code settings"
    >
      <div className="px-4 lg:px-6 w-full">
        <div className="w-full">
          {!user || canEdit === null || isDiscountLoading ? (
            <LoadingState variant="centered" text="Loading discount..." />
          ) : !discount ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Discount code not found</p>
            </div>
          ) : (
            <DiscountCodeForm
              discount={discount}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["discounts"] })
                queryClient.invalidateQueries({ queryKey: ["discount", discountId] })
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


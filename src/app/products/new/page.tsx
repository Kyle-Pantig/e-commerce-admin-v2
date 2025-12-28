"use client"

import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ProductForm } from "@/components/products"
import { createClient } from "@/lib/supabase/client"
import { AppLayout } from "@/components/app-layout"
import { useEffect, useState } from "react"
import type { UserData } from "@/lib/auth"
import { LoadingState } from "@/components/ui/loading-state"

// Import shared API services and types
import { productsApi } from "@/lib/api/services/products"
import { categoriesApi } from "@/lib/api/services/categories"
import { usersApi } from "@/lib/api/services/users"
import type { Category, ProductCreate } from "@/lib/api/types"

export default function NewProductPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        try {
          const userInfo = await usersApi.me()
          setUser({
            id: authUser.id,
            email: authUser.email || "",
            name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
            avatar: authUser.user_metadata?.avatar_url,
            role: userInfo.role || undefined,
            isApproved: userInfo.is_approved || undefined,
          })
        } catch (error) {
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

  // Fetch categories using shared API
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
  } = useQuery<Category[], Error>({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list({ include_inactive: true }),
    retry: 1,
  })

  // Create mutation using shared API
  const createMutation = useMutation({
    mutationFn: (data: ProductCreate) => productsApi.create(data),
    onSuccess: () => {
      toast.success("Product created successfully")
      queryClient.invalidateQueries({ queryKey: ["products"] })
      router.push("/products")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create product")
    },
  })

  return (
    <AppLayout
      user={user}
      title="Create New Product"
      description="Add a new product to your catalog"
    >
      <div className="px-4 lg:px-6 w-full">
        <div className="w-full">
          {!user ? (
            <LoadingState variant="centered" text="Initializing editor..." />
          ) : (
            <ProductForm
              categories={categories}
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => router.push("/products")}
              isLoading={createMutation.isPending}
              isCategoriesLoading={isCategoriesLoading}
            />
          )}
        </div>
      </div>
    </AppLayout>
  )
}

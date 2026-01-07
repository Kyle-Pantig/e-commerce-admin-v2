"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { use, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { IconArrowLeft, IconPackage, IconLoader2, IconEye } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { ProductForm } from "@/components/products"
import { createClient } from "@/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"
import { AppLayout } from "@/components/app-layout"
import { useEffect, useState } from "react"
import type { UserData } from "@/lib/auth"
import { LoadingState } from "@/components/ui/loading-state"
import { NoAccess } from "@/components/shared"

// Import shared API services and types
import { productsApi } from "@/lib/api/services/products"
import { categoriesApi } from "@/lib/api/services/categories"
import { usersApi } from "@/lib/api/services/users"
import type { Product, Category } from "@/lib/api/types"

interface EditProductPageProps {
  params: Promise<{
    slug: string
  }>
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { slug } = use(params)
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
    }
    loadUser()
  }, [])

  // Fetch product by slug using shared API
  const {
    data: product,
    isLoading: isProductLoading,
    error: productError,
  } = useQuery<Product, Error>({
    queryKey: ["product", "slug", slug],
    queryFn: () => productsApi.getBySlug(slug),
    retry: 1,
  })

  // Fetch categories using shared API
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
  } = useQuery<Category[], Error>({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list({ include_inactive: true }),
    retry: 1,
  })

  // Update mutation using shared API
  const updateMutation = useMutation({
    mutationFn: (data: any) => productsApi.update(product!.id, data),
    onSuccess: () => {
      toast.success("Product updated successfully")
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product", "slug", slug] })
      router.push("/products")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update product")
    },
  })

  const previewButton = useMemo(() => {
    if (!product) return null
    return (
      <Button variant="outline" size="sm" asChild className="gap-2">
        <Link href={`/products/${product.slug}`} target="_blank">
          <IconEye className="h-4 w-4" />
          Preview
        </Link>
      </Button>
    )
  }, [product])

  // If permission check is complete and user doesn't have edit permission
  if (canEdit === false) {
    return (
      <AppLayout user={user} title="Access Denied" description="Edit Product">
        <NoAccess 
          module="Products" 
          description="You don't have permission to edit products. Contact your administrator for access."
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      user={user}
      title={isProductLoading ? "Loading..." : (product?.name || "Product")}
      description="Update product information and attributes"
      actions={previewButton}
    >
      <div className="px-4 lg:px-6 w-full">
        <div className="w-full">
          {!user || isProductLoading || canEdit === null ? (
            <LoadingState 
              variant="centered" 
              text="Retrieving product data..." 
            />
          ) : product ? (
            <ProductForm
              categories={categories}
              product={product}
              onSubmit={(data) => updateMutation.mutate(data)}
              onCancel={() => router.push("/products")}
              isLoading={updateMutation.isPending}
              isCategoriesLoading={isCategoriesLoading}
            />
          ) : null}
        </div>
      </div>
    </AppLayout>
  )
}


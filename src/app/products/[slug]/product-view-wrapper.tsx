"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

// Dynamic import to prevent SSR - useQuery needs QueryClientProvider which is client-side only
const ProductView = dynamic(
  () => import("@/components/products/product-view").then((mod) => mod.ProductView),
  {
    ssr: false,
    loading: () => (
      <div className="px-4 lg:px-6">
        <Skeleton className="h-10 w-40 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="w-20 h-20 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    ),
  }
)

interface ProductViewWrapperProps {
  slug: string
  currentUserRole?: string
}

export function ProductViewWrapper({ slug, currentUserRole }: ProductViewWrapperProps) {
  return <ProductView slug={slug} currentUserRole={currentUserRole} />
}


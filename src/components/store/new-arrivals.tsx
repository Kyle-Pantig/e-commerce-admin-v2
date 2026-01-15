"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { productsApi } from "@/lib/api/services/products"
import { ProductCard, ProductCardSkeleton } from "./product-card"

export function NewArrivals() {
  const { data, isLoading } = useQuery({
    queryKey: ["products", "new-arrivals"],
    queryFn: () => productsApi.listPublic({ is_new: true, per_page: 8, sort_by: "created_at", sort_order: "desc" }),
  })

  const products = data?.items || []

  if (isLoading) {
    return (
      <section className="py-12">
        <h2 className="text-2xl font-bold mb-8 text-center">New Arrivals</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">New Arrivals</h2>
        <Link 
          href="/shop?new=true" 
          className="text-sm font-medium text-primary hover:underline"
        >
          View All
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.slice(0, 8).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

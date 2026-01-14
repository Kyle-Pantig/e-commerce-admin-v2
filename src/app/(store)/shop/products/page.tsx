"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { IconShoppingCart } from "@tabler/icons-react"
import { productsApi } from "@/lib/api"
import { MaxWidthLayout, ProductCard, ProductCardSkeleton } from "@/components/store"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const SORT_OPTIONS = [
  { value: "newest-desc", label: "Newest First" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
]

export default function ShopProductsPage() {
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState("newest-desc")
  const perPage = 12

  // Parse sort option
  const [sortField, sortOrder] = sortBy.split("-") as [string, "asc" | "desc"]

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products", "public", "all", page, sortField, sortOrder],
    queryFn: () => productsApi.listPublic({
      page,
      per_page: perPage,
      sort_by: sortField as "newest" | "name" | "price",
      sort_order: sortOrder,
    }),
    staleTime: 2 * 60 * 1000,
  })

  const products = productsData?.items ?? []
  const totalPages = productsData?.total_pages ?? 1
  const totalProducts = productsData?.total ?? 0

  return (
    <MaxWidthLayout className="py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-foreground transition-colors">
          Shop
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">All Products</span>
      </nav>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Products</h1>
        <p className="text-muted-foreground">
          Browse our complete collection of products
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <p className="text-sm text-muted-foreground">
          {totalProducts} {totalProducts === 1 ? "product" : "products"} found
        </p>
        <div className="flex items-center gap-4">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <IconShoppingCart className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No products yet</h2>
          <p className="text-muted-foreground">
            Check back soon for new arrivals!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </MaxWidthLayout>
  )
}

"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { IconShoppingCart } from "@tabler/icons-react"
import { productsApi, categoriesApi } from "@/lib/api"
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

export default function ShopCategoryPage() {
  const params = useParams()
  const slug = params.slug as string
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState("newest-desc")
  const perPage = 12

  // Parse sort option
  const [sortField, sortOrder] = sortBy.split("-") as [string, "asc" | "desc"]

  // Fetch category info
  const { data: categories } = useQuery({
    queryKey: ["categories", "public"],
    queryFn: () => categoriesApi.listPublic(),
    staleTime: 5 * 60 * 1000,
  })

  // Find current category from the tree
  const currentCategory = useMemo(() => {
    if (!categories) return null
    
    const findCategory = (cats: typeof categories, targetSlug: string): typeof categories[0] | null => {
      for (const cat of cats) {
        if (cat.slug === targetSlug) return cat
        if (cat.children && cat.children.length > 0) {
          const found = findCategory(cat.children, targetSlug)
          if (found) return found
        }
      }
      return null
    }
    
    return findCategory(categories, slug)
  }, [categories, slug])

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", "public", slug, page, sortField, sortOrder],
    queryFn: () => productsApi.listPublic({
      category_slug: slug,
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
    <>
      {/* Hero Cover Section */}
      <div className="relative w-full h-[280px] md:h-[360px] overflow-hidden bg-muted">
        {currentCategory?.image ? (
          <Image
            src={currentCategory.image}
            alt={currentCategory.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
            {currentCategory?.name ?? "Category"}
          </h1>
          {currentCategory?.description && (
            <p className="text-white/90 text-lg md:text-xl max-w-2xl">
              {currentCategory.description}
            </p>
          )}
          
          {/* Child Categories */}
          {currentCategory?.children && currentCategory.children.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {currentCategory.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/shop/${child.slug}`}
                  className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium backdrop-blur-sm transition-all"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <MaxWidthLayout className="py-8">
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
      {productsLoading ? (
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
          <h2 className="text-xl font-semibold mb-2">No products found</h2>
          <p className="text-muted-foreground mb-4">
            There are no products in this category yet.
          </p>
          <Link href="/shop">
            <Button>Browse All Products</Button>
          </Link>
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
    </>
  )
}

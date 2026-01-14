"use client"

import { useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { IconArrowRight } from "@tabler/icons-react"
import { categoriesApi, type Category } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface ShopByCategoryProps {
  title?: string
  maxItems?: number
  showViewAll?: boolean
  className?: string
}

export function ShopByCategory({ 
  title = "Shop by Category", 
  maxItems = 4,
  showViewAll = true,
  className 
}: ShopByCategoryProps) {
  // Fetch categories from public endpoint
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories", "public"],
    queryFn: () => categoriesApi.listPublic(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Flatten and limit categories for display
  const displayCategories = useMemo(() => {
    if (!categories || categories.length === 0) return []
    
    // Get root-level categories first, then can include some children if needed
    const rootCategories = categories.filter(cat => cat.is_active)
    
    // If we have enough root categories, use those
    if (rootCategories.length >= maxItems) {
      return rootCategories.slice(0, maxItems)
    }
    
    // Otherwise, flatten to include some subcategories
    const flattened: Category[] = []
    const addCategories = (cats: Category[]) => {
      for (const cat of cats) {
        if (flattened.length >= maxItems) break
        if (cat.is_active) {
          flattened.push(cat)
          if (cat.children && cat.children.length > 0) {
            addCategories(cat.children)
          }
        }
      }
    }
    addCategories(categories)
    
    return flattened.slice(0, maxItems)
  }, [categories, maxItems])

  // Check if there are more categories than displayed
  const hasMoreCategories = useMemo(() => {
    if (!categories) return false
    // Count total categories including children
    const countCategories = (cats: Category[]): number => {
      return cats.reduce((count, cat) => {
        const childCount = cat.children ? countCategories(cat.children) : 0
        return count + 1 + childCount
      }, 0)
    }
    return countCategories(categories) > maxItems
  }, [categories, maxItems])

  // Loading skeleton
  if (isLoading) {
    return (
      <section className={cn("py-12", className)}>
        <h2 className="text-2xl font-bold mb-8 text-center">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-square rounded-lg" />
            </div>
          ))}
        </div>
        {showViewAll && <Skeleton className="h-5 w-24 mx-auto mt-8" />}
      </section>
    )
  }

  // No categories found
  if (!displayCategories || displayCategories.length === 0) {
    return null
  }

  return (
    <section className={cn("py-12", className)}>
      <h2 className="text-2xl font-bold mb-8 text-center">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {displayCategories.map((category) => (
          <Link
            key={category.id}
            href={`/shop/${category.slug}`}
            className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
          >
            {category.image ? (
              <>
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                {/* Category Name */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-medium text-white drop-shadow-lg">
                    {category.name}
                  </span>
                </div>
              </>
            ) : (
              // No image - simple background
              <div className="absolute inset-0 flex items-center justify-center bg-muted group-hover:bg-muted/80 transition-colors">
                <span className="text-lg font-medium">{category.name}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
      {showViewAll && hasMoreCategories && (
        <div className="flex justify-center mt-8">
          <Link 
            href="/categories" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
          >
            View All Categories
            <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </section>
  )
}

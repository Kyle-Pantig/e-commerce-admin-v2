"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { 
  IconShoppingCart, 
  IconFilter, 
  IconX,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react"
import { productsApi, categoriesApi } from "@/lib/api"
import { MaxWidthLayout, ProductCard, ProductCardSkeleton } from "@/components/store"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useShopFilters } from "@/stores"

const SORT_OPTIONS = [
  { value: "newest-desc", label: "Newest First" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
]

const PRICE_RANGES = [
  { label: "Under $25", min: 0, max: 25 },
  { label: "$25 - $50", min: 25, max: 50 },
  { label: "$50 - $100", min: 50, max: 100 },
  { label: "$100 - $200", min: 100, max: 200 },
  { label: "Over $200", min: 200, max: 10000 },
]

export default function ShopCategoryPage() {
  const params = useParams()
  const slug = params.slug as string
  
  // Use Zustand store for shared filter state
  const {
    sortBy,
    priceRange,
    showOnSale,
    showInStock,
    page,
    priceOpen,
    availabilityOpen,
    setSortBy,
    setPriceRange,
    setShowOnSale,
    setShowInStock,
    setPage,
    setPriceOpen,
    setAvailabilityOpen,
  } = useShopFilters()

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  
  // Local slider state for smooth sliding, synced with store
  const [sliderValue, setSliderValue] = useState<[number, number]>(priceRange)
  const [debouncedPriceRange, setDebouncedPriceRange] = useState<[number, number]>(priceRange)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  
  // Sync slider with store when store changes
  useEffect(() => {
    setSliderValue(priceRange)
    setDebouncedPriceRange(priceRange)
  }, [priceRange])
  
  // Debounce slider changes and update store
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedPriceRange(sliderValue)
      if (sliderValue[0] !== priceRange[0] || sliderValue[1] !== priceRange[1]) {
        setPriceRange(sliderValue)
      }
    }, 500)
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [sliderValue, priceRange, setPriceRange])
  
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
    queryKey: ["products", "public", slug, page, sortField, sortOrder, debouncedPriceRange, showOnSale, showInStock],
    queryFn: () => productsApi.listPublic({
      category_slug: slug,
      page,
      per_page: perPage,
      sort_by: sortField as "newest" | "name" | "price",
      sort_order: sortOrder,
    }),
    staleTime: 2 * 60 * 1000,
  })

  // Filter products on frontend based on active filters
  const filteredProducts = useMemo(() => {
    let items = productsData?.items ?? []
    
    // Filter by price range
    if (debouncedPriceRange[0] > 0 || debouncedPriceRange[1] < 1000) {
      items = items.filter(product => {
        const effectivePrice = product.sale_price && product.sale_price > 0 
          ? product.sale_price 
          : product.base_price
        return effectivePrice >= debouncedPriceRange[0] && effectivePrice <= debouncedPriceRange[1]
      })
    }
    
    // Filter by on sale (matching ProductCard logic exactly)
    if (showOnSale) {
      items = items.filter(product => {
        const activeVariants = product.has_variants && product.variants && product.variants.length > 0
          ? product.variants.filter(v => v.is_active)
          : []
        
        const hasVariants = activeVariants.length > 0
        
        if (hasVariants) {
          return activeVariants.some(v => {
            const basePrice = v.price ?? 0
            const salePrice = v.sale_price ?? 0
            return salePrice > 0 && basePrice > 0 && salePrice < basePrice
          })
        } else {
          return product.sale_price != null && product.sale_price > 0 && product.sale_price < product.base_price
        }
      })
    }
    
    // Filter by in stock
    if (showInStock) {
      items = items.filter(product => {
        if (product.has_variants && product.variants) {
          return product.variants.some(v => v.is_active && v.stock > 0)
        }
        return product.stock > 0
      })
    }
    
    return items
  }, [productsData?.items, debouncedPriceRange, showOnSale, showInStock])

  const products = filteredProducts
  const totalPages = productsData?.total_pages ?? 1

  // Clear only price/availability filters (not category - that's from URL)
  const clearCategoryFilters = () => {
    setPriceRange([0, 1000])
    setShowOnSale(false)
    setShowInStock(false)
    setPage(1)
  }

  const hasActiveFilters = showOnSale || showInStock || priceRange[0] > 0 || priceRange[1] < 1000

  // Memoized slider change handler for smooth sliding
  const handleSliderChange = useCallback((value: number[]) => {
    setSliderValue(value as [number, number])
  }, [])

  // Collapsible state for subcategories
  const [subcategoriesOpen, setSubcategoriesOpen] = useState(true)

  // Filter sidebar content as JSX (not a component to avoid re-mounting)
  const filterContent = (
    <div className="space-y-6">
      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearCategoryFilters}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <IconX className="w-4 h-4 mr-2" />
          Clear all filters
        </Button>
      )}

      {/* Subcategories */}
      {currentCategory?.children && currentCategory.children.length > 0 && (
        <>
          <Collapsible open={subcategoriesOpen} onOpenChange={setSubcategoriesOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-sm">
              Subcategories
              {subcategoriesOpen ? (
                <IconChevronUp className="w-4 h-4" />
              ) : (
                <IconChevronDown className="w-4 h-4" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1">
              {currentCategory.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/shop/${child.slug}`}
                  className="block py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {child.name}
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>
          <Separator />
        </>
      )}

      {/* Price Range */}
      <Collapsible open={priceOpen} onOpenChange={setPriceOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-sm">
          Price Range
          {priceOpen ? (
            <IconChevronUp className="w-4 h-4" />
          ) : (
            <IconChevronDown className="w-4 h-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <Slider
            value={sliderValue}
            onValueChange={handleSliderChange}
            min={0}
            max={1000}
            step={1}
            minStepsBetweenThumbs={1}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>${sliderValue[0]}</span>
            <span>${sliderValue[1] === 1000 ? "1000+" : sliderValue[1]}</span>
          </div>
          <div className="space-y-2">
            {PRICE_RANGES.map((range) => (
              <div key={range.label} className="flex items-center space-x-2">
                <Checkbox
                  id={`price-${range.label}`}
                  checked={sliderValue[0] === range.min && sliderValue[1] === range.max}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSliderValue([range.min, range.max])
                    } else {
                      setSliderValue([0, 1000])
                    }
                  }}
                />
                <Label 
                  htmlFor={`price-${range.label}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {range.label}
                </Label>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Availability */}
      <Collapsible open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-sm">
          Availability
          {availabilityOpen ? (
            <IconChevronUp className="w-4 h-4" />
          ) : (
            <IconChevronDown className="w-4 h-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="in-stock"
              checked={showInStock}
              onCheckedChange={(checked) => setShowInStock(checked as boolean)}
            />
            <Label htmlFor="in-stock" className="text-sm font-normal cursor-pointer">
              In Stock Only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="on-sale"
              checked={showOnSale}
              onCheckedChange={(checked) => setShowOnSale(checked as boolean)}
            />
            <Label htmlFor="on-sale" className="text-sm font-normal cursor-pointer">
              On Sale
            </Label>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )

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
        </div>
      </div>

      <MaxWidthLayout className="py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <h2 className="font-semibold mb-4">Filters</h2>
              {filterContent}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b gap-4">
              <div className="flex items-center gap-4">
                {/* Mobile Filter Button */}
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <IconFilter className="w-4 h-4 mr-2" />
                      Filters
                      {hasActiveFilters && (
                        <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {(showOnSale ? 1 : 0) + (showInStock ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < 1000 ? 1 : 0)}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 overflow-y-auto px-6">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 pr-2">
                      {filterContent}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

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

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {showOnSale && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowOnSale(false)}
                    className="h-7 text-xs"
                  >
                    On Sale
                    <IconX className="w-3 h-3 ml-1" />
                  </Button>
                )}
                {showInStock && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowInStock(false)}
                    className="h-7 text-xs"
                  >
                    In Stock
                    <IconX className="w-3 h-3 ml-1" />
                  </Button>
                )}
                {(priceRange[0] > 0 || priceRange[1] < 1000) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPriceRange([0, 1000])}
                    className="h-7 text-xs"
                  >
                    ${priceRange[0]} - ${priceRange[1] === 1000 ? "1000+" : priceRange[1]}
                    <IconX className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            )}

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
                  {hasActiveFilters 
                    ? "Try adjusting your filters." 
                    : "There are no products in this category yet."}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={clearCategoryFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <Link href="/shop">
                    <Button>Browse All Products</Button>
                  </Link>
                )}
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
                      onClick={() => setPage(Math.max(1, page - 1))}
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
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </MaxWidthLayout>
    </>
  )
}

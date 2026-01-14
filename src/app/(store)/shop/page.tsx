"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
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
import { cn } from "@/lib/utils"

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

export default function ShopPage() {
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState("newest-desc")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showOnSale, setShowOnSale] = useState(false)
  const [showInStock, setShowInStock] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  
  // Price range - local state for smooth slider, debounced for API
  const [sliderValue, setSliderValue] = useState<[number, number]>([0, 1000])
  const [debouncedPriceRange, setDebouncedPriceRange] = useState<[number, number]>([0, 1000])
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  
  // Debounce price range changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedPriceRange(sliderValue)
    }, 500)
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [sliderValue])
  
  // Collapsible states
  const [categoriesOpen, setCategoriesOpen] = useState(true)
  const [priceOpen, setPriceOpen] = useState(true)
  const [availabilityOpen, setAvailabilityOpen] = useState(true)
  
  const perPage = 12

  // Parse sort option
  const [sortField, sortOrder] = sortBy.split("-") as [string, "asc" | "desc"]

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories", "public"],
    queryFn: () => categoriesApi.listPublic(),
    staleTime: 5 * 60 * 1000,
  })

  // Flatten categories for filter display
  const flatCategories = useMemo(() => {
    if (!categories) return []
    
    const flatten = (cats: typeof categories, depth = 0): { id: string; name: string; slug: string; depth: number }[] => {
      const result: { id: string; name: string; slug: string; depth: number }[] = []
      for (const cat of cats) {
        result.push({ id: cat.id, name: cat.name, slug: cat.slug, depth })
        if (cat.children && cat.children.length > 0) {
          result.push(...flatten(cat.children, depth + 1))
        }
      }
      return result
    }
    
    return flatten(categories)
  }, [categories])

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["products", "public", "all", page, sortField, sortOrder, selectedCategories, debouncedPriceRange, showOnSale, showInStock],
    queryFn: () => productsApi.listPublic({
      page,
      per_page: perPage,
      sort_by: sortField as "newest" | "name" | "price",
      sort_order: sortOrder,
      category_slug: selectedCategories.length === 1 ? selectedCategories[0] : undefined,
    }),
    staleTime: 2 * 60 * 1000,
  })

  // Filter products on frontend based on active filters
  const filteredProducts = useMemo(() => {
    let items = productsData?.items ?? []
    
    // Filter by price range
    if (debouncedPriceRange[0] > 0 || debouncedPriceRange[1] < 1000) {
      items = items.filter(product => {
        // Get the effective price (sale price if exists, otherwise base price)
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
          // Check if any active variant has a valid sale
          return activeVariants.some(v => {
            const basePrice = v.price ?? 0
            const salePrice = v.sale_price ?? 0
            return salePrice > 0 && basePrice > 0 && salePrice < basePrice
          })
        } else {
          // Non-variant product: check if sale_price exists and is less than base_price
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
  const totalProducts = filteredProducts.length

  const handleCategoryToggle = (slug: string) => {
    setSelectedCategories(prev => 
      prev.includes(slug) 
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    )
    setPage(1)
  }

  const clearAllFilters = () => {
    setSelectedCategories([])
    setSliderValue([0, 1000])
    setDebouncedPriceRange([0, 1000])
    setShowOnSale(false)
    setShowInStock(false)
    setPage(1)
  }

  const hasActiveFilters = selectedCategories.length > 0 || showOnSale || showInStock || sliderValue[0] > 0 || sliderValue[1] < 1000

  // Memoized slider change handler for smooth sliding
  const handleSliderChange = useCallback((value: number[]) => {
    setSliderValue(value as [number, number])
  }, [])

  // Filter sidebar content as JSX (not a component to avoid re-mounting)
  const filterContent = (
    <div className="space-y-6">
      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearAllFilters}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <IconX className="w-4 h-4 mr-2" />
          Clear all filters
        </Button>
      )}

      {/* Categories */}
      <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-sm">
          Categories
          {categoriesOpen ? (
            <IconChevronUp className="w-4 h-4" />
          ) : (
            <IconChevronDown className="w-4 h-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {flatCategories.map((cat) => (
            <div 
              key={cat.id} 
              className="flex items-center space-x-2"
              style={{ paddingLeft: `${cat.depth * 16}px` }}
            >
              <Checkbox
                id={`cat-${cat.id}`}
                checked={selectedCategories.includes(cat.slug)}
                onCheckedChange={() => handleCategoryToggle(cat.slug)}
              />
              <Label 
                htmlFor={`cat-${cat.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {cat.name}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

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
    <MaxWidthLayout className="py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Products</h1>
        <p className="text-muted-foreground">
          Browse our complete collection of products
        </p>
      </div>

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
                        {selectedCategories.length + (showOnSale ? 1 : 0) + (showInStock ? 1 : 0)}
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
              {selectedCategories.map((slug) => {
                const cat = flatCategories.find(c => c.slug === slug)
                return cat ? (
                  <Button
                    key={slug}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCategoryToggle(slug)}
                    className="h-7 text-xs"
                  >
                    {cat.name}
                    <IconX className="w-3 h-3 ml-1" />
                  </Button>
                ) : null
              })}
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
              {(sliderValue[0] > 0 || sliderValue[1] < 1000) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSliderValue([0, 1000])
                    setDebouncedPriceRange([0, 1000])
                  }}
                  className="h-7 text-xs"
                >
                  ${sliderValue[0]} - ${sliderValue[1] === 1000 ? "1000+" : sliderValue[1]}
                  <IconX className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          )}

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
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
                Try adjusting your filters or check back later.
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear Filters
                </Button>
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
        </div>
      </div>
    </MaxWidthLayout>
  )
}

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useEffect, useState } from 'react'

// =============================================================================
// Types
// =============================================================================

export interface ShopFiltersState {
  // Filter values
  sortBy: string
  selectedCategories: string[]
  priceRange: [number, number]
  showOnSale: boolean
  showInStock: boolean
  page: number
  
  // UI state (collapsible sections)
  categoriesOpen: boolean
  priceOpen: boolean
  availabilityOpen: boolean
  
  // Hydration state
  _hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
  
  // Actions
  setSortBy: (sortBy: string) => void
  setSelectedCategories: (categories: string[]) => void
  toggleCategory: (slug: string) => void
  setPriceRange: (range: [number, number]) => void
  setShowOnSale: (show: boolean) => void
  setShowInStock: (show: boolean) => void
  setPage: (page: number) => void
  
  // UI actions
  setCategoriesOpen: (open: boolean) => void
  setPriceOpen: (open: boolean) => void
  setAvailabilityOpen: (open: boolean) => void
  
  // Utility actions
  clearAllFilters: () => void
  hasActiveFilters: () => boolean
  getActiveFilterCount: () => number
}

// =============================================================================
// Default values
// =============================================================================

const DEFAULT_FILTERS = {
  sortBy: 'newest-desc',
  selectedCategories: [] as string[],
  priceRange: [0, 1000] as [number, number],
  showOnSale: false,
  showInStock: false,
  page: 1,
}

const DEFAULT_UI_STATE = {
  categoriesOpen: true,
  priceOpen: true,
  availabilityOpen: true,
}

// =============================================================================
// Store
// =============================================================================

export const useShopFiltersStore = create<ShopFiltersState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_FILTERS,
      ...DEFAULT_UI_STATE,
      
      // Hydration state
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      
      // Filter actions
      setSortBy: (sortBy) => set({ sortBy }),
      
      setSelectedCategories: (categories) => set({ 
        selectedCategories: categories,
        page: 1, // Reset page when changing categories
      }),
      
      toggleCategory: (slug) => set((state) => {
        const newCategories = state.selectedCategories.includes(slug)
          ? state.selectedCategories.filter(s => s !== slug)
          : [...state.selectedCategories, slug]
        return { 
          selectedCategories: newCategories,
          page: 1, // Reset page when changing categories
        }
      }),
      
      setPriceRange: (range) => set({ priceRange: range }),
      
      setShowOnSale: (show) => set({ 
        showOnSale: show,
        page: 1, // Reset page when changing filter
      }),
      
      setShowInStock: (show) => set({ 
        showInStock: show,
        page: 1, // Reset page when changing filter
      }),
      
      setPage: (page) => set({ page }),
      
      // UI actions
      setCategoriesOpen: (open) => set({ categoriesOpen: open }),
      setPriceOpen: (open) => set({ priceOpen: open }),
      setAvailabilityOpen: (open) => set({ availabilityOpen: open }),
      
      // Utility actions
      clearAllFilters: () => set({
        ...DEFAULT_FILTERS,
      }),
      
      hasActiveFilters: () => {
        const state = get()
        return (
          state.selectedCategories.length > 0 ||
          state.showOnSale ||
          state.showInStock ||
          state.priceRange[0] > 0 ||
          state.priceRange[1] < 1000
        )
      },
      
      getActiveFilterCount: () => {
        const state = get()
        let count = state.selectedCategories.length
        if (state.showOnSale) count++
        if (state.showInStock) count++
        if (state.priceRange[0] > 0 || state.priceRange[1] < 1000) count++
        return count
      },
    }),
    {
      name: 'shop-filters', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist filter values, not UI state
      partialize: (state) => ({
        sortBy: state.sortBy,
        selectedCategories: state.selectedCategories,
        priceRange: state.priceRange,
        showOnSale: state.showOnSale,
        showInStock: state.showInStock,
        // Don't persist page - always start at page 1
        categoriesOpen: state.categoriesOpen,
        priceOpen: state.priceOpen,
        availabilityOpen: state.availabilityOpen,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

// =============================================================================
// Hydration-safe Hook
// =============================================================================

/**
 * Hook that returns shop filters state only after hydration is complete.
 * This prevents hydration mismatches between server and client.
 */
export function useShopFilters() {
  const store = useShopFiltersStore()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Return default values during SSR and initial client render
  // This ensures server and client render the same thing initially
  if (!isHydrated) {
    return {
      ...DEFAULT_FILTERS,
      ...DEFAULT_UI_STATE,
      _hasHydrated: false,
      setHasHydrated: store.setHasHydrated,
      setSortBy: store.setSortBy,
      setSelectedCategories: store.setSelectedCategories,
      toggleCategory: store.toggleCategory,
      setPriceRange: store.setPriceRange,
      setShowOnSale: store.setShowOnSale,
      setShowInStock: store.setShowInStock,
      setPage: store.setPage,
      setCategoriesOpen: store.setCategoriesOpen,
      setPriceOpen: store.setPriceOpen,
      setAvailabilityOpen: store.setAvailabilityOpen,
      clearAllFilters: store.clearAllFilters,
      hasActiveFilters: () => false,
      getActiveFilterCount: () => 0,
    }
  }

  return store
}

// =============================================================================
// Selectors (for better performance - prevents unnecessary re-renders)
// =============================================================================

export const useShopSort = () => useShopFiltersStore((state) => state.sortBy)
export const useShopCategories = () => useShopFiltersStore((state) => state.selectedCategories)
export const useShopPriceRange = () => useShopFiltersStore((state) => state.priceRange)
export const useShopPage = () => useShopFiltersStore((state) => state.page)
export const useShopHydrated = () => useShopFiltersStore((state) => state._hasHydrated)

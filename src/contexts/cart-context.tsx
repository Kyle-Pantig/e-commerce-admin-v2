"use client"

import { createContext, useCallback, ReactNode, useMemo, useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cartApi } from "@/lib/api"
import { useAuth } from "./auth-context"
import type { Cart, CartItem, LocalCartItem, AddToCartRequest } from "@/lib/api/types"

const CART_STORAGE_KEY = "guest_cart"

// =============================================================================
// Local Storage Helpers
// =============================================================================

function getLocalCart(): LocalCartItem[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function setLocalCart(items: LocalCartItem[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Storage full or unavailable
  }
}

function clearLocalCart(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(CART_STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}

// =============================================================================
// Context Types
// =============================================================================

export interface CartContextValue {
  // Cart data
  cart: Cart | null
  cartItems: CartItem[]
  localCartItems: LocalCartItem[]
  
  // Counts
  cartCount: number  // Number of unique items
  totalQuantity: number  // Sum of all quantities
  subtotal: number
  
  // State
  isLoading: boolean
  isMutating: boolean  // True when any cart mutation is in progress
  isAuthenticated: boolean
  
  // Actions
  addToCart: (request: AddToCartRequest) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  changeVariant: (itemId: string, variantId: string, variantData?: {
    name: string
    options: Record<string, string> | null
    price: number
    stock: number
  }) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  
  // For guest cart
  addToLocalCart: (request: AddToCartRequest) => void
  updateLocalQuantity: (productId: string, variantId: string | null, quantity: number) => void
  removeLocalItem: (productId: string, variantId: string | null) => void
}

export const CartContext = createContext<CartContextValue | null>(null)

// =============================================================================
// Provider Component
// =============================================================================

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { isAuthenticated, authChecked } = useAuth()
  const [localCartItems, setLocalCartItems] = useState<LocalCartItem[]>([])
  const [hasSynced, setHasSynced] = useState(false)
  const [pendingMutations, setPendingMutations] = useState(0)
  const [wasAuthenticated, setWasAuthenticated] = useState(false)

  // Load local cart on mount
  useEffect(() => {
    setLocalCartItems(getLocalCart())
  }, [])

  // React to auth changes
  useEffect(() => {
    if (!authChecked) return

    if (isAuthenticated && !wasAuthenticated) {
      // User just logged in - trigger sync
      setHasSynced(false)
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    } else if (!isAuthenticated && wasAuthenticated) {
      // User logged out - clear server cart from cache
      queryClient.setQueryData(["cart"], null)
      setHasSynced(false)
    }

    setWasAuthenticated(isAuthenticated)
  }, [isAuthenticated, authChecked, wasAuthenticated, queryClient])

  // Sync mutation
  const syncMutation = useMutation({
    mutationKey: ["cart", "sync"],
    mutationFn: (items: AddToCartRequest[]) => cartApi.sync({ items }),
    onSuccess: (data) => {
      // Update cart cache with synced data
      queryClient.setQueryData(["cart"], data.cart)
      // Clear local cart after successful sync
      clearLocalCart()
      setLocalCartItems([])
      setHasSynced(true)
    },
  })

  // Fetch server cart (for authenticated users)
  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const serverCart = await cartApi.get()
      
      // Check if we need to sync local cart
      const localItems = getLocalCart()
      if (localItems.length > 0 && !hasSynced) {
        // Sync local cart to server
        const syncItems: AddToCartRequest[] = localItems.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          options: item.options,
        }))
        
        try {
          const syncResult = await cartApi.sync({ items: syncItems })
          clearLocalCart()
          setLocalCartItems([])
          setHasSynced(true)
          return syncResult.cart
        } catch {
          // Sync failed, return server cart anyway
          setHasSynced(true)
          return serverCart
        }
      }
      
      return serverCart
    },
    enabled: isAuthenticated && authChecked,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  // Add to cart mutation with optimistic update
  const addMutation = useMutation({
    mutationKey: ["cart", "add"],
    mutationFn: (request: AddToCartRequest) => cartApi.add(request),
    onMutate: async (request) => {
      setPendingMutations(prev => prev + 1)
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["cart"] })
      
      // Snapshot the previous value
      const previousCart = queryClient.getQueryData<Cart>(["cart"])
      
      if (previousCart) {
        const existingItemIndex = previousCart.items.findIndex(
          item => item.product_id === request.product_id && 
                  item.variant_id === (request.variant_id || null)
        )
        
        let updatedItems: CartItem[]
        
        if (existingItemIndex >= 0) {
          // Update existing item quantity
          updatedItems = [...previousCart.items]
          const existingItem = updatedItems[existingItemIndex]
          updatedItems[existingItemIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + (request.quantity || 1),
            subtotal: existingItem.current_price * (existingItem.quantity + (request.quantity || 1)),
          }
        } else {
          // Create placeholder item for new product (will be replaced by server data)
          const placeholderItem: CartItem = {
            id: `temp-${Date.now()}`,
            product_id: request.product_id,
            variant_id: request.variant_id || null,
            quantity: request.quantity || 1,
            options: request.options || null,
            price_at_add: 0,
            product: {
              id: request.product_id,
              name: "Loading...",
              slug: "",
              base_price: 0,
              sale_price: null,
              primary_image: null,
              has_variants: !!request.variant_id,
              stock: 999,
              status: "ACTIVE",
            },
            variant: null,
            current_price: 0,
            subtotal: 0,
            price_changed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          updatedItems = [...previousCart.items, placeholderItem]
        }
        
        queryClient.setQueryData<Cart>(["cart"], {
          ...previousCart,
          items: updatedItems,
          total_items: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: updatedItems.reduce((sum, item) => sum + item.subtotal, 0),
        })
      }
      
      return { previousCart }
    },
    onSuccess: (data, request) => {
      // Immediately replace placeholder with real item data
      const currentCart = queryClient.getQueryData<Cart>(["cart"])
      if (currentCart && data.item) {
        const updatedItems = currentCart.items.map(item => {
          // Replace placeholder or update existing item
          if (
            item.product_id === request.product_id &&
            item.variant_id === (request.variant_id || null)
          ) {
            return data.item
          }
          return item
        })
        
        queryClient.setQueryData<Cart>(["cart"], {
          ...currentCart,
          items: updatedItems,
          total_items: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: updatedItems.reduce((sum, item) => sum + item.subtotal, 0),
        })
      }
    },
    onError: (_err, _request, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(["cart"], context.previousCart)
      }
    },
    onSettled: () => {
      setPendingMutations(prev => Math.max(0, prev - 1))
      // Refetch to ensure full consistency
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })

  // Update quantity mutation
  const updateMutation = useMutation({
    mutationKey: ["cart", "update"],
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => 
      cartApi.updateItem(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      setPendingMutations(prev => prev + 1)
      await queryClient.cancelQueries({ queryKey: ["cart"] })
      const previousCart = queryClient.getQueryData<Cart>(["cart"])
      
      if (previousCart) {
        const updatedItems = quantity === 0
          ? previousCart.items.filter(item => item.id !== itemId)
          : previousCart.items.map(item =>
              item.id === itemId
                ? { ...item, quantity, subtotal: item.current_price * quantity }
                : item
            )
        
        queryClient.setQueryData<Cart>(["cart"], {
          ...previousCart,
          items: updatedItems,
          total_items: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: updatedItems.reduce((sum, item) => sum + item.subtotal, 0),
        })
      }
      
      return { previousCart }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(["cart"], context.previousCart)
      }
    },
    onSettled: () => {
      setPendingMutations(prev => Math.max(0, prev - 1))
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })

  // Remove item mutation
  const removeMutation = useMutation({
    mutationKey: ["cart", "remove"],
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onMutate: async (itemId) => {
      setPendingMutations(prev => prev + 1)
      await queryClient.cancelQueries({ queryKey: ["cart"] })
      const previousCart = queryClient.getQueryData<Cart>(["cart"])
      
      if (previousCart) {
        const updatedItems = previousCart.items.filter(item => item.id !== itemId)
        queryClient.setQueryData<Cart>(["cart"], {
          ...previousCart,
          items: updatedItems,
          total_items: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: updatedItems.reduce((sum, item) => sum + item.subtotal, 0),
        })
      }
      
      return { previousCart }
    },
    onError: (_err, _itemId, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(["cart"], context.previousCart)
      }
    },
    onSettled: () => {
      setPendingMutations(prev => Math.max(0, prev - 1))
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })

  // Clear cart mutation
  const clearMutation = useMutation({
    mutationKey: ["cart", "clear"],
    mutationFn: () => cartApi.clear(),
    onSuccess: () => {
      queryClient.setQueryData<Cart>(["cart"], prev => prev ? {
        ...prev,
        items: [],
        total_items: 0,
        subtotal: 0,
      } : undefined)
    },
  })

  // Change variant mutation with optimistic update
  const changeVariantMutation = useMutation({
    mutationKey: ["cart", "changeVariant"],
    mutationFn: ({ itemId, variantId }: { itemId: string; variantId: string; variantData?: {
      name: string
      options: Record<string, string> | null
      price: number
      stock: number
    }}) =>
      cartApi.changeVariant(itemId, variantId),
    onMutate: async ({ itemId, variantId, variantData }) => {
      setPendingMutations(prev => prev + 1)
      await queryClient.cancelQueries({ queryKey: ["cart"] })
      const previousCart = queryClient.getQueryData<Cart>(["cart"])
      
      if (previousCart) {
        // Optimistically update with full variant data
        const updatedItems = previousCart.items.map(item => {
          if (item.id === itemId) {
            const newPrice = variantData?.price ?? item.current_price
            const newSubtotal = newPrice * item.quantity
            
            return {
              ...item,
              variant_id: variantId,
              current_price: newPrice,
              subtotal: newSubtotal,
              variant: variantData ? {
                id: variantId,
                name: variantData.name,
                sku: item.variant?.sku ?? null,
                price: variantData.price,
                sale_price: null,
                stock: variantData.stock,
                is_active: true,
                options: variantData.options,
                image_url: item.variant?.image_url ?? null,
              } : item.variant ? { ...item.variant, id: variantId } : null,
            }
          }
          return item
        })
        
        queryClient.setQueryData<Cart>(["cart"], {
          ...previousCart,
          items: updatedItems,
          total_items: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: updatedItems.reduce((sum, item) => sum + item.subtotal, 0),
        })
      }
      
      return { previousCart }
    },
    onSuccess: (data, { itemId }) => {
      // Replace optimistic data with real server data
      const currentCart = queryClient.getQueryData<Cart>(["cart"])
      if (currentCart && data.item) {
        // Check if items were merged (item might have been deleted)
        const itemStillExists = currentCart.items.some(item => item.id === itemId)
        
        let updatedItems: CartItem[]
        if (itemStillExists) {
          updatedItems = currentCart.items.map(item =>
            item.id === itemId ? data.item! : item
          )
        } else {
          // Item was merged with existing - update merged item
          updatedItems = currentCart.items.map(item =>
            item.id === data.item!.id ? data.item! : item
          ).filter(item => item.id !== itemId)
        }
        
        queryClient.setQueryData<Cart>(["cart"], {
          ...currentCart,
          items: updatedItems,
          total_items: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: updatedItems.reduce((sum, item) => sum + item.subtotal, 0),
        })
      }
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(["cart"], context.previousCart)
      }
    },
    onSettled: () => {
      setPendingMutations(prev => Math.max(0, prev - 1))
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })

  // =============================================================================
  // Actions
  // =============================================================================

  const addToCart = useCallback(async (request: AddToCartRequest) => {
    if (isAuthenticated) {
      await addMutation.mutateAsync(request)
    } else {
      // Add to local cart
      const newItem: LocalCartItem = {
        product_id: request.product_id,
        variant_id: request.variant_id || null,
        quantity: request.quantity || 1,
        options: request.options || null,
        added_at: new Date().toISOString(),
      }
      
      setLocalCartItems(prev => {
        const existingIndex = prev.findIndex(
          item => item.product_id === request.product_id && 
                  item.variant_id === (request.variant_id || null)
        )
        
        let updated: LocalCartItem[]
        if (existingIndex >= 0) {
          updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + (request.quantity || 1),
          }
        } else {
          updated = [...prev, newItem]
        }
        
        setLocalCart(updated)
        return updated
      })
    }
  }, [isAuthenticated, addMutation])

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (isAuthenticated) {
      updateMutation.mutate({ itemId, quantity })
    }
  }, [isAuthenticated, updateMutation])

  const changeVariant = useCallback(async (itemId: string, variantId: string, variantData?: {
    name: string
    options: Record<string, string> | null
    price: number
    stock: number
  }) => {
    if (isAuthenticated) {
      changeVariantMutation.mutate({ itemId, variantId, variantData })
    }
  }, [isAuthenticated, changeVariantMutation])

  const removeItem = useCallback(async (itemId: string) => {
    if (isAuthenticated) {
      removeMutation.mutate(itemId)
    }
  }, [isAuthenticated, removeMutation])

  const clearCart = useCallback(async () => {
    if (isAuthenticated) {
      await clearMutation.mutateAsync()
    } else {
      clearLocalCart()
      setLocalCartItems([])
    }
  }, [isAuthenticated, clearMutation])

  // Local cart actions (for guest users)
  const addToLocalCart = useCallback((request: AddToCartRequest) => {
    const newItem: LocalCartItem = {
      product_id: request.product_id,
      variant_id: request.variant_id || null,
      quantity: request.quantity || 1,
      options: request.options || null,
      added_at: new Date().toISOString(),
    }
    
    setLocalCartItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.product_id === request.product_id && 
                item.variant_id === (request.variant_id || null)
      )
      
      let updated: LocalCartItem[]
      if (existingIndex >= 0) {
        updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + (request.quantity || 1),
        }
      } else {
        updated = [...prev, newItem]
      }
      
      setLocalCart(updated)
      return updated
    })
  }, [])

  const updateLocalQuantity = useCallback((productId: string, variantId: string | null, quantity: number) => {
    setLocalCartItems(prev => {
      let updated: LocalCartItem[]
      if (quantity <= 0) {
        updated = prev.filter(
          item => !(item.product_id === productId && item.variant_id === variantId)
        )
      } else {
        updated = prev.map(item =>
          item.product_id === productId && item.variant_id === variantId
            ? { ...item, quantity }
            : item
        )
      }
      setLocalCart(updated)
      return updated
    })
  }, [])

  const removeLocalItem = useCallback((productId: string, variantId: string | null) => {
    setLocalCartItems(prev => {
      const updated = prev.filter(
        item => !(item.product_id === productId && item.variant_id === variantId)
      )
      setLocalCart(updated)
      return updated
    })
  }, [])

  // =============================================================================
  // Computed Values
  // =============================================================================

  const cartItems = cart?.items || []
  
  // For authenticated users, use server cart. For guests, use local count.
  const cartCount = isAuthenticated 
    ? cartItems.length 
    : localCartItems.length
    
  const totalQuantity = isAuthenticated
    ? cartItems.reduce((sum, item) => sum + item.quantity, 0)
    : localCartItems.reduce((sum, item) => sum + item.quantity, 0)
    
  const subtotal = isAuthenticated
    ? cartItems.reduce((sum, item) => sum + item.subtotal, 0)
    : 0 // Can't calculate subtotal for local cart without product data

  // Check if any cart mutation is in progress
  const isMutating = pendingMutations > 0

  // =============================================================================
  // Context Value
  // =============================================================================

  const contextValue = useMemo<CartContextValue>(() => ({
    cart: cart || null,
    cartItems,
    localCartItems,
    cartCount,
    totalQuantity,
    subtotal,
    isLoading: !authChecked || (isAuthenticated && cartLoading),
    isMutating,
    isAuthenticated,
    addToCart,
    updateQuantity,
    changeVariant,
    removeItem,
    clearCart,
    addToLocalCart,
    updateLocalQuantity,
    removeLocalItem,
  }), [
    cart,
    cartItems,
    localCartItems,
    cartCount,
    totalQuantity,
    subtotal,
    authChecked,
    isAuthenticated,
    isMutating,
    cartLoading,
    addToCart,
    updateQuantity,
    changeVariant,
    removeItem,
    clearCart,
    addToLocalCart,
    updateLocalQuantity,
    removeLocalItem,
  ])

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

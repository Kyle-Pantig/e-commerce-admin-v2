"use client"

import { AuthProvider, WishlistProvider, CartProvider } from "@/contexts"

export function StoreProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  )
}

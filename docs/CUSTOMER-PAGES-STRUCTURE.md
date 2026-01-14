# Customer-Facing Pages Structure

This document outlines how to organize customer-facing pages alongside the admin dashboard in our Next.js application.

## Overview

We use **route-based separation** within a single Next.js app:
- `/dashboard/*` - Admin/Staff pages (protected)
- `/` and other routes - Customer pages (public + authenticated)

## Route Structure

```
src/app/
├── (admin)/                    # Admin route group
│   ├── layout.tsx              # Admin layout (sidebar, header)
│   ├── dashboard/
│   ├── products/
│   ├── orders/
│   ├── categories/
│   ├── attributes/
│   ├── inventory/
│   ├── users/
│   └── settings/
│
├── (store)/                    # Customer route group
│   ├── layout.tsx              # Store layout (navbar, footer)
│   ├── page.tsx                # Home page
│   ├── shop/
│   │   ├── page.tsx            # All products
│   │   └── [category]/
│   │       └── page.tsx        # Products by category
│   ├── product/
│   │   └── [slug]/
│   │       └── page.tsx        # Product detail
│   ├── cart/
│   │   └── page.tsx            # Shopping cart
│   ├── checkout/
│   │   └── page.tsx            # Checkout process
│   ├── account/
│   │   ├── page.tsx            # Account overview
│   │   ├── orders/
│   │   │   ├── page.tsx        # Order history
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Order detail
│   │   ├── addresses/
│   │   │   └── page.tsx        # Saved addresses
│   │   └── settings/
│   │       └── page.tsx        # Account settings
│   ├── wishlist/
│   │   └── page.tsx            # Wishlist
│   └── search/
│       └── page.tsx            # Search results
│
├── (auth)/                     # Auth route group (shared)
│   ├── layout.tsx              # Minimal auth layout
│   ├── login/
│   ├── signup/
│   └── verify/
│
└── api/                        # API routes (if needed)
```

## Component Organization

```
src/components/
├── ui/                         # Shared UI primitives (shadcn)
│   ├── button.tsx
│   ├── input.tsx
│   └── ...
│
├── shared/                     # Shared across admin & store
│   ├── pagination.tsx
│   ├── image-crop-modal.tsx
│   └── ...
│
├── admin/                      # Admin-only components
│   ├── app-sidebar.tsx
│   ├── app-header.tsx
│   ├── products/
│   ├── orders/
│   └── ...
│
└── store/                      # Customer-only components
    ├── navbar.tsx              # Store navigation
    ├── footer.tsx              # Store footer
    ├── hero-banner.tsx         # Homepage hero
    ├── product-card.tsx        # Product grid card
    ├── product-gallery.tsx     # Product image gallery
    ├── add-to-cart.tsx         # Add to cart button
    ├── cart-drawer.tsx         # Slide-out cart
    ├── checkout/
    │   ├── checkout-form.tsx
    │   ├── shipping-form.tsx
    │   └── payment-form.tsx
    └── account/
        ├── order-history.tsx
        └── address-form.tsx
```

## Layouts

### Admin Layout (`(admin)/layout.tsx`)
```tsx
import { AppSidebar } from "@/components/admin/app-sidebar"
import { AppHeader } from "@/components/admin/app-header"
import { getAuthenticatedUser } from "@/lib/auth"

export default async function AdminLayout({ children }) {
  const user = await getAuthenticatedUser() // Redirects non-admin
  
  return (
    <div className="flex min-h-screen">
      <AppSidebar user={user} />
      <div className="flex-1">
        <AppHeader user={user} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
```

### Store Layout (`(store)/layout.tsx`)
```tsx
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { CartProvider } from "@/lib/store/cart-context"

export default function StoreLayout({ children }) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </CartProvider>
  )
}
```

## Authentication Flow

### Public Pages (No auth required)
- Home page
- Shop / Product listing
- Product detail
- Search

### Customer Auth Required
- Cart (optional - can use localStorage for guests)
- Checkout
- Account pages
- Wishlist
- Order history

### Admin/Staff Auth Required
- Dashboard
- All admin pages

### Auth Helper for Store Pages
```tsx
// lib/store-auth.ts
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function getCustomerUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user // Returns null if not logged in (no redirect)
}

export async function requireCustomerAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/login?redirect=/account")
  }
  
  return user
}
```

## API Services

### Store-Specific API (`lib/api/services/store/`)
```
lib/api/services/
├── products.ts          # Admin product management
├── orders.ts            # Admin order management
└── store/               # Customer-facing APIs
    ├── products.ts      # Public product fetching
    ├── cart.ts          # Cart operations
    ├── checkout.ts      # Checkout process
    ├── account.ts       # Customer account
    └── wishlist.ts      # Wishlist operations
```

## Customer Pages - Implementation Priority

### Phase 1: Core Shopping
1. [ ] Home page with hero banners, featured products
2. [ ] Shop page (all products with filters)
3. [ ] Product detail page
4. [ ] Category pages

### Phase 2: Cart & Checkout
5. [ ] Shopping cart (localStorage for guests)
6. [ ] Checkout flow
7. [ ] Order confirmation

### Phase 3: Customer Account
8. [ ] Account dashboard
9. [ ] Order history
10. [ ] Saved addresses
11. [ ] Account settings

### Phase 4: Enhanced Features
12. [ ] Wishlist
13. [ ] Search with filters
14. [ ] Reviews & ratings
15. [ ] Recently viewed

## Store Navbar Component

```tsx
// components/store/navbar.tsx
"use client"

import Link from "next/link"
import { ShoppingCart, User, Search, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/store/cart-context"

export function Navbar() {
  const { itemCount } = useCart()
  
  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold">
          Store Name
        </Link>
        
        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/shop">Shop</Link>
          <Link href="/shop/clothing">Clothing</Link>
          <Link href="/shop/accessories">Accessories</Link>
        </nav>
        
        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          
          <Link href="/account">
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          
          <Link href="/cart" className="relative">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
```

## Migration Steps

To migrate from current structure to route groups:

1. **Create route groups**
   ```bash
   mkdir -p src/app/(admin)
   mkdir -p src/app/(store)
   mkdir -p src/app/(auth)
   ```

2. **Move admin pages**
   ```bash
   mv src/app/dashboard src/app/(admin)/
   mv src/app/products src/app/(admin)/
   mv src/app/orders src/app/(admin)/
   # ... etc
   ```

3. **Move auth pages**
   ```bash
   mv src/app/login src/app/(auth)/
   mv src/app/signup src/app/(auth)/
   mv src/app/verify src/app/(auth)/
   ```

4. **Create store pages**
   - Start with home page in `(store)/page.tsx`
   - Add shop, product, cart pages

5. **Create layouts**
   - Move admin layout to `(admin)/layout.tsx`
   - Create store layout in `(store)/layout.tsx`

## Environment Variables

No new environment variables needed. The store uses the same:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_FASTAPI_URL`

## Notes

- Route groups `(admin)`, `(store)`, `(auth)` don't affect URLs
- Each group can have its own layout
- Shared components in `components/ui/` and `components/shared/`
- Admin components stay in current location or move to `components/admin/`
- New store components go in `components/store/`

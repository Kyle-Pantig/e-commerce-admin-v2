"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShoppingCart, User, Search, Menu, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { usersApi } from "@/lib/api/services/users"
import { useEffect, useState } from "react"

export function StoreNavbar() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{ email?: string; name?: string; role?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        // Set initial user data
        let role = "CUSTOMER"
        let name = authUser.user_metadata?.full_name || authUser.email?.split("@")[0]
        
        // Fetch role from backend
        try {
          const userInfo = await usersApi.me()
          role = userInfo.role || "CUSTOMER"
          name = userInfo.full_name || name
        } catch {
          // If backend call fails, use default CUSTOMER role
        }
        
        setUser({
          email: authUser.email,
          name,
          role
        })
      }
      setIsLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        let role = "CUSTOMER"
        let name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0]
        
        // Fetch role from backend
        try {
          const userInfo = await usersApi.me()
          role = userInfo.role || "CUSTOMER"
          name = userInfo.full_name || name
        } catch {
          // If backend call fails, use default CUSTOMER role
        }
        
        setUser({
          email: session.user.email,
          name,
          role
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push("/")
    router.refresh()
  }

  const isAdmin = user?.role === "ADMIN" || user?.role === "STAFF"

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">Store</span>
        </Link>

        {/* Navigation - Desktop */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="/shop" className="text-sm font-medium hover:text-primary transition-colors">
            Shop
          </Link>
          <Link href="/shop/new-arrivals" className="text-sm font-medium hover:text-primary transition-colors">
            New Arrivals
          </Link>
          <Link href="/shop/sale" className="text-sm font-medium hover:text-primary transition-colors">
            Sale
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="sr-only">Cart</span>
              {/* Cart count badge - TODO: implement cart context */}
              {/* <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
                0
              </span> */}
            </Button>
          </Link>

          {!isLoading && (
            <>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                      <span className="sr-only">Account</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account">My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/orders">My Orders</Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard" className="text-primary">
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button variant="default" size="sm">
                    Login
                  </Button>
                </Link>
              )}
            </>
          )}

          {/* Mobile menu */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

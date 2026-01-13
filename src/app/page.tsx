"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold mb-4">Welcome to Our Store</h1>
        <p className="text-muted-foreground">Customer Website - Coming Soon</p>
        <Button variant="outline" onClick={handleLogout}>
          Logout (Temp)
        </Button>
      </div>
    </div>
  )
}

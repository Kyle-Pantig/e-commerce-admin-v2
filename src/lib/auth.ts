import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export interface UserData {
  id: string
  email: string
  name: string
  avatar?: string
  role?: string
  isApproved?: boolean
}

/**
 * Get authenticated user data with approval status
 * Redirects to login if not authenticated
 * Redirects to login with error if not approved (for non-admin users)
 */
export async function getAuthenticatedUser(): Promise<UserData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user info from backend to check approval status
  let userData: UserData = {
    id: user.id,
    email: user.email || "",
    name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    avatar: user.user_metadata?.avatar_url,
  }

  try {
    const API_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000"
    const session = await supabase.auth.getSession()
    
    if (session.data.session?.access_token) {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (response.ok) {
        const userInfo = await response.json()
        userData.role = userInfo.role
        userData.isApproved = userInfo.is_approved

        // Check if user is approved (admins are always approved)
        if (userInfo.role !== "ADMIN" && userInfo.is_approved === false) {
          // Sign out the user since they're not approved
          await supabase.auth.signOut()
          redirect("/login?error=pending_approval")
        }
      }
    }
  } catch (error) {
    // If API check fails, log but allow access
    // This prevents blocking users if the backend is temporarily unavailable
    console.warn("Failed to check user approval status:", error)
  }

  return userData
}


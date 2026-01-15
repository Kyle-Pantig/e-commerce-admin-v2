"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { usersApi } from "@/lib/api"
import type { User } from "@supabase/supabase-js"

export interface AuthUser {
  id: string
  email: string | undefined
  name: string
  role: string
  isApproved?: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  supabaseUser: User | null
  isAuthenticated: boolean
  isLoading: boolean
  authChecked: boolean
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Create supabase client once outside the component
const supabase = createClient()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  
  // Track if this specific mount has completed initialization
  const initCompleted = useRef(false)

  const fetchUserInfo = useCallback(async (authUser: User): Promise<AuthUser> => {
    let role = "CUSTOMER"
    let name = authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User"
    let isApproved = true

    try {
      const userInfo = await usersApi.me()
      role = userInfo.role || "CUSTOMER"
      name = userInfo.full_name || name
      isApproved = userInfo.is_approved ?? true
    } catch {
      // If backend call fails, use defaults from Supabase
    }

    return {
      id: authUser.id,
      email: authUser.email,
      name,
      role,
      isApproved,
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      setSupabaseUser(authUser)
      const userInfo = await fetchUserInfo(authUser)
      setUser(userInfo)
    } else {
      setSupabaseUser(null)
      setUser(null)
    }
  }, [fetchUserInfo])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSupabaseUser(null)
  }, [])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      // Skip if this mount already completed initialization
      if (initCompleted.current) {
        // Still mark as checked in case state was reset
        setIsLoading(false)
        setAuthChecked(true)
        return
      }

      try {
        // First, get the session - this ensures the session is restored from storage
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (session?.user) {
          setSupabaseUser(session.user)
          const userInfo = await fetchUserInfo(session.user)
          if (mounted) {
            // Set user AND authChecked together to prevent flash
            setUser(userInfo)
            setIsLoading(false)
            setAuthChecked(true)
            initCompleted.current = true
          }
        } else {
          // No session, try getUser as fallback (will refresh session if valid refresh token exists)
          const { data: { user: authUser } } = await supabase.auth.getUser()
          
          if (!mounted) return

          if (authUser) {
            // Session should now be available after getUser()
            setSupabaseUser(authUser)
            const userInfo = await fetchUserInfo(authUser)
            if (mounted) {
              // Set user AND authChecked together to prevent flash
              setUser(userInfo)
              setIsLoading(false)
              setAuthChecked(true)
              initCompleted.current = true
            }
          } else {
            // No user found - mark as checked (will show Login button)
            if (mounted) {
              setIsLoading(false)
              setAuthChecked(true)
              initCompleted.current = true
            }
          }
        }
      } catch {
        // Failed to initialize auth - still mark as checked
        if (mounted) {
          setIsLoading(false)
          setAuthChecked(true)
          initCompleted.current = true
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      // Skip INITIAL_SESSION event - we handle it in initAuth
      if (event === 'INITIAL_SESSION') {
        return
      }

      // Handle explicit auth events only
      if (event === 'SIGNED_IN') {
        if (session?.user) {
          setSupabaseUser(session.user)
          const userInfo = await fetchUserInfo(session.user)
          if (mounted) {
            setUser(userInfo)
            setIsLoading(false)
            setAuthChecked(true)
          }
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // Just update the supabase user, no need to re-fetch from backend
        if (session?.user) {
          setSupabaseUser(session.user)
        }
      } else if (event === 'SIGNED_OUT') {
        setSupabaseUser(null)
        setUser(null)
      }
    })

    // Safety fallback: ensure authChecked is set after 2 seconds max
    // This prevents the UI from being stuck in loading state
    const fallbackTimer = setTimeout(() => {
      if (mounted) {
        setIsLoading(false)
        setAuthChecked(true)
      }
    }, 2000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(fallbackTimer)
    }
  }, [fetchUserInfo])

  const value: AuthContextValue = {
    user,
    supabaseUser,
    isAuthenticated: !!user,
    isLoading,
    authChecked,
    refreshUser,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

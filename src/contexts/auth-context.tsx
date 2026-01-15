"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react"
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

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
      // If backend call fails, use defaults
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
  }, [supabase.auth, fetchUserInfo])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSupabaseUser(null)
  }, [supabase.auth])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!mounted) return

      if (authUser) {
        setSupabaseUser(authUser)
        const userInfo = await fetchUserInfo(authUser)
        if (mounted) {
          setUser(userInfo)
        }
      }
      
      if (mounted) {
        setIsLoading(false)
        setAuthChecked(true)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (session?.user) {
        setSupabaseUser(session.user)
        const userInfo = await fetchUserInfo(session.user)
        if (mounted) {
          setUser(userInfo)
        }
      } else {
        setSupabaseUser(null)
        setUser(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase.auth, fetchUserInfo])

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

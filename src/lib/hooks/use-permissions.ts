"use client"

import { useMemo } from "react"
import type { UserRole, StaffPermissions, PermissionModule, PermissionLevel } from "@/lib/api/types"

interface UsePermissionsProps {
  role?: UserRole | null
  permissions?: StaffPermissions | null
}

interface PermissionResult {
  canView: boolean
  canEdit: boolean
  hasAccess: boolean
  level: PermissionLevel
}

/**
 * Hook to check user permissions for a specific module
 * 
 * @example
 * const { canView, canEdit, hasAccess } = usePermission("products", { role, permissions })
 * 
 * if (!hasAccess) return <NoAccessMessage />
 * if (canEdit) return <EditButton />
 */
export function usePermission(
  module: PermissionModule,
  { role, permissions }: UsePermissionsProps
): PermissionResult {
  return useMemo(() => {
    // No role = no access
    if (!role) {
      return { canView: false, canEdit: false, hasAccess: false, level: "none" as PermissionLevel }
    }

    // Admin has full access to everything
    if (role === "ADMIN") {
      return { canView: true, canEdit: true, hasAccess: true, level: "edit" as PermissionLevel }
    }

    // Customer has no access to admin features
    if (role === "CUSTOMER") {
      return { canView: false, canEdit: false, hasAccess: false, level: "none" as PermissionLevel }
    }

    // Staff - check specific permissions
    if (role === "STAFF") {
      const level = (permissions?.[module] || "none") as PermissionLevel
      
      return {
        canView: level === "view" || level === "edit",
        canEdit: level === "edit",
        hasAccess: level !== "none",
        level,
      }
    }

    return { canView: false, canEdit: false, hasAccess: false, level: "none" as PermissionLevel }
  }, [module, role, permissions])
}

/**
 * Hook to check multiple permissions at once
 * 
 * @example
 * const perms = usePermissions({ role, permissions })
 * perms.products.canEdit // true/false
 */
export function usePermissions({ role, permissions }: UsePermissionsProps) {
  return useMemo(() => {
    const modules: PermissionModule[] = [
      "products",
      "orders", 
      "inventory",
      "categories",
      "attributes",
      "analytics",
      "users",
    ]

    const result: Record<PermissionModule, PermissionResult> = {} as Record<PermissionModule, PermissionResult>

    for (const module of modules) {
      // No role = no access
      if (!role) {
        result[module] = { canView: false, canEdit: false, hasAccess: false, level: "none" }
        continue
      }

      // Admin has full access
      if (role === "ADMIN") {
        result[module] = { canView: true, canEdit: true, hasAccess: true, level: "edit" }
        continue
      }

      // Customer has no access
      if (role === "CUSTOMER") {
        result[module] = { canView: false, canEdit: false, hasAccess: false, level: "none" }
        continue
      }

      // Staff - check permissions
      const level = (permissions?.[module] || "none") as PermissionLevel
      result[module] = {
        canView: level === "view" || level === "edit",
        canEdit: level === "edit",
        hasAccess: level !== "none",
        level,
      }
    }

    return result
  }, [role, permissions])
}

export default usePermission


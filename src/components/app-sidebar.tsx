"use client"

import * as React from "react"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconDiscount,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconPackage,
  IconPackages,
  IconPhoto,
  IconReceipt,
  IconReceiptTax,
  IconReport,
  IconSearch,
  IconSettings,
  IconTags,
  IconTruck,
  IconUsers,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { UserData } from "@/lib/auth"
import type { PermissionModule, StaffPermissions, UserRole } from "@/lib/api/types"

// Define nav items with their permission requirements
const allNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
    permission: "analytics" as PermissionModule, // Dashboard shows analytics
  },
  {
    title: "Categories",
    url: "/categories",
    icon: IconFolder,
    permission: "categories" as PermissionModule,
  },
  {
    title: "Attributes",
    url: "/attributes",
    icon: IconTags,
    permission: "attributes" as PermissionModule,
  },
  {
    title: "Products",
    url: "/products",
    icon: IconPackage,
    permission: "products" as PermissionModule,
  },
  {
    title: "Orders",
    url: "/orders",
    icon: IconReceipt,
    permission: "orders" as PermissionModule,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: IconPackages,
    permission: "inventory" as PermissionModule,
  },
  {
    title: "Discounts",
    url: "/settings/discounts",
    icon: IconDiscount,
    permission: "products" as PermissionModule, // Use products permission for discounts
  },
  {
    title: "Shipping",
    url: "/settings/shipping",
    icon: IconTruck,
    permission: "products" as PermissionModule, // Use products permission for shipping
  },
  {
    title: "Tax",
    url: "/settings/tax",
    icon: IconReceiptTax,
    permission: "products" as PermissionModule, // Use products permission for tax
  },
  {
    title: "Site Settings",
    url: "/settings/site",
    icon: IconPhoto,
    permission: "products" as PermissionModule, // Use products permission for site content
  },
  {
    title: "Users",
    url: "/users",
    icon: IconUsers,
    permission: "users" as PermissionModule,
    adminOnly: true, // Users management is admin-only
  },
]

const data = {
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Reports",
      url: "#",
      icon: IconReport,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: IconFileWord,
    },
  ],
}

// Helper function to check if user has permission for a module
function hasPermission(
  role: UserRole | undefined,
  permissions: StaffPermissions | undefined,
  module: PermissionModule,
  adminOnly?: boolean
): boolean {
  // If no role, deny access
  if (!role) return false
  
  // Admin has access to everything
  if (role === "ADMIN") return true
  
  // Admin-only items are not accessible to other roles
  if (adminOnly) return false
  
  // Customer has no access to admin features
  if (role === "CUSTOMER") return false
  
  // Staff - check specific permissions
  if (role === "STAFF") {
    const level = permissions?.[module] || "none"
    return level !== "none"
  }
  
  return false
}

export function AppSidebar({ 
  user,
  ...props 
}: React.ComponentProps<typeof Sidebar> & { user?: UserData | null }) {
  const userData = {
    name: user?.name || "",
    email: user?.email || "",
    avatar: user?.avatar || "",
  }

  // Filter nav items based on user permissions
  const navItems = React.useMemo(() => {
    const role = user?.role as UserRole | undefined
    const permissions = user?.permissions as StaffPermissions | undefined
    
    return allNavItems
      .filter(item => hasPermission(role, permissions, item.permission, item.adminOnly))
      .map(({ title, url, icon }) => ({ title, url, icon }))
  }, [user?.role, user?.permissions])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">E-commerce Admin</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}

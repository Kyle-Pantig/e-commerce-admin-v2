import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { getAuthenticatedUser } from "@/lib/auth"
import type { UserData } from "@/lib/auth"

interface AppLayoutProps {
  children: React.ReactNode
  user?: UserData | null
  title?: string
  description?: string
  actions?: React.ReactNode
}

export function AppLayout({ 
  children, 
  user, 
  title,
  description,
  actions
}: AppLayoutProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <AppHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {(title || description) && (
                <div className="px-4 lg:px-6 flex items-start justify-between gap-4">
                  <div>
                    {title && <h1 className="text-2xl font-bold">{title}</h1>}
                    {description && (
                      <p className="text-muted-foreground mt-1">{description}</p>
                    )}
                  </div>
                  {actions && <div className="flex items-center gap-2 pt-1">{actions}</div>}
                </div>
              )}
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}


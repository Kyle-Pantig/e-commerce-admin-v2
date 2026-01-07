"use client"

import { IconLock, IconArrowLeft } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface NoAccessProps {
  title?: string
  description?: string
  module?: string
  showBackButton?: boolean
}

export function NoAccess({
  title = "Access Denied",
  description,
  module,
  showBackButton = true,
}: NoAccessProps) {
  const defaultDescription = module
    ? `You don't have permission to access ${module}. Please contact your administrator if you believe this is an error.`
    : "You don't have permission to access this page. Please contact your administrator if you believe this is an error."

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <IconLock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        {description || defaultDescription}
      </p>
      {showBackButton && (
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <IconArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      )}
    </div>
  )
}

export default NoAccess


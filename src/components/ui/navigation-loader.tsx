"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function NavigationLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Listen for link clicks to detect navigation start
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest("a")
      
      if (link) {
        const href = link.getAttribute("href")
        const linkTarget = link.getAttribute("target")
        
        // Only intercept internal navigation (not external links or new tabs)
        if (href && !linkTarget && href.startsWith("/") && !href.startsWith("//")) {
          // Check if it's actually navigating to a different page
          const currentPath = window.location.pathname + window.location.search
          if (href !== currentPath && !href.startsWith("#")) {
            setIsLoading(true)
          }
        }
      }
    }

    document.addEventListener("click", handleClick)

    return () => {
      document.removeEventListener("click", handleClick)
    }
  }, [])

  // Reset loading state when pathname or search params change (navigation complete)
  useEffect(() => {
    setIsLoading(false)
  }, [pathname, searchParams])

  if (!isLoading) return null

  return (
    // Blurred overlay that blocks interaction
    <div 
      className="fixed inset-0 z-[9998] bg-background/30 backdrop-blur-[2px]"
      style={{ cursor: "wait" }}
    />
  )
}

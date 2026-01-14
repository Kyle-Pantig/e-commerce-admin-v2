import { cn } from "@/lib/utils"

interface MaxWidthLayoutProps {
  children: React.ReactNode
  className?: string
  /**
   * Max width variant
   * - "default" = max-w-7xl (1280px)
   * - "narrow" = max-w-4xl (896px)
   * - "wide" = max-w-[1400px]
   * - "full" = no max width, just padding
   */
  size?: "default" | "narrow" | "wide" | "full"
  /**
   * Remove horizontal padding
   */
  noPadding?: boolean
}

const sizeClasses = {
  default: "max-w-7xl",
  narrow: "max-w-4xl",
  wide: "max-w-[1400px]",
  full: "",
}

export function MaxWidthLayout({
  children,
  className,
  size = "default",
  noPadding = false,
}: MaxWidthLayoutProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        sizeClasses[size],
        !noPadding && "px-4 sm:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </div>
  )
}

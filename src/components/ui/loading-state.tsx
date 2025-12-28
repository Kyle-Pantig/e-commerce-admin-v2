import * as React from "react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string
  iconSize?: string
  variant?: "default" | "centered" | "overlay"
}

export function LoadingState({
  text,
  iconSize = "size-8",
  variant = "default",
  className,
  ...props
}: LoadingStateProps) {
  const variants = {
    default: "flex items-center gap-3 py-12",
    centered: "flex flex-col items-center justify-center py-24 gap-4 w-full h-full min-h-[400px]",
    overlay: "absolute inset-0 bg-background/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center gap-4",
  }

  return (
    <div
      className={cn(variants[variant], className)}
      {...props}
    >
      <Spinner className={cn(iconSize, "text-muted-foreground")} />
      {text && (
        <p className="text-sm font-medium text-muted-foreground">
          {text}
        </p>
      )}
    </div>
  )
}


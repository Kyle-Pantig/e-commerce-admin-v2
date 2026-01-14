"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  IconPlayerPlay,
  IconEye,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconX,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { 
  getBannerButtons, 
  titleSizeClasses,
  subtitleSizeClasses,
  buttonSizeClasses,
  type BannerItem, 
  type HeroBannersContent 
} from "@/lib/api"

interface BannerPreviewProps {
  content: HeroBannersContent
  pendingFiles?: Map<string, { file: File; previewUrl: string }>
}

export function BannerPreview({ content, pendingFiles }: BannerPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(content.autoplay)
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop")
  
  // Drag/swipe state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Filter active banners only
  const activeBanners = content.banners.filter(b => b.is_active)

  // Get image URL (check pending files first)
  const getImageUrl = useCallback((banner: BannerItem) => {
    if (pendingFiles?.has(banner.id)) {
      return pendingFiles.get(banner.id)!.previewUrl
    }
    return banner.image_url
  }, [pendingFiles])

  // Auto-advance slides (pause while dragging)
  useEffect(() => {
    if (!isOpen || !isPlaying || activeBanners.length <= 1 || isDragging) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeBanners.length)
    }, content.autoplay_interval)

    return () => clearInterval(interval)
  }, [isOpen, isPlaying, activeBanners.length, content.autoplay_interval, isDragging])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0)
      setIsPlaying(content.autoplay)
    }
  }, [isOpen, content.autoplay])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  // Handle drag/swipe
  const handleDragStart = (clientX: number) => {
    setIsDragging(true)
    setDragStart(clientX)
    setDragOffset(0)
  }

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return
    const offset = clientX - dragStart
    setDragOffset(offset)
  }

  const handleDragEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    
    const threshold = 50 // Minimum drag distance to trigger slide change
    
    if (dragOffset > threshold && currentIndex > 0) {
      // Dragged right - go to previous
      setCurrentIndex(prev => prev - 1)
    } else if (dragOffset < -threshold && currentIndex < activeBanners.length - 1) {
      // Dragged left - go to next
      setCurrentIndex(prev => prev + 1)
    }
    
    setDragOffset(0)
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX)
  }

  const handleMouseUp = () => {
    handleDragEnd()
  }

  const handleMouseLeave = () => {
    if (isDragging) handleDragEnd()
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    handleDragEnd()
  }

  if (activeBanners.length === 0) {
    return (
      <Button variant="outline" disabled>
        <IconEye className="h-4 w-4 mr-2" />
        Preview (No active banners)
      </Button>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size='sm'>
          <IconEye className="h-4 w-4 mr-2" />
          Preview Site
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl! w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-base font-semibold">
              Banner Preview
            </DialogTitle>
            <Badge variant="outline" className="text-xs">
              {activeBanners.length} banner{activeBanners.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg p-1 bg-background">
              <Button
                variant={viewMode === "desktop" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("desktop")}
              >
                <IconDeviceDesktop className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "mobile" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode("mobile")}
              >
                <IconDeviceMobile className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-[#1a1a1a] flex items-center justify-center p-4 overflow-hidden">
          <div 
            className={cn(
              "relative bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300",
              viewMode === "desktop" ? "w-full max-w-5xl aspect-[16/9]" : "w-[375px] aspect-[9/16]"
            )}
          >
            {/* Browser Chrome (Desktop) */}
            {viewMode === "desktop" && (
              <div className="h-8 bg-gray-100 border-b flex items-center px-3 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-full px-4 py-1 text-xs text-gray-500 text-center border">
                    yourstore.com
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Status Bar */}
            {viewMode === "mobile" && (
              <div className="h-6 bg-black flex items-center justify-between px-4">
                <span className="text-white text-[10px]">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 border border-white rounded-sm">
                    <div className="h-full w-3/4 bg-white rounded-sm" />
                  </div>
                </div>
              </div>
            )}

            {/* Banner Carousel */}
            <div 
              ref={carouselRef}
              className={cn(
                "relative overflow-hidden cursor-grab active:cursor-grabbing select-none",
                viewMode === "desktop" ? "aspect-[16/7]" : "aspect-[4/3]"
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Slides */}
              <div 
                className={cn(
                  "flex h-full",
                  !isDragging && "transition-transform duration-500 ease-out"
                )}
                style={{ 
                  transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))` 
                }}
              >
                {activeBanners.map((banner) => {
                  const imageUrl = getImageUrl(banner)
                  return (
                    <div key={banner.id} className="w-full h-full flex-shrink-0 relative">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={banner.title || "Banner"}
                          fill
                          className="object-cover"
                          unoptimized={pendingFiles?.has(banner.id)}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <span className="text-gray-500">No image</span>
                        </div>
                      )}
                      
                      {/* Content Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                        <div className={cn(
                          "absolute inset-0 flex flex-col justify-center px-6",
                          banner.content_align === "left" && "items-start text-left",
                          banner.content_align === "right" && "items-end text-right",
                          (!banner.content_align || banner.content_align === "center") && "items-center text-center"
                        )}>
                          {banner.title && (
                            <h2 
                              className={cn(
                                "font-bold drop-shadow-lg mb-3",
                                viewMode === "desktop" 
                                  ? titleSizeClasses[banner.title_size || "lg"]
                                  : "text-xl"
                              )}
                              style={{ color: banner.title_color || "#ffffff" }}
                            >
                              {banner.title}
                            </h2>
                          )}
                          {banner.subtitle && (
                            <p 
                              className={cn(
                                "drop-shadow max-w-2xl mb-6",
                                viewMode === "desktop" 
                                  ? subtitleSizeClasses[banner.subtitle_size || "md"]
                                  : "text-sm"
                              )}
                              style={{ color: banner.subtitle_color || "#ffffff", opacity: 0.9 }}
                            >
                              {banner.subtitle}
                            </p>
                          )}
                          {getBannerButtons(banner).length > 0 && (
                            <div className={cn(
                              "flex gap-3",
                              viewMode === "mobile" && "flex-col gap-2"
                            )}>
                              {getBannerButtons(banner).map((btn, btnIdx) => (
                                <button
                                  key={btnIdx}
                                  className={cn(
                                    "font-medium rounded-md shadow transition-colors",
                                    btn.variant === "primary"
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                      : "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
                                    viewMode === "desktop" 
                                      ? buttonSizeClasses[banner.button_size || "md"]
                                      : "px-5 py-2 text-sm"
                                  )}
                                >
                                  {btn.text || `Button ${btnIdx + 1}`}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Dots Navigation */}
              {activeBanners.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                  <div className="flex gap-2">
                    {activeBanners.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation()
                          goToSlide(index)
                        }}
                        className={cn(
                          "rounded-full transition-all",
                          viewMode === "desktop" ? "w-3 h-3" : "w-2 h-2",
                          currentIndex === index
                            ? "bg-white scale-110"
                            : "bg-white/50 hover:bg-white/75"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-white/60 text-[10px] font-medium tracking-wide">
                    Swipe or drag to navigate
                  </span>
                </div>
              )}
            </div>

            {/* Fake Page Content */}
            <div className={cn(
              "bg-white",
              viewMode === "desktop" ? "p-6" : "p-4"
            )}>
              <div className="flex gap-4 mb-4">
                {[1, 2, 3, 4].slice(0, viewMode === "desktop" ? 4 : 2).map((i) => (
                  <div key={i} className="flex-1">
                    <div className={cn(
                      "bg-gray-100 rounded-lg mb-2",
                      viewMode === "desktop" ? "aspect-square" : "aspect-[4/3]"
                    )} />
                    <div className="h-2 bg-gray-200 rounded w-3/4 mb-1" />
                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
              {viewMode === "desktop" && (
                <div className="flex gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex-1">
                      <div className="aspect-square bg-gray-100 rounded-lg mb-2" />
                      <div className="h-2 bg-gray-200 rounded w-3/4 mb-1" />
                      <div className="h-2 bg-gray-100 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>
              Slide {currentIndex + 1} of {activeBanners.length}
            </span>
            {content.autoplay && (
              <span className="flex items-center gap-1">
                <IconPlayerPlay className="h-3 w-3" />
                Auto-advances every {content.autoplay_interval / 1000}s
              </span>
            )}
          </div>
          <Button variant="destructive" size="sm" onClick={() => setIsOpen(false)}>
            <IconX className="h-4 w-4 mr-1" />
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

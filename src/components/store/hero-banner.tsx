"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import {
  siteContentApi,
  CONTENT_KEYS,
  getBannerButtons,
  titleSizeClasses,
  subtitleSizeClasses,
  buttonSizeClasses,
  type HeroBannersContent,
  type BannerItem,
} from "@/lib/api"

const DEFAULT_CONTENT: HeroBannersContent = {
  banners: [],
  autoplay: true,
  autoplay_interval: 5000,
}

export function HeroBanner() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Fetch hero banners content
  const { data: siteContent, isLoading } = useQuery({
    queryKey: ["public-site-content", CONTENT_KEYS.HERO_BANNERS],
    queryFn: () => siteContentApi.getPublic(CONTENT_KEYS.HERO_BANNERS).catch(() => null),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const content: HeroBannersContent = (siteContent?.content as HeroBannersContent) || DEFAULT_CONTENT
  
  // Filter only active banners and sort by order (with safety check)
  const activeBanners = (content.banners || [])
    .filter(b => b.is_active)
    .sort((a, b) => a.order - b.order)

  // Auto-advance slides (pause while dragging)
  useEffect(() => {
    if (!content.autoplay || activeBanners.length <= 1 || isDragging) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeBanners.length)
    }, content.autoplay_interval)

    return () => clearInterval(interval)
  }, [content.autoplay, content.autoplay_interval, activeBanners.length, isDragging])

  // Handle drag/swipe
  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true)
    setDragStart(clientX)
    setDragOffset(0)
  }, [])

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return
    const offset = clientX - dragStart
    setDragOffset(offset)
  }, [isDragging, dragStart])

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    
    const threshold = 50
    
    if (dragOffset > threshold && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    } else if (dragOffset < -threshold && currentIndex < activeBanners.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
    
    setDragOffset(0)
  }, [isDragging, dragOffset, currentIndex, activeBanners.length])

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX)
  }

  const handleMouseUp = () => handleDragEnd()
  const handleMouseLeave = () => { if (isDragging) handleDragEnd() }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientX)
  const handleTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientX)
  const handleTouchEnd = () => handleDragEnd()

  const goToSlide = (index: number) => setCurrentIndex(index)

  // Loading state - show skeleton placeholder (top loader handled globally)
  if (isLoading) {
    return (
      <div className="w-full aspect-[16/7] bg-muted/50 animate-pulse" />
    )
  }

  // No banners - show default hero
  if (activeBanners.length === 0) {
    return (
      <section className="text-center py-20 px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Welcome to Our Store
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Discover our latest collection of premium products. Quality you can trust, style you&apos;ll love.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Shop Now
          </Link>
        </div>
      </section>
    )
  }

  return (
    <div 
      ref={carouselRef}
      className={cn(
        "relative w-full overflow-hidden select-none",
        activeBanners.length > 1 && "cursor-grab active:cursor-grabbing"
      )}
      onMouseDown={activeBanners.length > 1 ? handleMouseDown : undefined}
      onMouseMove={activeBanners.length > 1 ? handleMouseMove : undefined}
      onMouseUp={activeBanners.length > 1 ? handleMouseUp : undefined}
      onMouseLeave={activeBanners.length > 1 ? handleMouseLeave : undefined}
      onTouchStart={activeBanners.length > 1 ? handleTouchStart : undefined}
      onTouchMove={activeBanners.length > 1 ? handleTouchMove : undefined}
      onTouchEnd={activeBanners.length > 1 ? handleTouchEnd : undefined}
    >
      {/* Slides Container */}
      <div 
        className={cn(
          "flex",
          !isDragging && "transition-transform duration-500 ease-out"
        )}
        style={{ 
          transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))` 
        }}
      >
        {activeBanners.map((banner) => (
          <BannerSlide key={banner.id} banner={banner} />
        ))}
      </div>

      {/* Dots Navigation */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {activeBanners.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                goToSlide(index)
              }}
              className={cn(
                "w-3 h-3 rounded-full transition-all",
                currentIndex === index
                  ? "bg-primary scale-110"
                  : "bg-primary/30 hover:bg-primary/50"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Individual banner slide component
function BannerSlide({ banner }: { banner: BannerItem }) {
  const buttons = getBannerButtons(banner)
  
  return (
    <div className="relative w-full flex-shrink-0 aspect-[16/7]">
      {/* Background Image */}
      {banner.image_url ? (
        <Image
          src={banner.image_url}
          alt={banner.title || "Banner"}
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
      )}
      
      {/* Content Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent">
        <div className={cn(
          "absolute inset-0 flex flex-col justify-center px-8 md:px-16",
          banner.content_align === "left" && "items-start text-left",
          banner.content_align === "right" && "items-end text-right",
          (!banner.content_align || banner.content_align === "center") && "items-center text-center"
        )}>
          {banner.title && (
            <h2 
              className={cn(
                "font-bold mb-4 drop-shadow-lg",
                titleSizeClasses[banner.title_size || "lg"]
              )}
              style={{ color: banner.title_color || "#ffffff" }}
            >
              {banner.title}
            </h2>
          )}
          {banner.subtitle && (
            <p 
              className={cn(
                "mb-8 max-w-2xl drop-shadow",
                subtitleSizeClasses[banner.subtitle_size || "md"]
              )}
              style={{ color: banner.subtitle_color || "#ffffff", opacity: 0.9 }}
            >
              {banner.subtitle}
            </p>
          )}
          {buttons.length > 0 && (
            <div className="flex gap-4 flex-wrap justify-center">
              {buttons.map((btn, btnIdx) => (
                <Link
                  key={btnIdx}
                  href={btn.link || "/"}
                  className={cn(
                    "inline-flex items-center justify-center rounded-md font-medium shadow transition-colors",
                    buttonSizeClasses[banner.button_size || "md"],
                    btn.variant === "primary"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {btn.text}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

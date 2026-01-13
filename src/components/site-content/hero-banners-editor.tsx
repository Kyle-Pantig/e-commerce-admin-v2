"use client"

import { useState, useCallback, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  IconPhoto,
  IconPlus,
  IconTrash,
  IconLoader2,
  IconUpload,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconArrowUp,
  IconArrowDown,
  IconLink,
  IconX,
} from "@tabler/icons-react"
import {
  siteContentApi,
  CONTENT_KEYS,
  type BannerItem,
  type HeroBannersContent,
} from "@/lib/api"
import { BannerPreview } from "./banner-preview"
import { uploadApi } from "@/lib/api/services/upload"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const DEFAULT_CONTENT: HeroBannersContent = {
  banners: [],
  autoplay: true,
  autoplay_interval: 5000,
}

// Type for pending file uploads
interface PendingFile {
  file: File
  previewUrl: string
  oldImageUrl?: string // Track the old image URL to delete after upload
}

export function HeroBannersEditor() {
  const queryClient = useQueryClient()
  const { state: sidebarState, isMobile } = useSidebar()
  const [isSaving, setIsSaving] = useState(false)
  
  // Store pending files that haven't been uploaded yet
  const [pendingFiles, setPendingFiles] = useState<Map<string, PendingFile>>(new Map())
  
  // Store image URLs that need to be deleted (from removed banners)
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  
  // Track upload progress for each file (bannerId -> progress percentage)
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map())

  // Fetch current content
  const { data: siteContent, isLoading } = useQuery({
    queryKey: ["site-content", CONTENT_KEYS.HERO_BANNERS],
    queryFn: () => siteContentApi.get(CONTENT_KEYS.HERO_BANNERS).catch(() => null),
  })

  const content: HeroBannersContent = (siteContent?.content as HeroBannersContent) || DEFAULT_CONTENT
  const [localContent, setLocalContent] = useState<HeroBannersContent | null>(null)
  const currentContent = localContent || content

  // Check if there are actual changes by comparing values
  const hasChanges = useMemo(() => {
    // If there are pending files, there are changes
    if (pendingFiles.size > 0) return true
    
    // If there are images to delete, there are changes
    if (imagesToDelete.length > 0) return true
    
    // If no local content, no changes
    if (localContent === null) return false
    
    // Compare the actual content values
    return JSON.stringify(localContent) !== JSON.stringify(content)
  }, [localContent, content, pendingFiles.size, imagesToDelete.length])

  const updateContent = useCallback((updates: Partial<HeroBannersContent>) => {
    setLocalContent(prev => ({
      ...(prev || content),
      ...updates,
    }))
  }, [content])

  const addBanner = useCallback(() => {
    const newBanner: BannerItem = {
      id: `banner-${Date.now()}`,
      image_url: "",
      title: "",
      subtitle: "",
      button_text: "",
      button_link: "",
      is_active: true,
      order: currentContent.banners.length,
    }
    updateContent({ banners: [...currentContent.banners, newBanner] })
  }, [currentContent.banners, updateContent])

  const updateBanner = useCallback((id: string, updates: Partial<BannerItem>) => {
    updateContent({
      banners: currentContent.banners.map(b =>
        b.id === id ? { ...b, ...updates } : b
      ),
    })
  }, [currentContent.banners, updateContent])

  const removeBanner = useCallback((id: string) => {
    // Find the banner to get its image URL
    const banner = currentContent.banners.find(b => b.id === id)
    
    // Track the image for deletion if it exists and is from our storage
    if (banner?.image_url && banner.image_url.includes('site-content')) {
      setImagesToDelete(prev => [...prev, banner.image_url])
    }
    
    // Also remove any pending file for this banner
    setPendingFiles(prev => {
      const newMap = new Map(prev)
      const pending = newMap.get(id)
      if (pending) {
        URL.revokeObjectURL(pending.previewUrl)
        newMap.delete(id)
      }
      return newMap
    })
    updateContent({
      banners: currentContent.banners.filter(b => b.id !== id),
    })
  }, [currentContent.banners, updateContent])

  const moveBanner = useCallback((id: string, direction: "up" | "down") => {
    const index = currentContent.banners.findIndex(b => b.id === id)
    if (index === -1) return
    
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= currentContent.banners.length) return
    
    const newBanners = [...currentContent.banners]
    ;[newBanners[index], newBanners[newIndex]] = [newBanners[newIndex], newBanners[index]]
    
    // Update order values
    newBanners.forEach((b, i) => {
      b.order = i
    })
    
    updateContent({ banners: newBanners })
  }, [currentContent.banners, updateContent])

  // Handle file selection - just store locally, don't upload yet
  const handleFileSelect = useCallback((bannerId: string, file: File) => {
    // Find the current banner to get its existing image URL
    const currentBanner = currentContent.banners.find(b => b.id === bannerId)
    const oldImageUrl = currentBanner?.image_url
    
    // Create a preview URL for the file
    const previewUrl = URL.createObjectURL(file)
    
    // Store the pending file with the old image URL to delete later
    setPendingFiles(prev => {
      const newMap = new Map(prev)
      // Revoke old preview URL if exists
      const oldPending = newMap.get(bannerId)
      if (oldPending) {
        URL.revokeObjectURL(oldPending.previewUrl)
      }
      // Track the old image URL only if it's from our storage
      const trackOldUrl = oldImageUrl && oldImageUrl.includes('site-content') ? oldImageUrl : undefined
      newMap.set(bannerId, { file, previewUrl, oldImageUrl: trackOldUrl })
      return newMap
    })
    
    // Mark as changed (to trigger unsaved changes UI)
    if (!localContent) {
      setLocalContent(content)
    }
  }, [content, localContent, currentContent.banners])

  // Get the display image URL for a banner (pending preview or actual URL)
  const getBannerImageUrl = useCallback((banner: BannerItem) => {
    const pending = pendingFiles.get(banner.id)
    if (pending) {
      return pending.previewUrl
    }
    return banner.image_url
  }, [pendingFiles])

  // Handle save - upload pending files first, then save content
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      let contentToSave = localContent || content
      
      // Collect old image URLs to delete (from replaced images)
      const oldUrlsToDelete: string[] = [...imagesToDelete]
      
      // Upload all pending files with progress tracking
      if (pendingFiles.size > 0) {
        // Initialize progress for all files
        const initialProgress = new Map<string, number>()
        pendingFiles.forEach((_, bannerId) => {
          initialProgress.set(bannerId, 0)
        })
        setUploadProgress(initialProgress)
        
        const uploadPromises: Promise<{ bannerId: string; url: string }>[] = []
        
        pendingFiles.forEach((pending, bannerId) => {
          // Track old URLs from replaced images
          if (pending.oldImageUrl) {
            oldUrlsToDelete.push(pending.oldImageUrl)
          }
          
          uploadPromises.push(
            uploadApi.uploadImage(pending.file, { 
              folder: "banners", 
              bucket: "site-content",
              onProgress: (progress) => {
                setUploadProgress(prev => {
                  const newMap = new Map(prev)
                  newMap.set(bannerId, progress)
                  return newMap
                })
              }
            })
              .then(result => ({ bannerId, url: result.url }))
          )
        })
        
        const uploadResults = await Promise.all(uploadPromises)
        
        // Clear progress after all uploads complete
        setUploadProgress(new Map())
        
        // Update banners with uploaded URLs
        const updatedBanners = contentToSave.banners.map(banner => {
          const uploadResult = uploadResults.find(r => r.bannerId === banner.id)
          if (uploadResult) {
            return { ...banner, image_url: uploadResult.url }
          }
          return banner
        })
        
        contentToSave = { ...contentToSave, banners: updatedBanners }
        
        // Clean up preview URLs
        pendingFiles.forEach(pending => {
          URL.revokeObjectURL(pending.previewUrl)
        })
        setPendingFiles(new Map())
      }
      
      // Save to server
      await siteContentApi.upsert(CONTENT_KEYS.HERO_BANNERS, {
        title: "Hero Banners",
        content: contentToSave,
        is_active: true,
      })
      
      // Delete old images from storage (fire and forget - don't block on this)
      if (oldUrlsToDelete.length > 0) {
        for (const url of oldUrlsToDelete) {
          try {
            // Extract the path from the Supabase storage URL
            // URL format: https://xxx.supabase.co/storage/v1/object/public/site-content/banners/uuid.jpg
            const urlObj = new URL(url)
            const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/site-content\/(.+)$/)
            if (pathMatch) {
              const filePath = decodeURIComponent(pathMatch[1])
              console.log("Deleting old image:", filePath)
              await uploadApi.deleteFile(filePath, "site-content")
            }
          } catch (err) {
            console.warn("Failed to delete old image:", url, err)
          }
        }
      }
      
      // Clear the images to delete list
      setImagesToDelete([])
      
      // Refresh data and clear local state
      queryClient.invalidateQueries({ queryKey: ["site-content", CONTENT_KEYS.HERO_BANNERS] })
      setLocalContent(null)
      toast.success("Hero banners saved successfully")
    } catch (error) {
      console.error("Save error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save banners")
    } finally {
      setIsSaving(false)
    }
  }, [localContent, content, pendingFiles, imagesToDelete, queryClient])

  // Handle discard - clean up preview URLs and reset state
  const handleDiscard = useCallback(() => {
    pendingFiles.forEach(pending => {
      URL.revokeObjectURL(pending.previewUrl)
    })
    setPendingFiles(new Map())
    setImagesToDelete([])
    setLocalContent(null)
  }, [pendingFiles])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Autoplay Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconPhoto className="h-5 w-5" />
            Slideshow Settings
          </CardTitle>
          <CardDescription>
            Configure how the hero banners rotate on the landing page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoplay">Auto-rotate slides</Label>
              <p className="text-sm text-muted-foreground">
                Automatically cycle through banners
              </p>
            </div>
            <Switch
              id="autoplay"
              checked={currentContent.autoplay}
              onCheckedChange={(checked) => updateContent({ autoplay: checked })}
            />
          </div>
          
          {currentContent.autoplay && (
            <div className="space-y-2">
              <Label htmlFor="interval">Rotation interval (seconds)</Label>
              <Input
                id="interval"
                type="number"
                min={1}
                max={30}
                value={currentContent.autoplay_interval / 1000}
                onChange={(e) =>
                  updateContent({ autoplay_interval: Number(e.target.value) * 1000 })
                }
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banners List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Hero Banners</CardTitle>
            <CardDescription>
              Add and manage landing page banners. Drag to reorder.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <BannerPreview content={currentContent} pendingFiles={pendingFiles} />
            <Button onClick={addBanner} size="sm">
              <IconPlus className="h-4 w-4 mr-1" />
              Add Banner
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {currentContent.banners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/30">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <IconPhoto className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No banners yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                Create your first hero banner to showcase promotions, new arrivals, or seasonal campaigns
              </p>
              <Button onClick={addBanner} size="lg">
                <IconPlus className="h-4 w-4 mr-2" />
                Add Your First Banner
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {currentContent.banners.map((banner, index) => (
                <div 
                  key={banner.id} 
                  className={cn(
                    "group relative border rounded-xl overflow-hidden bg-card transition-all duration-200",
                    !banner.is_active && "opacity-60",
                    "hover:shadow-md hover:border-primary/20"
                  )}
                >
                  {/* Banner Header with drag handle and actions */}
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                    <div className="flex items-center gap-3">
                      {/* Drag Handle & Position */}
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-muted"
                            disabled={index === 0}
                            onClick={() => moveBanner(banner.id, "up")}
                          >
                            <IconArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-muted"
                            disabled={index === currentContent.banners.length - 1}
                            onClick={() => moveBanner(banner.id, "down")}
                          >
                            <IconArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background border text-sm font-bold text-muted-foreground">
                          {index + 1}
                        </div>
                      </div>
                      
                      {/* Title & Status */}
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {banner.title || `Banner ${index + 1}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {banner.subtitle || "No subtitle"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={banner.is_active ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          banner.is_active && "bg-green-500 hover:bg-green-600"
                        )}
                      >
                        {banner.is_active ? "Live" : "Draft"}
                      </Badge>
                      <div className="flex items-center border-l pl-2 ml-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateBanner(banner.id, { is_active: !banner.is_active })}
                          title={banner.is_active ? "Hide banner" : "Show banner"}
                        >
                          {banner.is_active ? (
                            <IconEyeOff className="h-4 w-4" />
                          ) : (
                            <IconEye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeBanner(banner.id)}
                          title="Delete banner"
                        >
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Banner Content */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Image Upload Area */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Banner Image</Label>
                          {pendingFiles.has(banner.id) && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                              Pending upload
                            </Badge>
                          )}
                        </div>
                        <div 
                          className={cn(
                            "relative aspect-[16/9] rounded-lg overflow-hidden border-2 border-dashed transition-colors",
                            !getBannerImageUrl(banner) && "bg-muted/50 hover:bg-muted/70 hover:border-primary/50",
                            getBannerImageUrl(banner) && "border-solid border-muted"
                          )}
                        >
                          {getBannerImageUrl(banner) ? (
                            <>
                              <Image
                                src={getBannerImageUrl(banner)}
                                alt={banner.title || "Banner"}
                                fill
                                className="object-cover"
                                unoptimized={pendingFiles.has(banner.id)} // Skip optimization for blob URLs
                              />
                              {/* Overlay Preview */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                                <div className="absolute bottom-4 left-4 right-4 text-white">
                                  {banner.title && (
                                    <h3 className="text-lg font-bold drop-shadow-lg">{banner.title}</h3>
                                  )}
                                  {banner.subtitle && (
                                    <p className="text-sm opacity-90 drop-shadow">{banner.subtitle}</p>
                                  )}
                                  {banner.button_text && (
                                    <div className="mt-2">
                                      <span className="inline-block bg-white text-black text-xs font-medium px-3 py-1.5 rounded">
                                        {banner.button_text}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Upload Progress Overlay */}
                              {uploadProgress.has(banner.id) && (
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                  <div className="relative w-20 h-20">
                                    {/* Circular Progress */}
                                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                      <circle
                                        cx="40"
                                        cy="40"
                                        r="35"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        className="text-white/20"
                                      />
                                      <circle
                                        cx="40"
                                        cy="40"
                                        r="35"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        className="text-primary transition-all duration-300"
                                        strokeDasharray={`${(uploadProgress.get(banner.id) || 0) * 2.2} 220`}
                                      />
                                    </svg>
                                    {/* Percentage Text */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-xl font-bold text-white">
                                        {uploadProgress.get(banner.id)}%
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-white text-sm mt-3 font-medium">Uploading...</span>
                                </div>
                              )}
                              
                              {/* Change Image Button */}
                              <label className={cn(
                                "absolute top-2 right-2 cursor-pointer",
                                uploadProgress.has(banner.id) && "hidden"
                              )}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleFileSelect(banner.id, file)
                                  }}
                                />
                                <Button variant="secondary" size="sm" asChild className="shadow-lg">
                                  <span>
                                    <IconUpload className="h-3 w-3 mr-1" />
                                    Change
                                  </span>
                                </Button>
                              </label>
                            </>
                          ) : (
                            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleFileSelect(banner.id, file)
                                }}
                              />
                              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                <IconUpload className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <span className="font-medium text-sm">Click to select image</span>
                              <span className="text-xs text-muted-foreground mt-1">
                                Recommended: 1920×1080px (16:9)
                              </span>
                            </label>
                          )}
                        </div>
                        
                        {/* Image URL Input (alternative) */}
                        {!getBannerImageUrl(banner) && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground px-2">or</span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}
                        {!getBannerImageUrl(banner) && (
                          <Input
                            placeholder="Paste image URL here..."
                            onChange={(e) => updateBanner(banner.id, { image_url: e.target.value })}
                            className="text-sm"
                          />
                        )}
                      </div>

                      {/* Content Fields */}
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Content</Label>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block">Headline</Label>
                              <Input
                                placeholder="Summer Collection 2026"
                                value={banner.title || ""}
                                onChange={(e) => updateBanner(banner.id, { title: e.target.value })}
                                className="font-medium"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block">Subheadline</Label>
                              <Input
                                placeholder="Up to 50% off on selected items"
                                value={banner.subtitle || ""}
                                onChange={(e) => updateBanner(banner.id, { subtitle: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Call to Action</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block">Button Label</Label>
                              <Input
                                placeholder="Shop Now"
                                value={banner.button_text || ""}
                                onChange={(e) => updateBanner(banner.id, { button_text: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                                <IconLink className="h-3 w-3" />
                                Link URL
                              </Label>
                              <Input
                                placeholder="/collections/summer"
                                value={banner.button_link || ""}
                                onChange={(e) => updateBanner(banner.id, { button_link: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quick Tips */}
                        <div className="rounded-lg bg-muted/50 p-3 mt-4">
                          <p className="text-xs text-muted-foreground">
                            <strong className="text-foreground">Tip:</strong> Keep headlines short and impactful. 
                            Use high-contrast text colors for better readability on the image.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Footer Action Bar */}
      <div className={cn(
        "fixed bottom-6 z-50 transition-all duration-300 ease-in-out px-4 flex justify-center pointer-events-none",
        isMobile ? "w-full left-0" : sidebarState === "expanded" ? "w-[calc(100%-18rem)] left-72" : "w-[calc(100%-3rem)] left-12"
      )}>
        <div className={cn(
          "bg-background/95 backdrop-blur-md border shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-6 pointer-events-auto transition-all transform duration-500",
          hasChanges ? "translate-y-0 opacity-100 scale-100" : "translate-y-20 opacity-0 scale-95 pointer-events-none"
        )}>
          <div className="flex flex-col pr-8 border-r">
            <span className="text-sm font-bold flex items-center gap-2">
              Unsaved Changes
              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 h-4">
                {pendingFiles.size > 0 ? `${pendingFiles.size} IMAGE${pendingFiles.size > 1 ? 'S' : ''}` : 'MODIFIED'}
              </Badge>
            </span>
            <span className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
              {pendingFiles.size > 0 
                ? `${pendingFiles.size} image${pendingFiles.size > 1 ? 's' : ''} will be uploaded when you save.`
                : 'Review your modifications before saving.'
              }
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleDiscard}
              disabled={isSaving}
              className="h-10 px-6 font-semibold border-2"
            >
              <IconX className="h-4 w-4 mr-2" />
              Discard
            </Button>
            <Button 
              onClick={handleSave}
              className="h-10 px-8 font-bold shadow-lg shadow-primary/20" 
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <IconDeviceFloppy className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

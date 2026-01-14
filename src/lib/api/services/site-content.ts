import { apiClient } from "../client"

// Button for banner CTA
export interface BannerButton {
  text: string
  link: string
  variant?: "primary" | "secondary"
}

// Size options
export type TextSize = "sm" | "md" | "lg" | "xl"
export type ButtonSize = "sm" | "md" | "lg"

// Banner item for hero slider
export interface BannerItem {
  id: string
  image_url: string
  title?: string
  title_color?: string
  title_size?: TextSize
  subtitle?: string
  subtitle_color?: string
  subtitle_size?: TextSize
  content_align?: "left" | "center" | "right"
  button_size?: ButtonSize
  buttons?: BannerButton[]
  // Legacy fields (for backward compatibility)
  button_text?: string
  button_link?: string
  is_active: boolean
  order: number
}

// Helper to get normalized buttons (handles legacy format)
export function getBannerButtons(banner: BannerItem): BannerButton[] {
  // If new buttons array exists, use it
  if (banner.buttons && banner.buttons.length > 0) {
    return banner.buttons
  }
  // Fallback to legacy single button
  if (banner.button_text) {
    return [{ text: banner.button_text, link: banner.button_link || "", variant: "primary" }]
  }
  return []
}

// Size class helpers for responsive design
export const titleSizeClasses = {
  sm: "text-xl md:text-2xl lg:text-3xl",
  md: "text-2xl md:text-4xl lg:text-5xl",
  lg: "text-3xl md:text-5xl lg:text-6xl",
  xl: "text-4xl md:text-6xl lg:text-7xl",
} as const

export const subtitleSizeClasses = {
  sm: "text-sm md:text-base",
  md: "text-base md:text-lg",
  lg: "text-lg md:text-xl",
  xl: "text-xl md:text-2xl",
} as const

export const buttonSizeClasses = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
} as const

// Preview-specific size classes (smaller for editor preview)
export const previewTitleSizeClasses = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
  xl: "text-2xl",
} as const

export const previewSubtitleSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
} as const

export const previewButtonSizeClasses = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-xs",
  lg: "px-4 py-2 text-sm",
} as const

// Hero banners content structure
export interface HeroBannersContent {
  banners: BannerItem[]
  autoplay: boolean
  autoplay_interval: number
}

// Announcement bar content
export interface AnnouncementContent {
  text: string
  link?: string
  background_color: string
  text_color: string
}

// Featured category item
export interface FeaturedCategoryItem {
  id: string
  category_id: string
  image_url?: string
  custom_title?: string
  order: number
}

// Featured categories content
export interface FeaturedCategoriesContent {
  categories: FeaturedCategoryItem[]
  title: string
}

// Site content response
export interface SiteContent {
  id: string
  key: string
  title: string | null
  content: unknown
  is_active: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}

// Create/Update
export interface SiteContentCreate {
  key: string
  title?: string
  content: unknown
  is_active?: boolean
}

export interface SiteContentUpdate {
  title?: string | null
  content?: unknown
  is_active?: boolean
}

// List response
export interface SiteContentListResponse {
  items: SiteContent[]
  total: number
}

// Predefined content keys
export const CONTENT_KEYS = {
  HERO_BANNERS: "hero_banners",
  ANNOUNCEMENT: "announcement",
  FEATURED_CATEGORIES: "featured_categories",
} as const

export const siteContentApi = {
  // List all site content
  list: async (isActive?: boolean): Promise<SiteContentListResponse> => {
    const params = new URLSearchParams()
    if (isActive !== undefined) {
      params.set("is_active", String(isActive))
    }
    const queryString = params.toString()
    return apiClient.get<SiteContentListResponse>(
      `/site-content${queryString ? `?${queryString}` : ""}`
    )
  },

  // Get site content by key
  get: async (key: string): Promise<SiteContent> => {
    return apiClient.get<SiteContent>(`/site-content/${key}`)
  },

  // Create site content
  create: async (data: SiteContentCreate): Promise<SiteContent> => {
    return apiClient.post<SiteContent>("/site-content", data)
  },

  // Update site content by key
  update: async (key: string, data: SiteContentUpdate): Promise<SiteContent> => {
    return apiClient.patch<SiteContent>(`/site-content/${key}`, data)
  },

  // Upsert (create or update) site content
  upsert: async (key: string, data: SiteContentUpdate): Promise<SiteContent> => {
    return apiClient.put<SiteContent>(`/site-content/${key}`, data)
  },

  // Delete site content
  delete: async (key: string): Promise<void> => {
    return apiClient.delete(`/site-content/${key}`)
  },

  // Toggle active status
  toggle: async (key: string): Promise<SiteContent> => {
    return apiClient.post<SiteContent>(`/site-content/${key}/toggle`)
  },

  // Get public content (no auth required)
  getPublic: async (key: string): Promise<{ content: unknown }> => {
    return apiClient.get<{ content: unknown }>(`/site-content/public/${key}`, { skipAuth: true })
  },
}

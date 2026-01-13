import { apiClient } from "../client"

// Banner item for hero slider
export interface BannerItem {
  id: string
  image_url: string
  title?: string
  subtitle?: string
  button_text?: string
  button_link?: string
  is_active: boolean
  order: number
}

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

  // Get public content (no auth)
  getPublic: async (key: string): Promise<{ content: unknown }> => {
    return apiClient.get<{ content: unknown }>(`/site-content/public/${key}`)
  },
}

/**
 * Core API Client
 * 
 * Centralized API client with authentication handling.
 * All API calls go through this client.
 * 
 * Usage:
 *   import { apiClient } from '@/lib/api/client'
 *   const data = await apiClient.get<Product[]>('/products')
 */

import { createClient } from "@/lib/supabase/client"

// =============================================================================
// Configuration
// =============================================================================

export const API_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000"

// =============================================================================
// Types
// =============================================================================

export interface ApiError {
  detail: string
  status: number
}

export interface RequestConfig {
  /** Skip authentication header */
  skipAuth?: boolean
  /** Custom headers */
  headers?: Record<string, string>
  /** Cache mode */
  cache?: RequestCache
  /** Next.js revalidate option */
  next?: { revalidate?: number | false }
}

// =============================================================================
// Error Handling
// =============================================================================

export class ApiClientError extends Error {
  status: number
  detail: string

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.detail = message
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    
    try {
      const errorData = await response.json()
      errorMessage = errorData.detail || errorMessage
    } catch {
      // Response wasn't JSON, use default message
    }

    throw new ApiClientError(errorMessage, response.status)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// =============================================================================
// Authentication
// =============================================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient()
  const session = await supabase.auth.getSession()
  
  if (!session.data.session?.access_token) {
    throw new ApiClientError("Not authenticated", 401)
  }

  return {
    Authorization: `Bearer ${session.data.session.access_token}`,
  }
}

export async function getAccessToken(): Promise<string> {
  const supabase = createClient()
  const session = await supabase.auth.getSession()
  
  if (!session.data.session?.access_token) {
    throw new ApiClientError("Not authenticated", 401)
  }

  return session.data.session.access_token
}

// =============================================================================
// Core Request Methods
// =============================================================================

async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  config?: RequestConfig
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...config?.headers,
  }

  // Add auth headers unless skipped
  if (!config?.skipAuth) {
    const authHeaders = await getAuthHeaders()
    Object.assign(headers, authHeaders)
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`

  const fetchOptions: RequestInit = {
    method,
    headers,
  }
  
  if (body) {
    fetchOptions.body = JSON.stringify(body)
  }
  if (config?.cache) {
    fetchOptions.cache = config.cache
  }
  if (config?.next) {
    fetchOptions.next = config.next
  }

  const response = await fetch(url, fetchOptions)
  return handleResponse<T>(response)
}

// =============================================================================
// API Client Export
// =============================================================================

export const apiClient = {
  /**
   * GET request
   * @example const products = await apiClient.get<Product[]>('/products')
   */
  get: <T>(endpoint: string, config?: RequestConfig): Promise<T> =>
    request<T>("GET", endpoint, undefined, config),

  /**
   * POST request
   * @example const product = await apiClient.post<Product>('/products', { name: 'New' })
   */
  post: <T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> =>
    request<T>("POST", endpoint, body, config),

  /**
   * PUT request
   * @example await apiClient.put('/products/123', { name: 'Updated' })
   */
  put: <T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> =>
    request<T>("PUT", endpoint, body, config),

  /**
   * PATCH request
   * @example await apiClient.patch('/products/123', { name: 'Patched' })
   */
  patch: <T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<T> =>
    request<T>("PATCH", endpoint, body, config),

  /**
   * DELETE request
   * @example await apiClient.delete('/products/123')
   */
  delete: <T>(endpoint: string, config?: RequestConfig): Promise<T> =>
    request<T>("DELETE", endpoint, undefined, config),

  /**
   * Upload file (FormData)
   * @example await apiClient.upload('/upload/image', formData)
   */
  upload: async <T>(endpoint: string, formData: FormData, config?: RequestConfig): Promise<T> => {
    const headers: Record<string, string> = {
      ...config?.headers,
    }

    // Add auth headers unless skipped
    if (!config?.skipAuth) {
      const authHeaders = await getAuthHeaders()
      Object.assign(headers, authHeaders)
    }

    const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    })

    return handleResponse<T>(response)
  },
}

// =============================================================================
// Query String Builder
// =============================================================================

export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value))
    }
  })
  
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ""
}

export default apiClient


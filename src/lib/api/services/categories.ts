/**
 * Categories API Service
 * 
 * All category-related API operations.
 * 
 * Usage:
 *   import { categoriesApi } from '@/lib/api'
 *   const categories = await categoriesApi.list()
 */

import { apiClient, buildQueryString } from "../client"
import type { Category, CategoryCreate, CategoryUpdate } from "../types"

// =============================================================================
// Query Parameters
// =============================================================================

export interface CategoryListParams {
  include_inactive?: boolean
}

// =============================================================================
// API Service
// =============================================================================

export const categoriesApi = {
  /**
   * List all categories
   * @param params - Filter parameters
   * @returns Array of categories (tree structure)
   */
  list: (params: CategoryListParams = {}): Promise<Category[]> => {
    const query = buildQueryString(params as Record<string, unknown>)
    return apiClient.get<Category[]>(`/categories${query}`)
  },

  /**
   * Get a single category by ID
   * @param id - Category ID
   */
  get: (id: string): Promise<Category> => {
    return apiClient.get<Category>(`/categories/${id}`)
  },

  /**
   * Create a new category
   * @param data - Category data
   */
  create: (data: CategoryCreate): Promise<Category> => {
    return apiClient.post<Category>("/categories", data)
  },

  /**
   * Update an existing category
   * @param id - Category ID
   * @param data - Update data
   */
  update: (id: string, data: CategoryUpdate): Promise<Category> => {
    return apiClient.patch<Category>(`/categories/${id}`, data)
  },

  /**
   * Delete a category
   * @param id - Category ID
   */
  delete: (id: string): Promise<void> => {
    return apiClient.delete<void>(`/categories/${id}`)
  },
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Flatten category tree for dropdown/select usage
 * @param categories - Nested categories array
 * @param level - Current nesting level (for indentation)
 */
export function flattenCategories(
  categories: Category[],
  level = 0
): (Category & { level: number })[] {
  const result: (Category & { level: number })[] = []

  for (const category of categories) {
    result.push({ ...category, level })
    if (category.children && category.children.length > 0) {
      result.push(...flattenCategories(category.children, level + 1))
    }
  }

  return result
}

/**
 * Get all category IDs from a tree (for filtering)
 */
export function getAllCategoryIds(categories: Category[]): string[] {
  const ids: string[] = []

  for (const category of categories) {
    ids.push(category.id)
    if (category.children && category.children.length > 0) {
      ids.push(...getAllCategoryIds(category.children))
    }
  }

  return ids
}

export default categoriesApi


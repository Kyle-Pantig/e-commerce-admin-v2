/**
 * Users API Service
 * 
 * All user management API operations.
 * 
 * Usage:
 *   import { usersApi } from '@/lib/api'
 *   const users = await usersApi.list()
 */

import { apiClient } from "../client"
import type { User, UserUpdate, AuthUser, AuthResponse } from "../types"

// =============================================================================
// API Service
// =============================================================================

export const usersApi = {
  /**
   * List all users
   */
  list: (): Promise<User[]> => {
    return apiClient.get<User[]>("/auth/users")
  },

  /**
   * Get current user info
   */
  me: (): Promise<AuthUser> => {
    return apiClient.get<AuthUser>("/auth/me")
  },

  /**
   * Update user approval status
   * @param id - User ID
   * @param data - Update data (is_approved, role)
   */
  updateApproval: (id: string, data: UserUpdate): Promise<User> => {
    return apiClient.patch<User>(`/auth/users/${id}/approval`, data)
  },

  /**
   * Delete a user
   * @param id - User ID
   */
  delete: (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/auth/users/${id}`)
  },

  /**
   * Logout current user
   */
  logout: (): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>("/auth/logout")
  },

  /**
   * Refresh access token
   * @param refreshToken - Refresh token
   */
  refreshToken: (refreshToken: string): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>(
      "/auth/refresh",
      { refresh_token: refreshToken },
      { skipAuth: true }
    )
  },
}

// =============================================================================
// Auth API (public, no auth required)
// =============================================================================

export const authApi = {
  /**
   * Login with email and password
   * @param email - User email
   * @param password - User password
   */
  login: (email: string, password: string): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>(
      "/auth/login",
      { email, password },
      { skipAuth: true }
    )
  },

  /**
   * Sign up new user
   * @param email - User email
   * @param password - User password
   * @param fullName - Optional full name
   */
  signup: (
    email: string,
    password: string,
    fullName?: string
  ): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>(
      "/auth/signup",
      { email, password, full_name: fullName },
      { skipAuth: true }
    )
  },
}

export default usersApi


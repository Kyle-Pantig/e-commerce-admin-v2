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
import type { User, UserUpdate, UserCreate, AuthUser, AuthResponse } from "../types"

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
   * Create a new user (admin only)
   * @param data - User creation data
   */
  create: (data: UserCreate): Promise<User> => {
    return apiClient.post<User>("/auth/users", data)
  },

  /**
   * Update user approval status, role, and permissions
   * @param id - User ID
   * @param data - Update data (is_approved, role, permissions)
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
   * Sign up new user (admin/staff flow - no OTP required)
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

  /**
   * Sign up with OTP verification (customer flow)
   * Sends OTP to email for verification
   */
  signupWithOtp: (data: {
    email: string
    password: string
    full_name: string
    phone?: string
  }): Promise<{ message: string; email: string; expires_in_minutes: number }> => {
    return apiClient.post(
      "/auth/signup-with-otp",
      data,
      { skipAuth: true }
    )
  },

  /**
   * Verify OTP code
   */
  verifyOtp: (
    email: string,
    code: string
  ): Promise<{ message: string; verified: boolean }> => {
    return apiClient.post(
      "/auth/verify-otp",
      { email, code },
      { skipAuth: true }
    )
  },

  /**
   * Resend OTP code
   */
  resendOtp: (
    email: string,
    type: "SIGNUP" | "PASSWORD_RESET" = "SIGNUP"
  ): Promise<{ message: string; email: string; expires_in_minutes: number }> => {
    return apiClient.post(
      "/auth/resend-otp",
      { email, type },
      { skipAuth: true }
    )
  },
}

export default usersApi


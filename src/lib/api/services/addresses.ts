/**
 * Addresses API Service
 * 
 * User address management operations.
 */

import { apiClient } from "../client"

export type AddressType = "SHIPPING" | "BILLING" | "BOTH"

export interface UserAddress {
  id: string
  userId: string
  type: AddressType
  isDefault: boolean
  phone: string | null
  shippingAddress: string
  shippingCity: string
  shippingState: string | null
  shippingZip: string | null
  shippingCountry: string
  billingAddress: string | null
  billingCity: string | null
  billingState: string | null
  billingZip: string | null
  billingCountry: string | null
  label: string | null
  createdAt: string
  updatedAt: string
}

export interface UserAddressCreate {
  type?: AddressType
  is_default?: boolean
  phone?: string | null
  shipping_address: string
  shipping_city: string
  shipping_state?: string | null
  shipping_zip?: string | null
  shipping_country?: string
  billing_address?: string | null
  billing_city?: string | null
  billing_state?: string | null
  billing_zip?: string | null
  billing_country?: string | null
  label?: string | null
}

export interface UserAddressUpdate {
  type?: AddressType
  is_default?: boolean
  phone?: string | null
  shipping_address?: string
  shipping_city?: string
  shipping_state?: string | null
  shipping_zip?: string | null
  shipping_country?: string
  billing_address?: string | null
  billing_city?: string | null
  billing_state?: string | null
  billing_zip?: string | null
  billing_country?: string | null
  label?: string | null
}

export const addressesApi = {
  /**
   * Get all addresses for the current user
   */
  list: (): Promise<UserAddress[]> => {
    return apiClient.get<UserAddress[]>("/addresses")
  },

  /**
   * Get a specific address by ID
   */
  get: (id: string): Promise<UserAddress> => {
    return apiClient.get<UserAddress>(`/addresses/${id}`)
  },

  /**
   * Create a new address
   */
  create: (data: UserAddressCreate): Promise<UserAddress> => {
    return apiClient.post<UserAddress>("/addresses", data)
  },

  /**
   * Update an existing address
   */
  update: (id: string, data: UserAddressUpdate): Promise<UserAddress> => {
    return apiClient.patch<UserAddress>(`/addresses/${id}`, data)
  },

  /**
   * Delete an address
   */
  delete: (id: string): Promise<void> => {
    return apiClient.delete<void>(`/addresses/${id}`)
  },
}

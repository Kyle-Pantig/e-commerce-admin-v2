import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as Philippine Peso currency
 * @param price - The price value to format
 * @param options - Optional formatting options
 * @returns Formatted price string (e.g., "₱1,234.56")
 */
export function formatPrice(
  price: number,
  options?: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  }
): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(price)
}

/**
 * Format a discount value based on type
 * @param value - The discount value
 * @param type - "PERCENTAGE" or "FIXED_AMOUNT"
 * @returns Formatted discount string (e.g., "10%" or "₱100.00")
 */
export function formatDiscount(
  value: number,
  type: "PERCENTAGE" | "FIXED_AMOUNT"
): string {
  if (type === "PERCENTAGE") {
    return `${value}%`
  }
  return formatPrice(value)
}

/**
 * Format a discount badge text
 * @param value - The discount value
 * @param type - "PERCENTAGE" or "FIXED_AMOUNT"
 * @returns Formatted badge text (e.g., "10% OFF" or "₱100 OFF")
 */
export function formatDiscountBadge(
  value: number,
  type: "PERCENTAGE" | "FIXED_AMOUNT"
): string {
  if (type === "PERCENTAGE") {
    return `${value}% OFF`
  }
  return `${formatPrice(value)} OFF`
}



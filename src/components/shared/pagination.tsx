/**
 * Reusable Pagination Component
 * 
 * Standardized pagination controls for tables and lists.
 * 
 * @example
 * <Pagination
 *   page={page}
 *   totalPages={totalPages}
 *   total={total}
 *   perPage={perPage}
 *   onPageChange={setPage}
 * />
 */

"use client"

import { Button } from "@/components/ui/button"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

export interface PaginationProps {
  /** Current page number (1-indexed) */
  page: number
  /** Total number of pages */
  totalPages: number
  /** Total number of items */
  total: number
  /** Items per page */
  perPage: number
  /** Callback when page changes */
  onPageChange: (page: number) => void
  /** Optional className */
  className?: string
}

export function Pagination({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const startItem = (page - 1) * perPage + 1
  const endItem = Math.min(page * perPage, total)

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <p className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {total} items
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          <IconChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
          <IconChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}


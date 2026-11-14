import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface PaginationProps {
  /** 1-based current page. */
  page: number
  size: number
  total: number
  onPageChange: (page: number) => void
  className?: string
  disabled?: boolean
}

/** "Showing 1–20 of 57" with previous/next controls. Matches the API's Page<T> shape. */
export function Pagination({ page, size, total, onPageChange, className, disabled = false }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(size, 1)))
  const from = total === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(page * size, total)

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex flex-col items-center justify-between gap-3 text-sm sm:flex-row', className)}
    >
      <p className="text-muted-foreground tabular">
        {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft />
          Previous
        </Button>
        <span className="min-w-16 text-center text-muted-foreground tabular">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}

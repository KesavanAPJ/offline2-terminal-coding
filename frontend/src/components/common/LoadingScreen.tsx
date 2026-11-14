import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface LoadingScreenProps {
  label?: string
  /** Fill the viewport (route guards) instead of the content area. */
  fullScreen?: boolean
  className?: string
}

/** Centered spinner used by route guards and Suspense fallbacks. */
export function LoadingScreen({ label = 'Loading…', fullScreen = false, className }: LoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3 text-muted-foreground',
        fullScreen ? 'min-h-screen' : 'min-h-[40vh]',
        className,
      )}
    >
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface GradientButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: ReactNode
  /** Show a spinner and disable the button. */
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses: Record<NonNullable<GradientButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

/** Primary call-to-action button with indigo→violet gradient and hover/tap motion. */
export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(function GradientButton(
  { className, children, loading = false, disabled, size = 'md', type = 'button', ...props },
  ref,
) {
  const isDisabled = disabled || loading
  return (
    <motion.button
      ref={ref}
      type={type}
      whileHover={isDisabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-white shadow-md shadow-primary/20 outline-none',
        'bg-gradient-to-r from-gradient-from to-gradient-to transition-shadow hover:shadow-lg hover:shadow-primary/30',
        'focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </motion.button>
  )
})

import { motion, type HTMLMotionProps } from 'framer-motion'

import { cn } from '@/lib/utils'

export interface GlassCardProps extends HTMLMotionProps<'div'> {
  /** Disable the hover lift (e.g. for large content panels). */
  static?: boolean
  /** Remove default padding. */
  flush?: boolean
}

/** Translucent card with blur, subtle border and hover elevation. */
export function GlassCard({ className, static: isStatic = false, flush = false, children, ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      whileHover={isStatic ? undefined : { y: -3 }}
      className={cn(
        'rounded-2xl border border-border/60 bg-card/80 text-card-foreground shadow-sm backdrop-blur-lg transition-shadow',
        !isStatic && 'hover:shadow-lg hover:shadow-primary/5',
        !flush && 'p-6',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}

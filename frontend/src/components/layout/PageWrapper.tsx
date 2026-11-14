import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'

export interface PageWrapperProps {
  children: ReactNode
  className?: string
}

/** Fades/slides every page in. Use as the outermost element of each page component. */
export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('flex w-full flex-col gap-6', className)}
    >
      {children}
    </motion.div>
  )
}

import { Children, isValidElement, type ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'

import { cn } from '@/lib/utils'

export interface AnimatedListProps {
  children: ReactNode
  className?: string
  itemClassName?: string
  /** Delay between children, in seconds. */
  stagger?: number
}

const containerVariants = (stagger: number): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger } },
})

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

/** Staggered fade-in list. Uses child `key`s when present for stable identity. */
export function AnimatedList({ children, className, itemClassName, stagger = 0.06 }: AnimatedListProps) {
  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants(stagger)} className={className}>
      {Children.toArray(children).map((child, index) => (
        <motion.div
          key={isValidElement(child) && child.key !== null ? child.key : index}
          variants={itemVariants}
          className={cn(itemClassName)}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

import type { ReactNode } from 'react'

import { Brand } from '@/components/layout/Brand'
import { MeshBackground } from '@/components/layout/MeshBackground'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'

export interface AuthLayoutProps {
  title: string
  description?: ReactNode
  children: ReactNode
  /** Content below the card, e.g. "Don't have an account? Sign up". */
  footer?: ReactNode
}

/** Centered card layout for /login and /register (no app chrome). */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <MeshBackground />
      <PageWrapper className="w-full max-w-md items-stretch">
        <Brand to={null} className="justify-center" />
        <GlassCard static className="space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
        </GlassCard>
        {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
      </PageWrapper>
    </div>
  )
}

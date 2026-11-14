import type { ReactNode } from 'react'
import { KeyRound, UserRound } from 'lucide-react'

import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { ProfileForm } from '@/components/auth/ProfileForm'
import { PageHeader } from '@/components/common/PageHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/format'

interface SectionHeadingProps {
  icon: ReactNode
  title: string
  description: string
}

function SectionHeading({ icon, title, description }: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5">
        {icon}
      </span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

/** /profile: edit name/email and change password. */
export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <PageWrapper>
      <PageHeader
        title="Profile"
        description={
          user
            ? `Signed in as ${user.email} · Member since ${formatDate(user.created_at)}`
            : 'Update your name, email and password.'
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard static className="space-y-5">
          <SectionHeading
            icon={<UserRound aria-hidden="true" />}
            title="Personal details"
            description="Your name and sign-in email."
          />
          {user ? (
            <ProfileForm user={user} />
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="ml-auto h-10 w-32" />
            </div>
          )}
        </GlassCard>
        <GlassCard static className="space-y-5">
          <SectionHeading
            icon={<KeyRound aria-hidden="true" />}
            title="Change password"
            description="Changing it signs out your other sessions."
          />
          <ChangePasswordForm />
        </GlassCard>
      </div>
    </PageWrapper>
  )
}

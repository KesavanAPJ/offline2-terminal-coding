import type { ReactNode } from 'react'
import { AlertTriangle, Building2, Image as ImageIcon, ReceiptText, RefreshCw } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { BusinessProfileForm } from '@/components/settings/BusinessProfileForm'
import { InvoiceDefaultsForm } from '@/components/settings/InvoiceDefaultsForm'
import { LogoUploader } from '@/components/settings/LogoUploader'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/services/api'
import { useBusinessProfile } from '@/services/settingsService'

interface SectionProps {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
  className?: string
}

function SettingsSection({ icon, title, description, children, className }: SectionProps) {
  return (
    <GlassCard static className={className}>
      <div className="mb-5 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gradient-from/15 to-gradient-to/15 text-primary [&_svg]:size-5">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </GlassCard>
  )
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Loading settings">
      <div className="space-y-6 lg:col-span-2">
        {[0, 1].map((card) => (
          <div key={card} className="space-y-4 rounded-2xl border border-border/60 bg-card/80 p-6">
            <Skeleton className="h-6 w-48" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((field) => (
                <div key={field} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-2xl border border-border/60 bg-card/80 p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  )
}

/** /settings — business profile, invoice defaults and logo. */
export default function SettingsPage() {
  const { data: profile, isPending, isError, error, refetch, isRefetching } = useBusinessProfile()

  return (
    <PageWrapper>
      <PageHeader title="Business settings" description="Your business profile, logo and invoice defaults." />

      {isPending ? (
        <SettingsSkeleton />
      ) : isError || !profile ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load your settings"
          description={getErrorMessage(error)}
          action={
            <Button variant="outline" onClick={() => void refetch()} disabled={isRefetching}>
              <RefreshCw className={isRefetching ? 'animate-spin' : undefined} aria-hidden="true" />
              Try again
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SettingsSection
              icon={<Building2 aria-hidden="true" />}
              title="Business profile"
              description="Shown in the “From” section of your invoices."
            >
              <BusinessProfileForm profile={profile} />
            </SettingsSection>

            <SettingsSection
              icon={<ReceiptText aria-hidden="true" />}
              title="Invoice defaults"
              description="Pre-filled on every new invoice. You can still change them per invoice."
            >
              <InvoiceDefaultsForm profile={profile} />
            </SettingsSection>
          </div>

          <SettingsSection
            icon={<ImageIcon aria-hidden="true" />}
            title="Logo"
            description="Appears on invoices, PDFs and the public invoice page."
            className="lg:sticky lg:top-6"
          >
            <LogoUploader profile={profile} />
          </SettingsSection>
        </div>
      )}
    </PageWrapper>
  )
}

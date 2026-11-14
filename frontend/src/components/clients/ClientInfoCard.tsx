import type { ReactNode } from 'react'
import { Building2, CalendarDays, FileText, Hash, Mail, MapPin, Phone, type LucideIcon } from 'lucide-react'

import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import type { Client } from '@/types'

interface InfoRowProps {
  icon: LucideIcon
  label: string
  children: ReactNode
}

function InfoRow({ icon: Icon, label, children }: InfoRowProps) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm break-words whitespace-pre-line">{children}</dd>
      </div>
    </div>
  )
}

export interface ClientInfoCardProps {
  client: Client | undefined
  loading?: boolean
}

/** Contact details of a client. */
export function ClientInfoCard({ client, loading = false }: ClientInfoCardProps) {
  if (loading || !client) {
    return (
      <GlassCard static className="space-y-4">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </GlassCard>
    )
  }

  const hasContact = Boolean(client.email || client.phone || client.company || client.address || client.tax_id)

  return (
    <GlassCard static className="space-y-4">
      <h2 className="text-base font-semibold">Contact</h2>
      <dl className="space-y-4">
        {client.email && (
          <InfoRow icon={Mail} label="Email">
            <a href={`mailto:${client.email}`} className="text-primary hover:underline">
              {client.email}
            </a>
          </InfoRow>
        )}
        {client.phone && (
          <InfoRow icon={Phone} label="Phone">
            <a href={`tel:${client.phone}`} className="hover:underline">
              {client.phone}
            </a>
          </InfoRow>
        )}
        {client.company && (
          <InfoRow icon={Building2} label="Company">
            {client.company}
          </InfoRow>
        )}
        {client.address && (
          <InfoRow icon={MapPin} label="Address">
            {client.address}
          </InfoRow>
        )}
        {client.tax_id && (
          <InfoRow icon={Hash} label="Tax ID">
            {client.tax_id}
          </InfoRow>
        )}
        {!hasContact && <p className="text-sm text-muted-foreground">No contact details yet.</p>}
        <InfoRow icon={CalendarDays} label="Client since">
          {formatDate(client.created_at)}
        </InfoRow>
        {client.notes && (
          <InfoRow icon={FileText} label="Notes">
            <span className="text-muted-foreground">{client.notes}</span>
          </InfoRow>
        )}
      </dl>
    </GlassCard>
  )
}

export default ClientInfoCard

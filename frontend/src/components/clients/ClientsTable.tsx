import { useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, Mail, Phone } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { GlassCard } from '@/components/ui/GlassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Client } from '@/types'

export interface ClientsTableProps {
  clients: Client[]
  loading?: boolean
  /** Number of skeleton rows while loading. */
  skeletonRows?: number
  /** Dim rows while a new page / search loads. */
  stale?: boolean
}

/** Client list: table on desktop, cards on mobile. Rows open the client detail page. */
export function ClientsTable({ clients, loading = false, skeletonRows = 6, stale = false }: ClientsTableProps) {
  const navigate = useNavigate()
  const open = (id: number) => navigate(`/clients/${id}`)
  const skeletons = Array.from({ length: skeletonRows }, (_, i) => i)

  return (
    <div className={cn('transition-opacity', stale && 'opacity-60')} aria-busy={loading || stale || undefined}>
      {/* Desktop table */}
      <GlassCard static flush className="hidden overflow-hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Client</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="pr-6 text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? skeletons.map((i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="pr-6">
                      <Skeleton className="ml-auto h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              : clients.map((client) => (
                  <TableRow
                    key={client.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ${client.name}`}
                    onClick={() => open(client.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        open(client.id)
                      }
                    }}
                    className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    <TableCell className="pl-6">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                            {initials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{client.name}</p>
                          {client.company && (
                            <p className="truncate text-xs text-muted-foreground">{client.company}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground">{client.email ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{client.phone ?? '—'}</TableCell>
                    <TableCell className="pr-6 text-right text-muted-foreground tabular">
                      {formatDate(client.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </GlassCard>

      {/* Mobile cards */}
      <ul className="flex flex-col gap-3 md:hidden">
        {loading
          ? skeletons.map((i) => (
              <li key={i}>
                <GlassCard static className="flex items-center gap-3 p-4">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </GlassCard>
              </li>
            ))
          : clients.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => open(client.id)}
                  className="w-full rounded-2xl text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <GlassCard className="flex items-center gap-3 p-4">
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
                        {initials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium">{client.name}</p>
                      {client.company && (
                        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <Building2 className="size-3 shrink-0" aria-hidden="true" />
                          {client.company}
                        </p>
                      )}
                      {client.email && (
                        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <Mail className="size-3 shrink-0" aria-hidden="true" />
                          {client.email}
                        </p>
                      )}
                      {client.phone && (
                        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <Phone className="size-3 shrink-0" aria-hidden="true" />
                          {client.phone}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </GlassCard>
                </button>
              </li>
            ))}
      </ul>
    </div>
  )
}

export default ClientsTable

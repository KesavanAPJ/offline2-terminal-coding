import { Skeleton } from '@/components/ui/skeleton'

/** Placeholder while the invoice form's defaults (profile, client, invoice) load. */
export function InvoiceFormSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-busy="true" aria-label="Loading">
      <div className="space-y-6">
        <div className="space-y-4 rounded-2xl border p-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border p-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}

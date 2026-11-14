import { useState } from 'react'

import { formatDate, formatMoney, formatPercent, toDecimal } from '@/lib/format'
import { cn } from '@/lib/utils'
import { resolveApiUrl } from '@/services/api'

import type { InvoicePreviewData } from './invoicePreviewData'

export interface InvoicePreviewProps {
  data: InvoicePreviewData
  className?: string
}

function MultiLine({ text, className }: { text: string | null | undefined; className?: string }) {
  if (!text) return null
  return <p className={cn('whitespace-pre-line', className)}>{text}</p>
}

function BusinessLogo({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src={src}
      alt={alt}
      className="mb-3 max-h-16 max-w-48 object-contain"
      onError={() => setFailed(true)}
    />
  )
}

/** Paper-like invoice rendering, shared by the detail page and the public invoice page. */
export function InvoicePreview({ data, className }: InvoicePreviewProps) {
  const { business, client, currency } = data
  const logo = resolveApiUrl(business?.logo_url)
  const businessName = business?.business_name || 'Your business'
  const hasDiscount = toDecimal(data.discount).greaterThan(0)
  const hasTax = toDecimal(data.taxRate).greaterThan(0) || toDecimal(data.taxAmount).greaterThan(0)
  const isPaid = data.status === 'paid'

  return (
    <article
      aria-label={`Invoice ${data.invoiceNumber}`}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl shadow-slate-900/5 sm:p-10',
        'print:rounded-none print:border-0 print:p-0 print:shadow-none',
        className,
      )}
    >
      {isPaid && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
        >
          <span className="-rotate-[24deg] rounded-xl border-8 border-emerald-500/25 px-8 py-2 text-7xl font-black tracking-widest text-emerald-500/20 sm:text-8xl">
            PAID
          </span>
        </div>
      )}

      <header className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 text-sm text-slate-600">
          {logo && <BusinessLogo key={logo} src={logo} alt={`${businessName} logo`} />}
          <p className="text-base font-semibold text-slate-900">{businessName}</p>
          <MultiLine text={business?.address} />
          {business?.email && <p>{business.email}</p>}
          {business?.phone && <p>{business.phone}</p>}
          {business?.tax_id && <p>Tax ID: {business.tax_id}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-3xl font-semibold tracking-tight text-slate-900">Invoice</p>
          <p className="mt-1 font-mono text-sm text-slate-500">{data.invoiceNumber}</p>
          {isPaid && (
            <span className="mt-2 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Paid{data.paidAt ? ` · ${formatDate(data.paidAt)}` : ''}
            </span>
          )}
        </div>
      </header>

      <section className="relative mt-8 grid gap-6 border-y border-slate-200 py-6 text-sm sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bill to</p>
          <p className="mt-1 font-semibold text-slate-900">{client.name}</p>
          {client.company && <p className="text-slate-600">{client.company}</p>}
          <MultiLine text={client.address} className="text-slate-600" />
          {client.email && <p className="text-slate-600">{client.email}</p>}
          {client.tax_id && <p className="text-slate-600">Tax ID: {client.tax_id}</p>}
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 self-start">
          <dt className="text-slate-500">Issue date</dt>
          <dd className="text-right font-medium">{formatDate(data.issueDate)}</dd>
          <dt className="text-slate-500">Due date</dt>
          <dd className="text-right font-medium">{formatDate(data.dueDate)}</dd>
          <dt className="text-slate-500">Amount due</dt>
          <dd className="text-right font-semibold tabular">
            {formatMoney(isPaid ? '0' : data.total, currency)}
          </dd>
        </dl>
      </section>

      <div className="relative mt-6 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-4 font-semibold">Description</th>
              <th className="py-2 pr-4 text-right font-semibold">Qty</th>
              <th className="py-2 pr-4 text-right font-semibold">Unit price</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={`${index}-${item.description}`} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 whitespace-pre-line">{item.description}</td>
                <td className="py-3 pr-4 text-right tabular">{toDecimal(item.quantity).toString()}</td>
                <td className="py-3 pr-4 text-right tabular">{formatMoney(item.unit_price, currency)}</td>
                <td className="py-3 text-right font-medium tabular">{formatMoney(item.amount, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="relative mt-6 flex justify-end">
        <dl className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="tabular">{formatMoney(data.subtotal, currency)}</dd>
          </div>
          {hasDiscount && (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Discount</dt>
              <dd className="tabular">−{formatMoney(data.discount, currency)}</dd>
            </div>
          )}
          {hasTax && (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Tax ({formatPercent(data.taxRate)})</dt>
              <dd className="tabular">{formatMoney(data.taxAmount, currency)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4 border-t border-slate-200 pt-3">
            <dt className="font-semibold">Total</dt>
            <dd className="text-xl font-semibold tracking-tight tabular">{formatMoney(data.total, currency)}</dd>
          </div>
        </dl>
      </div>

      {(data.notes || business?.payment_instructions) && (
        <footer className="relative mt-10 grid gap-6 border-t border-slate-200 pt-6 text-sm text-slate-600 sm:grid-cols-2">
          {business?.payment_instructions && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Payment instructions</p>
              <MultiLine text={business.payment_instructions} className="mt-1" />
            </div>
          )}
          {data.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</p>
              <MultiLine text={data.notes} className="mt-1" />
            </div>
          )}
        </footer>
      )}
    </article>
  )
}

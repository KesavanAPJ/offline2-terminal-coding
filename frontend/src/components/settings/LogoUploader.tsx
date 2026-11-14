import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ImageUp, Loader2, RefreshCw, Trash2, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getErrorMessage, resolveApiUrl } from '@/services/api'
import type { BusinessProfile } from '@/types/settings'

import { ACCEPTED_LOGO_INPUT, MAX_LOGO_SIZE_BYTES, formatBytes, validateLogoFile } from './settingsSchemas'
import { useDeleteLogo, useUploadLogo } from './useSettingsMutations'

export interface LogoUploaderProps {
  profile: BusinessProfile
}

/** A file awaiting replace confirmation, with an object URL for its preview. */
interface PendingLogo {
  file: File
  previewUrl: string
}

/** Drag & drop / click-to-browse logo upload with preview, replace and remove. */
export function LogoUploader({ profile }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const helpId = useId()
  const [pending, setPending] = useState<PendingLogo | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  const upload = useUploadLogo()
  const remove = useDeleteLogo()
  const busy = upload.isPending || remove.isPending

  const logoUrl = resolveApiUrl(profile.logo_url)
  const hasLogo = Boolean(logoUrl)
  const imageFailed = logoUrl !== null && failedUrl === logoUrl

  // Revoke the preview object URL when it is replaced/cleared or on unmount.
  useEffect(() => {
    if (!pending) return undefined
    return () => URL.revokeObjectURL(pending.previewUrl)
  }, [pending])

  const doUpload = (file: File): void => {
    upload.mutate(file, {
      onSuccess: () => {
        setPending(null)
        toast.success(hasLogo ? 'Logo replaced' : 'Logo uploaded')
      },
      onError: (err: unknown) => {
        const message = getErrorMessage(err, 'Could not upload the logo.')
        setError(message)
        toast.error(message)
      },
    })
  }

  const handleFile = (file: File | undefined): void => {
    if (!file || busy) return
    const problem = validateLogoFile(file)
    if (problem) {
      setError(problem)
      toast.error(problem)
      return
    }
    setError(null)
    if (hasLogo) {
      // Ask before replacing the current logo.
      setPending({ file, previewUrl: URL.createObjectURL(file) })
    } else {
      doUpload(file)
    }
  }

  const openPicker = (): void => {
    if (!busy) inputRef.current?.click()
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    handleFile(event.target.files?.[0])
    event.target.value = '' // allow re-selecting the same file
  }

  const onDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.dataTransfer.dropEffect = busy ? 'none' : 'copy'
    if (!busy) setDragActive(true)
  }

  const onDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setDragActive(false)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    setDragActive(false)
    const files = event.dataTransfer.files
    if (files.length > 1) toast.info('Only the first file was used.')
    handleFile(files[0])
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPicker()
    }
  }

  const confirmReplace = (): void => {
    if (pending) doUpload(pending.file)
  }

  const confirmDelete = (): void => {
    remove.mutate(undefined, {
      onSuccess: () => {
        setConfirmRemove(false)
        setError(null)
        toast.success('Logo removed')
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err, 'Could not remove the logo.'))
      },
    })
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-label={
          hasLogo ? 'Replace logo: drop an image or press to browse' : 'Upload logo: drop an image or press to browse'
        }
        aria-disabled={busy || undefined}
        aria-describedby={helpId}
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'relative flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed p-6 text-center outline-none transition-colors',
          'focus-visible:ring-[3px] focus-visible:ring-ring/50',
          dragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-accent/40',
          busy && 'cursor-progress opacity-80',
          error && !dragActive && 'border-destructive/60',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {hasLogo && logoUrl && !imageFailed ? (
            <motion.img
              key={logoUrl}
              src={logoUrl}
              alt={profile.business_name ? `${profile.business_name} logo` : 'Business logo'}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onError={() => setFailedUrl(logoUrl)}
              className="max-h-32 max-w-full rounded-md object-contain"
            />
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {hasLogo ? (
                  <ImageUp className="size-6" aria-hidden="true" />
                ) : (
                  <UploadCloud className="size-6" aria-hidden="true" />
                )}
              </div>
              <p className="text-sm font-medium">
                {hasLogo ? 'Logo preview unavailable' : dragActive ? 'Drop to upload' : 'Drag & drop your logo here'}
              </p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </motion.div>
          )}
        </AnimatePresence>

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
            <span className="sr-only">{upload.isPending ? 'Uploading logo…' : 'Removing logo…'}</span>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_LOGO_INPUT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onInputChange}
          onClick={(event) => event.stopPropagation()}
        />
      </div>

      <p id={helpId} className="text-sm text-muted-foreground">
        PNG, JPEG or WebP, up to {formatBytes(MAX_LOGO_SIZE_BYTES)}. SVG is not supported. A wide logo on a transparent
        background looks best on invoices.
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {hasLogo && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openPicker} disabled={busy}>
            <RefreshCw aria-hidden="true" />
            Replace
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmRemove(true)}
            disabled={busy}
          >
            <Trash2 aria-hidden="true" />
            Remove
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title="Replace your logo?"
        description={
          <span className="flex flex-col items-center gap-3 pt-2">
            {pending && (
              <img
                src={pending.previewUrl}
                alt="New logo preview"
                className="max-h-24 max-w-full rounded-md object-contain"
              />
            )}
            <span>
              {pending?.file.name} will replace your current logo on all invoices, including ones already shared.
            </span>
          </span>
        }
        confirmLabel="Replace logo"
        loading={upload.isPending}
        onConfirm={confirmReplace}
      />

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove your logo?"
        description="Your invoices will no longer show a logo. You can upload a new one at any time."
        confirmLabel="Remove logo"
        destructive
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

export default LogoUploader

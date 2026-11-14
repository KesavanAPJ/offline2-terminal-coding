import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * App-wide toast host (shadcn/ui `sonner`). Theme follows the `dark` class on <html>.
 * Colors come from Tailwind theme tokens via `toastOptions.classNames` (no inline styles).
 */
function Toaster({ ...props }: ToasterProps) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  return (
    <Sonner
      theme={isDark ? 'dark' : 'light'}
      className="toaster group"
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'group toast bg-popover text-popover-foreground border-border shadow-lg',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

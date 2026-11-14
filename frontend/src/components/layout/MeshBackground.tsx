/** Decorative gradient mesh for auth / public pages. */
export function MeshBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-background to-violet-50 dark:from-indigo-950/40 dark:via-background dark:to-violet-950/40" />
      <div className="absolute -top-24 left-1/4 size-96 animate-pulse rounded-full bg-indigo-300/30 blur-3xl dark:bg-indigo-500/20" />
      <div className="absolute right-1/4 -bottom-24 size-96 animate-pulse rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-500/20" />
    </div>
  )
}

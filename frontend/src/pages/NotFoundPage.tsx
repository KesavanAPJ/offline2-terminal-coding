import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { MeshBackground } from '@/components/layout/MeshBackground'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <MeshBackground />
      <PageWrapper className="max-w-lg">
        <EmptyState
          icon={FileQuestion}
          title="404 — Page not found"
          description="The page you're looking for doesn't exist or has moved."
          action={
            <Button asChild>
              <Link to="/">Go home</Link>
            </Button>
          }
        />
      </PageWrapper>
    </div>
  )
}

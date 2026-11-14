import { Link, useLocation, useNavigate } from 'react-router-dom'

import { LoginForm } from '@/components/auth/LoginForm'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useNextPath } from '@/hooks/useNextPath'

/** /login: email/password sign-in; redirects to `?next=` (or /dashboard) on success. */
export default function LoginPage() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const next = useNextPath()

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your InvoiceFlow account."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to={`/register${search}`} className="font-medium text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm onSuccess={() => navigate(next, { replace: true })} />
    </AuthLayout>
  )
}

import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { RegisterForm } from '@/components/auth/RegisterForm'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useNextPath } from '@/hooks/useNextPath'

/** /register: create an account, sign in and redirect to `?next=` (or /dashboard). */
export default function RegisterPage() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const next = useNextPath()

  return (
    <AuthLayout
      title="Create your account"
      description="Start sending professional invoices in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to={`/login${search}`} className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm
        onSuccess={(user) => {
          toast.success(user.full_name ? `Welcome to InvoiceFlow, ${user.full_name}!` : 'Welcome to InvoiceFlow!')
          navigate(next, { replace: true })
        }}
      />
    </AuthLayout>
  )
}

import { FC, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import BrandLogo from '@/components/atoms/BrandLogo'

const EyeIcon: FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
)

const EyeOffIcon: FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
)

/**
 * Super Admin (platform admin) sign-in.
 *
 * Lives at /auth/super-admin-login. Strict role check — only accounts with
 * server role `ADMIN` are accepted. Anything else is signed back out with a
 * friendly error.
 *
 * Reachable from the Administrators hub (/auth/administrators). Legacy
 * /auth/admin-login still redirects here.
 */
const SuperAdminLoginPage: FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const sessionExpired = searchParams.get('session') === 'expired'

  const [formData, setFormData] = useState({ email: '', password: '' })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) clearError()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const loggedInUser = await login(formData.email, formData.password)
      const role = loggedInUser?.role?.toString?.().toUpperCase?.()

      if (role !== 'ADMIN') {
        useAuthStore.getState().logout()
        useAuthStore.setState({
          error: 'These credentials are not for a platform admin account.',
        })
        return
      }
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <BrandLogo to={null} size="lg" className="text-white [&_.text-primary]:text-white" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-300/30 text-indigo-100 text-xs font-medium uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Platform admin access
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-white">Super Admin Sign In</h2>
          <p className="mt-1 text-sm text-white/70">
            Restricted access. Activity is audit-logged.
          </p>
        </div>

        <Link
          to="/auth/administrators"
          className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to administrators
        </Link>

        <form
          className="space-y-5 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6"
          onSubmit={handleSubmit}
        >
          {sessionExpired && !error && (
            <div className="rounded-md p-3 bg-amber-500/20 border border-amber-400/30">
              <div className="text-sm text-amber-100">
                Your session has expired. Please sign in again to continue.
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-md p-3 bg-red-500/20 border border-red-400/30">
              <div className="text-sm text-red-100">{error}</div>
            </div>
          )}

          <div className="space-y-3">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full px-3 py-2.5 border border-white/20 bg-white/10 text-white placeholder-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 sm:text-sm"
              placeholder="Admin email"
              value={formData.email}
              onChange={handleChange}
            />
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="block w-full px-3 py-2.5 pr-10 border border-white/20 bg-white/10 text-white placeholder-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 z-10 text-white/60 hover:text-white"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-indigo-500 border-white/30 rounded bg-white/10"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-white/80">
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            {isLoading ? 'Signing in…' : 'Sign in as Super Admin'}
          </button>

          <p className="text-center text-xs text-white/50 pt-2 border-t border-white/10">
            Looking for the regular sign in?{' '}
            <Link to="/auth/login" className="text-indigo-300 hover:text-indigo-200 underline">
              Switch to user sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default SuperAdminLoginPage

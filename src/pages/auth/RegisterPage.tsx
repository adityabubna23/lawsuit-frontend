import { FC, useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/atoms/Button'
import BrandLogo from '@/components/atoms/BrandLogo'
import LanguageSwitcher from '@/components/molecules/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { User as UserIcon, Scale, Building2, ArrowLeft, ArrowRight, ShieldCheck, Check } from 'lucide-react'

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

// Password strength — mirrors lawsuit-app's RegisterScreen so the rules feel
// identical across web + mobile. One point each for length ≥ 8, an uppercase
// letter, a lowercase letter, a digit, and a special character. score ≤ 2 →
// Weak, ≤ 3 → Medium, else Strong.
const PASSWORD_RULES: { id: string; label: string; test: (p: string) => boolean }[] = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

const getPasswordStrength = (pw: string) => {
  const score = PASSWORD_RULES.reduce((acc, r) => acc + (r.test(pw) ? 1 : 0), 0)
  if (score <= 2) return { score, label: 'Weak', percent: 33, barClass: 'bg-red-500', textClass: 'text-red-600' }
  if (score <= 3) return { score, label: 'Medium', percent: 66, barClass: 'bg-amber-500', textClass: 'text-amber-600' }
  return { score, label: 'Strong', percent: 100, barClass: 'bg-green-600', textClass: 'text-green-600' }
}

type RegisterRole = 'client' | 'lawyer' | 'organization'

const ROLE_CARDS: {
  id: RegisterRole
  label: string
  short: string
  description: string
  icon: FC<{ className?: string }>
}[] = [
  {
    id: 'client',
    label: 'I want to be a Client',
    short: 'Client',
    description: 'Find lawyers, book consultations, file & manage cases.',
    icon: UserIcon,
  },
  {
    id: 'lawyer',
    label: 'I want to be a Lawyer',
    short: 'Lawyer',
    description: 'Practising advocate or mediator on the NyayaX panel.',
    icon: Scale,
  },
  {
    id: 'organization',
    label: 'Sign up as Law Firm',
    short: 'Law Firm',
    description: 'A multi-lawyer organization assigning work to your team.',
    icon: Building2,
  },
]

const RegisterPage: FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { register, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  // Client-side validation errors (password rules / mismatch) shown separately
  // from the server `error` so they clear independently as the user types.
  const [formError, setFormError] = useState<string | null>(null)

  // `?role=` from a deep-link (e.g. from the login page's "Sign up" CTA).
  const initialRole = (() => {
    const r = searchParams.get('role')
    if (r === 'lawyer' || r === 'organization' || r === 'client') return r
    return null
  })()

  // Step 1: pick a role. Step 2: fill in fields.
  const [step, setStep] = useState<'pick' | 'form'>(initialRole ? 'form' : 'pick')
  const [role, setRole] = useState<RegisterRole>(initialRole ?? 'client')

  useEffect(() => {
    const r = searchParams.get('role')
    if (r === 'lawyer' || r === 'organization' || r === 'client') {
      setRole(r)
      setStep('form')
    }
  }, [searchParams])

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    registrationNumber: '',
    pincode: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) clearError()
    if (formError) setFormError(null)
  }

  const strength = getPasswordStrength(formData.password)
  // Only flag a mismatch once the user has started typing the confirmation —
  // don't shout "Passwords do not match" at an empty field.
  const passwordsMismatch = confirmPassword.length > 0 && formData.password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (formData.password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }
    try {
      const payload: any = { ...formData, role }
      if (role === 'organization') {
        if (!payload.registrationNumber) delete payload.registrationNumber
        if (!payload.pincode) delete payload.pincode
      } else {
        delete payload.registrationNumber
        delete payload.pincode
      }
      await register(payload)
      navigate('/auth/otp-verify', { state: { identifier: formData.email } })
    } catch (err) {
      console.error('Registration failed:', err)
    }
  }

  const activeCard = ROLE_CARDS.find(c => c.id === role) ?? ROLE_CARDS[0]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      {/* Back to the landing page — top-left, mirrors the language switcher. */}
      <Link
        to="/"
        className="absolute top-4 left-4 z-50 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4" /> Back to home
      </Link>
      {/* Language switcher — top-right corner, same behaviour as the in-app one. */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <div className={`${step === 'pick' ? 'max-w-3xl' : 'max-w-xl'} w-full`}>
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            {/* Clickable brand → landing page (universal convention). */}
            <BrandLogo to="/" size="lg" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            {step === 'pick' ? 'Create your NyayaX account' : `Sign up as ${activeCard.short}`}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {step === 'pick' ? 'Tell us what you want to be on NyayaX' : 'Just a few details to get you started'}
          </p>
          {/* Explicit language choice during sign-up — sets the app language
              for the whole session (persists). Same switcher as the top-right. */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5">
            <span className="text-xs text-gray-500">{t('language.select')}:</span>
            <LanguageSwitcher />
          </div>
        </div>

        {step === 'pick' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ROLE_CARDS.map(card => {
                const Icon = card.icon
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      setRole(card.id)
                      setStep('form')
                    }}
                    className="group text-left bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-primary hover:shadow-md transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="font-semibold text-gray-900 text-base mb-1">{card.label}</div>
                    <div className="text-sm text-gray-500 leading-snug">{card.description}</div>
                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                      Continue <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/auth/login" className="font-medium text-primary hover:text-primary-dark">
                Sign in
              </Link>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep('pick')}
              className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Change role
            </button>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              {/* Active role chip */}
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center">
                  <activeCard.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{activeCard.label}</div>
                  <div className="text-xs text-gray-500">{activeCard.description}</div>
                </div>
              </div>

              {(error || formError) && (
                <div className="rounded-md p-3 bg-red-50 border border-red-100">
                  <div className="text-sm text-red-700">{formError || error}</div>
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {role === 'organization' ? 'Law Firm Name' : 'Full Name'}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary sm:text-sm"
                  placeholder={role === 'organization' ? 'Khanna & Associates LLP' : 'John Doe'}
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary sm:text-sm"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary sm:text-sm"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary sm:text-sm"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                {/* Strength meter + live requirements — only once the user
                    starts typing, to avoid a wall of red on an empty field. */}
                {formData.password.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full ${strength.barClass} transition-all`}
                          style={{ width: `${strength.percent}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${strength.textClass}`}>{strength.label}</span>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                      {PASSWORD_RULES.map(rule => {
                        const met = rule.test(formData.password)
                        return (
                          <li
                            key={rule.id}
                            className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            {met ? (
                              <Check className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 shrink-0 rounded-full border border-gray-300" />
                            )}
                            {rule.label}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    At least 8 characters. Mixing letters, numbers, and a special character is recommended.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className={`block w-full px-3 py-2 pr-10 border placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary sm:text-sm ${passwordsMismatch ? 'border-red-400' : 'border-gray-300'}`}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (error) clearError()
                      if (formError) setFormError(null)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(p => !p)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                {passwordsMismatch && (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                )}
              </div>

              {role === 'organization' && (
                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Law Firm Details</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Optional now — you can add these later in your profile.</p>
                  </div>
                  <div>
                    <label htmlFor="org-registrationNumber" className="block text-sm font-medium text-gray-700 mb-1">Registration Number (optional)</label>
                    <input
                      id="org-registrationNumber"
                      name="registrationNumber"
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary sm:text-sm"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="org-pincode" className="block text-sm font-medium text-gray-700 mb-1">Pincode (optional)</label>
                    <input
                      id="org-pincode"
                      name="pincode"
                      type="text"
                      pattern="\d{6}"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary sm:text-sm"
                      placeholder="6-digit pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full" disabled={isLoading || passwordsMismatch}>
                <span className="inline-flex items-center justify-center gap-2">
                  {isLoading ? 'Creating account…' : 'Create account'}
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </span>
              </Button>

              <div className="text-xs text-center text-gray-500 leading-relaxed">
                By registering, you agree to our{' '}
                <Link to="/terms-of-service" className="font-medium text-primary hover:text-primary-dark">Terms of Service</Link>{' '}
                and{' '}
                <Link to="/privacy-policy" className="font-medium text-primary hover:text-primary-dark">Privacy Policy</Link>.
              </div>

              <div className="pt-2 text-center text-sm text-gray-600 border-t border-gray-100">
                <span className="block pt-3">Already have an account?</span>
                <Link
                  to="/auth/login"
                  className="mt-2 inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg border border-primary/30 text-primary font-medium hover:bg-primary/5 transition-colors"
                >
                  Sign in <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Floating Administrators button — Court Admin + Super Admin live
          behind this single entry point so the public surface stays focused
          on the three user roles. */}
      <Link
        to="/auth/administrators"
        className="fixed bottom-6 right-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium shadow-lg hover:bg-slate-800 transition-colors"
      >
        <ShieldCheck className="w-4 h-4" />
        Administrators
      </Link>
    </div>
  )
}

export default RegisterPage

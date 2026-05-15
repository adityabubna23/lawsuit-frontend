import { FC } from 'react'
import { Link } from 'react-router-dom'
import { Gavel, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import BrandLogo from '@/components/atoms/BrandLogo'

/**
 * Administrators hub.
 *
 * The public sign-in / sign-up surface is restricted to the three user
 * roles (Client / Lawyer / Law Firm). Court Admin and Super Admin entry
 * points are deliberately gated behind this page so the homepage stays
 * focused on consumer + practitioner flows.
 *
 * Reachable from the floating "Administrators" pill on /auth/login and
 * /auth/register.
 */
const AdministratorsPage: FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <BrandLogo to={null} size="lg" className="text-white [&_.text-primary]:text-white" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-300/30 text-indigo-100 text-xs font-medium uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Administrator access
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white">Administrators</h1>
          <p className="mt-2 text-sm text-white/70 max-w-md mx-auto">
            Restricted access. Activity is audit-logged. Choose your administrative role to continue.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Court Admin */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] hover:border-indigo-400/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-100 flex items-center justify-center mb-4">
              <Gavel className="w-6 h-6" />
            </div>
            <div className="font-semibold text-white text-lg mb-1">Court Admin</div>
            <div className="text-sm text-white/70 leading-snug mb-5">
              Verify lawyers, review organization registrations, and manage court verifications.
            </div>
            <Link
              to="/auth/court-admin-login"
              className="block w-full text-center px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                Sign in <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <p className="mt-3 text-xs text-white/60 text-center">
              New here?{' '}
              <Link to="/auth/court-admin-register" className="text-indigo-300 hover:text-indigo-200 underline">
                Register as Court Admin
              </Link>
            </p>
          </div>

          {/* Super Admin */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] hover:border-indigo-400/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-100 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="font-semibold text-white text-lg mb-1">Super Admin</div>
            <div className="text-sm text-white/70 leading-snug mb-5">
              Platform-level administration — users, organizations, payouts, configuration, and audits.
            </div>
            <Link
              to="/auth/super-admin-login"
              className="block w-full text-center px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                Sign in <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <p className="mt-3 text-xs text-white/60 text-center">
              Super Admin accounts are provisioned internally — no self-registration.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to user sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdministratorsPage

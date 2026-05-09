import { FC } from 'react'
import { Link } from 'react-router-dom'
import {
  Scale, ShieldCheck, Globe, Users, Sparkles, Video, Wallet, FileText, Gavel, ArrowRight,
} from 'lucide-react'

const FEATURES = [
  { icon: Scale, title: 'Verified lawyers', body: 'Every lawyer on NyayaX is verified by a court admin via license and bar council proofs.' },
  { icon: Video, title: 'Video consultations', body: 'Secure HD video, audio, or in-person sessions — your choice. Powered by Daily.co with WebRTC fallback.' },
  { icon: Wallet, title: 'Escrow payments', body: 'Consultation fees are held in escrow and released only after the session is completed.' },
  { icon: ShieldCheck, title: 'Aadhaar eKYC', body: 'One-time identity verification keeps every interaction fraud-resistant. Aadhaar numbers are hashed before storage.' },
  { icon: Gavel, title: 'Mediation & cases', body: 'Initiate mediation, file cases, track hearings, and store documents — all linked to a single thread.' },
  { icon: Sparkles, title: 'Legal Eagle AI', body: 'Indian-law-tuned AI assistant for quick answers and document Q&A — never a substitute for licensed advice.' },
  { icon: Globe, title: 'Tele-Law support', body: 'Free legal aid eligibility check under the Government of India scheme, in 22 languages.' },
  { icon: FileText, title: 'Agreement templates', body: 'Lawyers create reusable templates and send them in chat — clients sign digitally and securely.' },
]

const VERSION = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_APP_VERSION) || '1.0.0'

const AboutPage: FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-[#0a3d50] text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-20">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Scale className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-center">NyayaX</h1>
          <p className="text-center text-white/80 mt-3 text-lg">न्यायX · Justice, simplified.</p>
          <p className="max-w-2xl mx-auto text-center mt-6 text-white/90 leading-relaxed">
            India's full-stack legal-tech platform connecting clients, lawyers, court admins, and law firms.
            We make legal help affordable, verifiable, and on-demand.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link to="/app/home" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-white text-primary font-semibold hover:bg-white/90">
              Open the app <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/help" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-white/30 text-white hover:bg-white/10">
              Get help
            </Link>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-primary uppercase tracking-wider">
            <Users className="w-4 h-4" /> Our mission
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Democratize legal access across India.</h2>
          <p className="text-gray-700 leading-relaxed mt-3">
            Hundreds of millions of Indians struggle to access affordable legal help — finding the right lawyer is hard,
            travel is expensive, and trust is scarce. NyayaX brings verified lawyers, secure consultations, and free
            government legal aid into one place. We work alongside court admins to keep the directory authentic, and
            with the Bar Council to keep professionals accountable.
          </p>
          <p className="text-gray-700 leading-relaxed mt-3">
            Whether you need a five-minute Tele-Law conversation or a multi-year representation in a high court matter,
            NyayaX is built to scale with you.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">What's inside</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{f.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Roles served */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Built for everyone in the legal flow</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: 'Clients', body: 'Find, book, consult, file. Your legal toolbox in one app.' },
            { name: 'Lawyers', body: 'Manage appointments, build a practice, get paid on time.' },
            { name: 'Law firms', body: 'Onboard lawyers, route appointments, monitor performance.' },
            { name: 'Court admins', body: 'Verify lawyers and organizations under your jurisdiction.' },
          ].map((r) => (
            <div key={r.name} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-primary font-semibold">{r.name}</div>
              <div className="text-sm text-gray-700 mt-2 leading-relaxed">{r.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer / version */}
      <section className="max-w-4xl mx-auto px-6 pb-16 pt-4">
        <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          <div className="space-x-4">
            <Link to="/privacy-policy" className="hover:text-gray-700">Privacy policy</Link>
            <span className="text-gray-300">·</span>
            <Link to="/terms-of-service" className="hover:text-gray-700">Terms of service</Link>
            <span className="text-gray-300">·</span>
            <Link to="/help" className="hover:text-gray-700">Help</Link>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            NyayaX · Version {VERSION} · © {new Date().getFullYear()} NyayaX. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  )
}

export default AboutPage

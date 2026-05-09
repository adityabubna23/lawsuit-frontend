import { FC, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HelpCircle, Mail, Phone, MessageSquare, ChevronDown, Send, ExternalLink,
  Shield, BookOpen, Bug, Check, AlertCircle,
} from 'lucide-react'
import { reportApi } from '@/services/api'
import { friendlyError } from '@/utils/errors'

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How do I book a consultation?',
    a: 'Search for a lawyer by specialization, open their profile, and click "Book consultation". Pick a date and time slot, choose your preferred meeting type (video, audio, or in-person), and confirm the booking. Payment is held in escrow until the consultation is completed.',
  },
  {
    q: 'How are payments processed?',
    a: 'Payments go through Razorpay (UPI, cards, net banking) or directly from your wallet balance. Consultation fees are held in escrow and released to the lawyer only after the session is marked complete.',
  },
  {
    q: 'Can I cancel an appointment?',
    a: 'Yes — open the appointment from the Appointments tab and click "Cancel". If the lawyer hasn\'t accepted yet, you get a full refund to your wallet. If accepted, refund eligibility depends on the lawyer\'s cancellation policy shown on the booking screen.',
  },
  {
    q: 'How do I contact my lawyer?',
    a: 'Once a consultation is confirmed, a chat thread opens automatically — find it in the Cases page (or Appointments → "Discuss"). You can send text, attachments, and agreement templates.',
  },
  {
    q: 'Why do I need Aadhaar verification?',
    a: 'Aadhaar eKYC confirms you are who you say you are. It is required before booking consultations, filing cases, withdrawing money, or initiating mediation. Your Aadhaar number is hashed before storage and never shown back. We follow UIDAI guidelines.',
  },
  {
    q: 'How does Tele-Law work?',
    a: 'Tele-Law is a Government of India scheme for free legal advice to eligible citizens. Visit the Tele-Law page, check your eligibility (based on caste, gender, income, or EWS), and connect with a lawyer through the 75,000+ Common Service Centres network.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes — communications are encrypted in transit (HTTPS + WSS), passwords are hashed with bcrypt, and sensitive identifiers like Aadhaar are SHA-256 hashed before storage. We never share personal data without your consent.',
  },
  {
    q: 'How do I verify my account?',
    a: 'After signup, we send a 6-digit OTP to your email. Enter it to verify. Lawyers also need to upload license and bar council proofs and submit them to a court admin for KYC verification.',
  },
  {
    q: 'I forgot my password — what now?',
    a: 'On the sign-in page, click "Forgot password" to receive an OTP to your registered email, then set a new password. If you don\'t receive the OTP, check your spam folder or contact support.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Open Payment History from your menu and click "Request refund" on the eligible payment. Provide a reason — our team reviews refund requests within 2 business days.',
  },
]

const HelpCenterPage: FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setSubmitting(true)
    try {
      // Reuse the issue-reporting endpoint so support tickets land in the same
      // admin moderation queue as bug reports — no separate inbox to manage.
      await reportApi.create({
        title: title.trim() || 'Help Center request',
        description: message.trim(),
      })
      showToast("Got it — our support team will reply within 24 hours.", 'success')
      setTitle('')
      setMessage('')
    } catch (err) {
      showToast(friendlyError(err, "Couldn't send your message. Please email us directly."), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <HelpCircle className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
          <p className="text-sm text-gray-500">Quick answers, support, and resources.</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a
          href="mailto:support@nyayax.in"
          className="bg-white border border-gray-100 rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 text-sm">Email support</div>
            <div className="text-xs text-gray-500 mt-0.5 truncate">support@nyayax.in</div>
          </div>
        </a>
        <a
          href="tel:+911800123456"
          className="bg-white border border-gray-100 rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
            <Phone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 text-sm">Call us</div>
            <div className="text-xs text-gray-500 mt-0.5">Mon–Sat, 9 AM – 7 PM IST</div>
          </div>
        </a>
        <Link
          to="/app/report-issue"
          className="bg-white border border-gray-100 rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Bug className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 text-sm">Report a bug</div>
            <div className="text-xs text-gray-500 mt-0.5">Track and fix in-app</div>
          </div>
        </Link>
      </div>

      {/* FAQ accordion */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Frequently asked questions</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {FAQ.map((item, idx) => {
            const open = openIdx === idx
            return (
              <div key={idx}>
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : idx)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50"
                  aria-expanded={open}
                >
                  <span className="text-sm font-medium text-gray-900">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Contact form */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Send us a message</h2>
        </div>
        <p className="text-xs text-gray-500">
          For account / payment issues, we'll reply within 24 hours. For bugs, use the "Report a bug" tile above —
          your message goes to the same admin support queue.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Short summary of your question"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's going on…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !title.trim() || !message.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <span className="w-4 h-4 inline-block border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitting ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>

      {/* Resources */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Resources</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <Link to="/about" className="inline-flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200">
            About NyayaX <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </Link>
          <Link to="/privacy-policy" className="inline-flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200">
            Privacy policy <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </Link>
          <Link to="/terms-of-service" className="inline-flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200">
            Terms of service <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
          </Link>
        </div>
      </div>

      {toast && (
        <div className="fixed right-6 bottom-6 z-50">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}

export default HelpCenterPage

import { FC, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '@/components/atoms/Button'
import { useAuthStore } from '@/stores/authStore'
import LanguageSwitcher from '@/components/molecules/LanguageSwitcher'

/**
 * Map an authenticated user's role to the page they belong on when they
 * tap "My Account Dashboard" from the public homepage. Mirrors the
 * post-login routing in `LoginPage.tsx` so the experience is identical
 * whether the user just signed in or is returning with a valid session.
 */
function dashboardPathForRole(role: string | undefined | null): string {
  const r = (role || '').toString().toUpperCase()
  if (r === 'LAWYER') return '/lawyer/dashboard'
  if (r === 'ADMIN') return '/admin/dashboard'
  if (r === 'ORGANIZATION') return '/organization/dashboard'
  if (r === 'COURT_ADMIN') return '/court-admin/dashboard'
  // CLIENT and any unknown role default to the client home.
  return '/app/home'
}

/* ──────────────── Intersection Observer Hook ──────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, visible }
}

/* ──────────────── Animated Counter ──────────────── */
const Counter: FC<{ end: number; suffix?: string; label: string }> = ({ end, suffix = '', label }) => {
  const [count, setCount] = useState(0)
  const { ref, visible } = useInView(0.3)

  useEffect(() => {
    if (!visible) return
    let start = 0
    const duration = 2000
    const step = Math.ceil(end / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(start)
    }, 16)
    return () => clearInterval(timer)
  }, [visible, end])

  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl md:text-5xl font-bold text-white">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="mt-2 text-primary-light/80 text-sm tracking-wide uppercase">{label}</p>
    </div>
  )
}

/* ──────────────── SVG Icons ──────────────── */
const icons = {
  search: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  ),
  calendar: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  shield: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  chart: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  chat: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  video: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
}

/* ──────────────── Features Data ──────────────── */
const features = [
  { icon: icons.search, title: 'Find Expert Lawyers', desc: 'Search and filter verified lawyers by specialization, experience, location, language, and ratings.' },
  { icon: icons.calendar, title: 'Book Consultations', desc: 'Select convenient time slots, pay securely, and get instant appointment confirmations.' },
  { icon: icons.shield, title: 'Secure Documents', desc: 'Upload, share, and manage case documents with version tracking and end-to-end security.' },
  { icon: icons.chart, title: 'Track Your Cases', desc: 'Monitor case progress with live timelines, hearing schedules, and task management.' },
  { icon: icons.chat, title: 'Private Chat', desc: 'Communicate directly with your lawyer through encrypted one-to-one messaging.' },
  { icon: icons.video, title: 'Video Consultations', desc: 'Join face-to-face virtual meetings at your scheduled appointment time.' },
]

/* ──────────────── Steps Data ──────────────── */
const steps = [
  { num: '01', title: 'Create Your Account', desc: 'Register and verify your identity in under two minutes.' },
  { num: '02', title: 'Find the Right Lawyer', desc: 'Use smart filters to find an expert suited to your legal needs.' },
  { num: '03', title: 'Book & Pay Securely', desc: 'Select a slot, pay online, and receive an instant confirmation.' },
  { num: '04', title: 'Get Legal Help', desc: 'Consult via video, chat, share documents, and track your case.' },
]

/* ──────────────── Testimonials Data ──────────────── */
const testimonials = [
  { name: 'Ananya Mukherjee', role: 'Client', text: 'NyayaX made finding a family lawyer effortless. The entire booking and consultation process was seamless.', initials: 'AM' },
  { name: 'Adv. Rohit Sen', role: 'Lawyer', text: 'Managing my appointments and cases has never been easier. The platform is intuitive and saves me hours every week.', initials: 'RS' },
  { name: 'Priya Dasgupta', role: 'Client', text: 'I could track my case timeline and communicate with my lawyer securely — all from my phone. Highly recommend.', initials: 'PD' },
]

/* ════════════════════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════════════════════ */
const LandingPage: FC = () => {
  const hero = useInView(0.1)
  const featSection = useInView(0.1)
  const stepsSection = useInView(0.1)
  const testimonialsSection = useInView(0.1)

  /* Navbar scroll shadow */
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Mobile nav toggle */
  const [mobileOpen, setMobileOpen] = useState(false)

  /* Auth-aware nav: swap "Sign In / Get Started" for "My Account Dashboard"
     when there's already a valid session. The store is hydrated from
     localStorage on mount, so this works on first paint without an extra
     `/auth/me` round-trip. */
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const authUser = useAuthStore((s) => s.user)
  const dashboardPath = dashboardPathForRole(authUser?.role)

  return (
    <div className="min-h-screen bg-white font-sans antialiased text-gray-800 overflow-x-hidden">

      {/* ───── NAVBAR ───── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-110">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className={`text-xl font-bold tracking-tight transition-colors ${scrolled ? 'text-primary' : 'text-white'}`}>
                NyayaX
              </span>
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-1">
              {['Features', 'How It Works', 'Testimonials'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-primary hover:bg-primary-light' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                >
                  {item}
                </a>
              ))}
              {/* Language switcher — available to logged-out visitors too. */}
              <LanguageSwitcher />
              <div className="w-px h-6 bg-gray-300/30 mx-2" />
              {isAuthenticated ? (
                // Logged-in shortcut → route to whichever dashboard
                // matches this user's role.
                <Link to={dashboardPath}>
                  <Button variant="primary" size="sm" className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                    My Account Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-primary' : 'text-white/90 hover:text-white'}`}
                  >
                    Sign In
                  </Link>
                  <Link to="/auth/register">
                    <Button variant="primary" size="sm" className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-gray-700' : 'text-white'}`}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>

          {/* Mobile nav dropdown */}
          {mobileOpen && (
            <div className="md:hidden bg-white rounded-xl shadow-xl mt-1 p-4 animate-fade-in-up space-y-1 border border-gray-100">
              {['Features', 'How It Works', 'Testimonials'].map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 rounded-lg text-gray-600 hover:text-primary hover:bg-primary-light text-sm font-medium"
                >
                  {item}
                </a>
              ))}
              <hr className="my-2 border-gray-100" />
              {isAuthenticated ? (
                <Link to={dashboardPath} className="block">
                  <Button variant="primary" size="md" className="w-full mt-1">My Account Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth/login" className="block px-4 py-2.5 rounded-lg text-gray-600 hover:text-primary text-sm font-medium">
                    Sign In
                  </Link>
                  <Link to="/auth/register" className="block">
                    <Button variant="primary" size="md" className="w-full mt-1">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* ───── HERO SECTION ───── */}
      <section ref={hero.ref} className="relative min-h-[100vh] flex items-center overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#062a38] via-primary to-[#0a6e8f]" />

        {/* Decorative shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-white/[0.04]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/[0.06]" />

        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-0 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — Text */}
            <div className={`transition-all duration-700 ${hero.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <span className="text-white/90 text-sm font-medium">Trusted Legal Platform</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
                Justice Made{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-accent to-yellow-300">
                    Accessible
                  </span>
                  <span className="absolute bottom-1 left-0 w-full h-3 bg-accent/20 rounded-full -z-0" />
                </span>
                <br />
                For Everyone
              </h1>
              <p className="mt-6 text-lg text-white/70 max-w-lg leading-relaxed">
                Connect with verified legal experts, book consultations, manage cases, and track every milestone — all from one platform.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to={isAuthenticated ? dashboardPath : '/auth/register'}>
                  <Button variant="secondary" size="lg" className="!bg-accent hover:!bg-accent-dark text-gray-900 font-semibold shadow-xl shadow-accent/25 hover:shadow-accent/40 transition-all w-full sm:w-auto">
                    {isAuthenticated ? 'Go to My Dashboard' : 'Start Free Consultation'}
                  </Button>
                </Link>
                <Link to="/app/search">
                  <Button variant="ghost" size="lg" className="!text-white border border-white/25 hover:!bg-white/10 backdrop-blur transition-all w-full sm:w-auto">
                    Browse Lawyers
                  </Button>
                </Link>
              </div>
              {/* Trust indicators */}
              <div className="mt-10 flex items-center gap-6 text-white/60 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  <span>4.9/5 Average Rating</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <span>500+ Verified Lawyers</span>
              </div>
            </div>

            {/* Right — Visual card */}
            <div className={`hidden lg:block transition-all duration-700 delay-300 ${hero.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="relative">
                {/* Main card */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent text-xl font-bold">⚖️</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">Adv. Priya Sharma</h3>
                      <p className="text-white/60 text-sm">Family Law • 8 yrs Experience</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {['Available Tomorrow, 10:00 AM', 'Fee: ₹499 per consultation', 'Rating: ★★★★★ (4.8)'].map((line, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2.5">
                        <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-white/80 text-sm">{line}</span>
                      </div>
                    ))}
                  </div>
                  <button className="mt-6 w-full py-3 bg-accent hover:bg-accent-dark text-gray-900 font-semibold rounded-xl transition-colors shadow-lg">
                    Book Consultation →
                  </button>
                </div>

                {/* Floating badge */}
                <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl px-4 py-3 animate-float" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Consultation</p>
                      <p className="text-sm font-semibold text-gray-800">Confirmed ✓</p>
                    </div>
                  </div>
                </div>

                {/* Floating activity */}
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl px-4 py-3 animate-float" style={{ animationDelay: '2s' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Active Users</p>
                      <p className="text-sm font-semibold text-gray-800">2,450+ online</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 50L48 45.7C96 41.3 192 32.7 288 30.8C384 29 480 34 576 41.2C672 48.3 768 57.7 864 55.8C960 54 1056 41 1152 36.8C1248 32.7 1344 37.3 1392 39.7L1440 42V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ───── STATS BAR ───── */}
      <section className="bg-primary py-12 md:py-16 -mt-1">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <Counter end={500} suffix="+" label="Verified Lawyers" />
          <Counter end={10000} suffix="+" label="Cases Handled" />
          <Counter end={25000} suffix="+" label="Consultations" />
          <Counter end={98} suffix="%" label="Satisfaction" />
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section id="features" ref={featSection.ref} className="py-20 md:py-28 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-accent font-semibold text-sm tracking-wider uppercase">Platform Features</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              Everything You Need for <br className="hidden sm:block" />
              <span className="text-primary">Legal Success</span>
            </h2>
            <p className="mt-4 text-gray-500 text-lg">
              Our comprehensive platform brings modern technology to legal services.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`group bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 ${featSection.visible ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-xl bg-primary-light flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  {f.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── HOW IT WORKS ───── */}
      <section id="how-it-works" ref={stepsSection.ref} className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-accent font-semibold text-sm tracking-wider uppercase">Simple Process</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              How <span className="text-primary">NyayaX</span> Works
            </h2>
            <p className="mt-4 text-gray-500 text-lg">
              Get legal assistance in four straightforward steps.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div
                key={s.num}
                className={`relative text-center group ${stepsSection.visible ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200" />
                )}
                <div className="relative z-10 mx-auto w-20 h-20 rounded-2xl bg-primary-light text-primary flex items-center justify-center text-2xl font-bold group-hover:bg-primary group-hover:text-white transition-colors duration-300 shadow-sm">
                  {s.num}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-gray-500 text-sm leading-relaxed max-w-[220px] mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── TESTIMONIALS ───── */}
      <section id="testimonials" ref={testimonialsSection.ref} className="py-20 md:py-28 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-accent font-semibold text-sm tracking-wider uppercase">Testimonials</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              Trusted by <span className="text-primary">Thousands</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className={`bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 ${testimonialsSection.visible ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {/* Stars */}
                <div className="flex gap-1 text-accent mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed italic">"{t.text}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA BANNER ───── */}
      <section className="relative py-20 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-[#0a6e8f]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto text-center px-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Ready to Get Expert Legal Help?
          </h2>
          <p className="mt-4 text-white/70 text-lg max-w-xl mx-auto">
            Join thousands of clients who have already found the right lawyer through NyayaX.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={isAuthenticated ? dashboardPath : '/auth/register'}>
              <Button variant="secondary" size="lg" className="!bg-accent hover:!bg-accent-dark text-gray-900 font-semibold shadow-xl shadow-accent/25 hover:shadow-accent/40 transition-all w-full sm:w-auto">
                {isAuthenticated ? 'Go to My Dashboard' : 'Get Started for Free'}
              </Button>
            </Link>
            <Link to="/app/search">
              <Button variant="ghost" size="lg" className="!text-white border border-white/25 hover:!bg-white/10 transition-all w-full sm:w-auto">
                Browse Lawyers
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="bg-[#0a1628] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-lg">N</span>
                </div>
                <span className="text-xl font-bold tracking-tight">NyayaX</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Connecting clients with trusted legal professionals. Modern legal services, simplified.
              </p>
              {/* Social */}
              <div className="flex gap-3 mt-5">
                {['X', 'In', 'fb'].map((s) => (
                  <a key={s} href="#" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-primary flex items-center justify-center text-gray-400 hover:text-white transition-colors text-xs font-bold">
                    {s}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {[{ to: '/app/search', label: 'Browse Lawyers' }, { to: '/auth/register', label: 'Get Started' }, { to: '#features', label: 'Features' }, { to: '#how-it-works', label: 'How It Works' }].map(l => (
                  <li key={l.label}>
                    {l.to.startsWith('#') ? (
                      <a href={l.to} className="text-gray-400 hover:text-white text-sm transition-colors">{l.label}</a>
                    ) : (
                      <Link to={l.to} className="text-gray-400 hover:text-white text-sm transition-colors">{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {[{ to: '/privacy-policy', label: 'Privacy Policy' }, { to: '/terms-of-service', label: 'Terms of Service' }, { to: '/about', label: 'About Us' }].map(l => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-gray-400 hover:text-white text-sm transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">Contact</h4>
              <ul className="space-y-2.5 text-gray-400 text-sm">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  support@nyayax.com
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  (123) 456-7890
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  123 Legal St, Justice City, 12345
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} NyayaX. All rights reserved.
            </p>
            <p className="text-gray-600 text-xs">
              Built with care for better legal access.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
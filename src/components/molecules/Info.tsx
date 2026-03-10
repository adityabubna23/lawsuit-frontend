import { FC, useEffect, useState } from 'react'
import {
  Briefcase,
  GraduationCap,
  Award,
  Gavel,
  Globe,
  Mail,
  Loader2,
  MapPin,
  FileText,
  BarChart3,
  Trophy,
  Scale,
  CheckCircle2,
} from 'lucide-react'
import { lawyersApi } from '@/services/api'

/* ── Types matching the backend response ─────────────────────────── */

interface ExperienceEntry {
  title?: string
  organisation?: string
  from?: string
  to?: string
  description?: string
}

interface EducationEntry {
  university?: string
  course?: string
  startYear?: string
  completionYear?: string
  certificateUrl?: string
}

interface SocialLinks {
  linkedin?: string | null
  twitter?: string | null
  website?: string | null
}

interface Stats {
  averageRating?: number
  totalReviews?: number
  completedConsultations?: number
  closedCases?: number
  wonCases?: number
  successRate?: number
}

interface LawyerProfile {
  bio?: string
  specializations?: string[]
  offerings?: string[]
  expertise?: string[]
  experienceYears?: number
  experience?: ExperienceEntry[]
  education?: EducationEntry[]
  languages?: string[]
  feePerConsultation?: number
  organisation?: string
  isAvailable?: boolean
  city?: string
  state?: string
  country?: string
  address?: string
  barCouncil?: string
  barCouncilId?: string
  licenseNumber?: string
  socialLinks?: SocialLinks
  rating?: number
  totalReviews?: number
  totalConsultations?: number
  stats?: Stats
}

/* ── Component ──────────────────────────────────────────────────── */

interface InfoProps {
  lawyerId: string
}

const Info: FC<InfoProps> = ({ lawyerId }) => {
  const [profile, setProfile] = useState<LawyerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lawyerId) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await lawyersApi.getProfile(lawyerId)
        const raw = (res as any).data?.data ?? (res as any).data ?? res
        if (!cancelled) setProfile(raw)
      } catch (err: any) {
        console.error('Failed to load lawyer profile', err)
        if (!cancelled) setError(err?.message || 'Failed to load profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [lawyerId])

  /* Loading */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-gray-500">Loading profile…</span>
      </div>
    )
  }

  /* Error */
  if (error) {
    return (
      <div className="p-6 text-center text-red-500 text-sm">
        {error}
      </div>
    )
  }

  /* Empty profile */
  if (!profile || Object.keys(profile).length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        This lawyer hasn't completed their profile yet.
      </div>
    )
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const hasExperience = profile.experience && profile.experience.length > 0
  const hasEducation = profile.education && profile.education.length > 0
  const hasOfferings = profile.offerings && profile.offerings.length > 0
  const hasExpertise = profile.expertise && profile.expertise.length > 0
  const hasLanguages = profile.languages && profile.languages.length > 0
  const hasSocials = profile.socialLinks && (profile.socialLinks.linkedin || profile.socialLinks.twitter || profile.socialLinks.website)
  const hasLocation = profile.city || profile.state || profile.address
  const hasStats = profile.stats

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">

      {/* ── Stats Cards ───────────────────────────────────────── */}
      {hasStats && (
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {profile.stats!.completedConsultations != null && (
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 text-center border border-primary/10">
                <BarChart3 className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <div className="text-2xl font-bold text-gray-900">{profile.stats!.completedConsultations}</div>
                <div className="text-xs text-gray-500 mt-0.5">Consultations</div>
              </div>
            )}
            {profile.stats!.closedCases != null && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 text-center border border-blue-100">
                <Scale className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
                <div className="text-2xl font-bold text-gray-900">{profile.stats!.closedCases}</div>
                <div className="text-xs text-gray-500 mt-0.5">Cases Closed</div>
              </div>
            )}
            {profile.stats!.successRate != null && (
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 text-center border border-green-100">
                <Trophy className="w-5 h-5 text-green-600 mx-auto mb-1.5" />
                <div className="text-2xl font-bold text-gray-900">{profile.stats!.successRate}%</div>
                <div className="text-xs text-gray-500 mt-0.5">Success Rate</div>
              </div>
            )}
            {profile.stats!.totalReviews != null && (
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 text-center border border-amber-100">
                <CheckCircle2 className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                <div className="text-2xl font-bold text-gray-900">{profile.stats!.totalReviews}</div>
                <div className="text-xs text-gray-500 mt-0.5">Reviews</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── About Me / Bio ────────────────────────────────────── */}
      {profile.bio && (
        <section>
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
              <Award className="w-5 h-5 text-primary" />
            </div>
            About Me
          </h3>
          <p className="text-gray-500 text-sm px-7 leading-relaxed whitespace-pre-line">
            {profile.bio}
          </p>
        </section>
      )}

      {/* ── Offerings ─────────────────────────────────────────── */}
      {hasOfferings && (
        <section>
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
              <Gavel className="w-5 h-5 text-primary" />
            </div>
            Offerings
          </h3>
          <div className="flex flex-wrap gap-3 px-7">
            {profile.offerings!.map((item) => (
              <span key={item} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-light border border-gray-400">
                {item}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Expertise ─────────────────────────────────────────── */}
      {hasExpertise && (
        <section>
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
              <Award className="w-4 h-5 text-primary" />
            </div>
            Expertise
          </h3>
          <div className="flex flex-wrap gap-3 px-7">
            {profile.expertise!.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-light border border-gray-400"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Experience ────────────────────────────────────────── */}
      {hasExperience && (
        <section>
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            Experience
            {profile.experienceYears != null && (
              <span className="text-sm font-normal text-gray-500">
                ({profile.experienceYears} years)
              </span>
            )}
          </h3>
          <div className="space-y-0 border border-gray-300 rounded-xl px-6 py-4">
            {profile.experience!.map((exp, idx) => (
              <div key={idx}>
                {idx > 0 && <hr className="border-gray-300 my-4" />}
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {exp.title || 'Untitled Role'}
                    {exp.organisation && <span className="font-normal text-gray-600">, {exp.organisation}</span>}
                  </h4>
                  {(exp.from || exp.to) && (
                    <p className="text-sm text-gray-600">
                      {exp.from || '?'} – {exp.to || 'Present'}
                    </p>
                  )}
                  {exp.description && (
                    <p className="text-sm text-gray-500 mt-1">{exp.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Education ─────────────────────────────────────────── */}
      {hasEducation && (
        <section>
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            Education
          </h3>
          <div className="space-y-0 border border-gray-300 rounded-xl px-6 py-4">
            {profile.education!.map((ed, idx) => (
              <div key={idx}>
                {idx > 0 && <hr className="border-gray-300 my-4" />}
                <div>
                  <h4 className="font-semibold text-gray-800">{ed.course || 'Unknown Course'}</h4>
                  {ed.university && (
                    <p className="text-sm text-gray-600 font-normal">{ed.university}</p>
                  )}
                  {(ed.startYear || ed.completionYear) && (
                    <p className="text-xs text-gray-600">
                      {ed.startYear || '?'} – {ed.completionYear || 'Present'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Bar Council & License ─────────────────────────────── */}
      {(profile.licenseNumber || profile.barCouncil || profile.barCouncilId) && (
        <section>
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            License & Bar Council
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-7">
            {profile.licenseNumber && (
              <div>
                <span className="text-xs text-gray-500 block">License Number</span>
                <span className="text-sm text-gray-800 font-medium">{profile.licenseNumber}</span>
              </div>
            )}
            {profile.barCouncilId && (
              <div>
                <span className="text-xs text-gray-500 block">Bar Council ID</span>
                <span className="text-sm text-gray-800 font-medium">{profile.barCouncilId}</span>
              </div>
            )}
            {profile.barCouncil && (
              <div>
                <span className="text-xs text-gray-500 block">Bar Council</span>
                <span className="text-sm text-gray-800 font-medium">{profile.barCouncil}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Languages ─────────────────────────────────────────── */}
      {hasLanguages && (
        <section>
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            Languages
          </h3>
          <div className="flex flex-wrap gap-2 px-7">
            {profile.languages!.map((lang) => (
              <span key={lang} className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                {lang}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Location ──────────────────────────────────────────── */}
      {hasLocation && (
        <section>
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            Location
          </h3>
          <div className="px-7 text-sm text-gray-700">
            {profile.address && <p>{profile.address}</p>}
            <p>
              {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
            </p>
          </div>
        </section>
      )}

      {/* ── Social Links ──────────────────────────────────────── */}
      {hasSocials && (
        <section>
          <h3 className="text-md font-semibold text-gray-900 mb-4">Socials</h3>
          <div className="flex flex-wrap gap-6">
            {profile.socialLinks!.linkedin && (
              <a
                href={profile.socialLinks!.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition text-sm"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                LinkedIn
              </a>
            )}
            {profile.socialLinks!.twitter && (
              <a
                href={profile.socialLinks!.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sky-500 hover:text-sky-700 transition text-sm"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter / X
              </a>
            )}
            {profile.socialLinks!.website && (
              <a
                href={profile.socialLinks!.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition text-sm"
              >
                <Globe className="w-5 h-5" />
                Website
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default Info
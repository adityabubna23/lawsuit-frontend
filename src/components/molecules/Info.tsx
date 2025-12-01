import { FC } from 'react'
import { Briefcase, GraduationCap, Award, Gavel, Linkedin, Twitter, Mail, Globe } from 'lucide-react'

const Info: FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      {/* About Me */}
      <section>
        <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
            <Award className="w-5 h-5 text-primary" />
          </div>
          About Me
        </h3>
        <p className="text-gray-500 text-sm px-7">
          I am a seasoned advocate with over 12 years of experience practicing in the Supreme Court of India, 
          Delhi High Court, and various tribunals. Passionate about constitutional law, corporate litigation, 
          and arbitration, I believe in delivering justice with integrity, strategy, and empathy. 
          My approach combines rigorous legal research with practical solutions tailored to each client's unique needs.
        </p>
      </section>

      {/* Practice Areas / Offerings */}
      <section>
        <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
            <Gavel className="w-5 h-5 text-primary" />
          </div>
           Offerings
        </h3>
        <div className="flex flex-wrap gap-3 px-7">
          {[
            'Public Interest Litigation',
            'Corporate & Commercial Disputes',
            'Arbitration & Mediation',
            'Insolvency & Bankruptcy (IBC)',
            'White-Collar Crimes & Compliance',
            'Intellectual Property Rights',
            'Taxation (Direct & Indirect)',
            'Family & Succession Laws',
          ].map((area) => (
            <span key={area} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-light border border-gray-400">  
              {area}
            </span>
          ))}
        </div>
      </section>

      {/* Expertise */}
      <section>
        <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
            <Award className="w-4 h-5 text-primary" />
          </div>
          Expertise
        </h3>
        <div className="flex flex-wrap gap-3 px-7">
          {[
            'Supreme Court Advocacy',
            'Drafting SLPs & Writ Petitions',
            'Complex Commercial Arbitration',
            'Cross-Border Disputes',
            'Regulatory Compliance',
            'M&A Dispute Resolution',
            'Crisis Management & Litigation Strategy',
          ].map((skill) => (
            <span
              key={skill}
              className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-light border border-gray-400"
            >
              {skill}
            </span>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section>
        <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          Experience
        </h3>
        <div className="space-y-6 border border-gray-300 rounded-xl px-6 py-4 ">
          <div>
            <h4 className="font-semibold text-gray-800">Advocate-on-Record, Supreme Court of India</h4>
            <p className="text-sm text-gray-600">2018 – Present</p>
          </div>
          <hr className="border-gray-300 px-4"/>
          <div>
            <h4 className="font-semibold text-gray-800">Senior Associate, AZB & Partners</h4>
            <p className="text-sm text-gray-600">2014 – 2018</p>
          </div>
          <hr className="border-gray-300 px-4" />
          <div>
            <h4 className="font-semibold text-gray-800">Junior Counsel, Chambers of Sr. Adv. XYZ</h4>
            <p className="text-sm text-gray-600">2012 – 2014</p>
          </div>
        </div>
      </section>

      {/* Education */}
      <section>
        <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-3">
          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          Education
        </h3>
        <div className="space-y-4 border border-gray-300 rounded-xl px-6 py-4 ">
          <div>
            <h4 className="font-semibold text-gray-800">LL.M. (Constitutional Law)</h4>
            <p className="text-sm text-gray-600 font-normal">National Law School of India (NLSIU), Bangalore</p>
            <p className="text-xs text-gray-600">2011 – 2012</p>
          </div>
          <hr className="border-gray-300 px-4" />
          <div>
            <h4 className="font-semibold text-gray-800">B.A. LL.B. (Hons.)</h4>
            <p className="font-normal text-sm text-gray-600">National Law University, Delhi</p>
            <p className="text-xs text-gray-600">2006 – 2011</p>
          </div>
        </div>
      </section>

      {/* Social Links */}
      <section>
        <h3 className="text-md font-semibold text-gray-900 mb-4">Socials</h3>
        <div className="flex flex-wrap gap-6">
          <a
            href="https://twitter.com/yourhandle"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sky-500 hover:text-sky-700 transition"
          >
            <Twitter className="w-6 h-6" />
          </a>
          <a
            href="mailto:your.email@domain.com"
            className="flex items-center gap-3 text-gray-700 hover:text-gray-900 transition"
          >
            <Mail className="w-6 h-6" />
          </a>
          <a
            href="https://yourwebsite.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-gray-700 hover:text-gray-900 transition"
          >
            <Globe className="w-6 h-6" />
          </a>
        </div>
      </section>
    </div>
  )
}

export default Info
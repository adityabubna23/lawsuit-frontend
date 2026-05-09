import { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, Phone, Globe, Shield, CheckCircle, XCircle, ChevronRight, Users, Info, Heart } from 'lucide-react';
import { teleLawApi } from '@/services/api';
import EkycStatusCard from '@/components/molecules/EkycStatusCard';

interface EligibilityResult {
    eligible: boolean;
    reasons: string[];
    scheme: string;
    benefits: string[];
    supportedLanguages: string[];
    helplineNumber: string;
}

const CASTE_OPTIONS = [
    { value: '', label: 'Select Category' },
    { value: 'GENERAL', label: 'General' },
    { value: 'OBC', label: 'OBC (Other Backward Class)' },
    { value: 'SC', label: 'SC (Scheduled Caste)' },
    { value: 'ST', label: 'ST (Scheduled Tribe)' },
    { value: 'EWS', label: 'EWS (Economically Weaker Section)' },
    { value: 'OTHER', label: 'Other' },
];

const GENDER_OPTIONS = [
    { value: '', label: 'Select Gender' },
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' },
];

const TeleLawPage: FC = () => {
    const [income, setIncome] = useState('');
    const [caste, setCaste] = useState('');
    const [gender, setGender] = useState('');
    const [state, setState] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<EligibilityResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await teleLawApi.checkEligibility({
                income: income ? Number(income) : undefined,
                caste: caste || undefined,
                gender: gender || undefined,
                state: state || undefined,
            });
            setResult(res.data?.data ?? res.data);
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || 'Failed to check eligibility');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">

            {/* Hero */}
            <section className="bg-gradient-to-br from-primary/5 via-white to-midnight/5 py-16">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-primary/10 rounded-full">
                            <Scale className="w-12 h-12 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        <span className="text-primary">Tele Law</span> — Free Legal Advice for All
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        A Government of India initiative providing free legal consultation to eligible citizens
                        in <strong>22 Indian languages</strong> through 75,000+ Common Service Centres.
                    </p>
                    <div className="flex flex-wrap justify-center gap-8 mt-8 text-gray-700">
                        <div className="flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />
                            <span className="font-medium">Govt. of India Initiative</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="w-6 h-6 text-primary" />
                            <span className="font-medium">22 Languages</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-6 h-6 text-primary" />
                            <span className="font-medium">75,000+ CSCs</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Aadhaar eKYC — strengthens free-legal-aid eligibility verification */}
                <div className="mb-8">
                    <EkycStatusCard />
                </div>
                <div className="grid lg:grid-cols-2 gap-12">

                    {/* Left: Eligibility Form */}
                    <div>
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                            <div className="bg-primary p-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <CheckCircle className="w-7 h-7" />
                                    Check Your Eligibility
                                </h2>
                                <p className="text-primary-light/80 text-white/80 mt-1">Find out if you qualify for free legal consultation</p>
                            </div>

                            <form onSubmit={handleCheck} className="p-6 space-y-5">
                                {/* Income */}
                                <div>
                                    <label htmlFor="income" className="block text-sm font-medium text-gray-700 mb-1">
                                        Annual Income (₹)
                                    </label>
                                    <input
                                        id="income"
                                        type="number"
                                        value={income}
                                        onChange={(e) => setIncome(e.target.value)}
                                        placeholder="e.g. 250000"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Threshold: ₹3,00,000 per annum</p>
                                </div>

                                {/* Caste Category */}
                                <div>
                                    <label htmlFor="caste" className="block text-sm font-medium text-gray-700 mb-1">
                                        Category
                                    </label>
                                    <select
                                        id="caste"
                                        value={caste}
                                        onChange={(e) => setCaste(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                    >
                                        {CASTE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Gender */}
                                <div>
                                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                                        Gender
                                    </label>
                                    <select
                                        id="gender"
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                                    >
                                        {GENDER_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* State */}
                                <div>
                                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                                        State
                                    </label>
                                    <input
                                        id="state"
                                        type="text"
                                        value={state}
                                        onChange={(e) => setState(e.target.value)}
                                        placeholder="e.g. West Bengal"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary hover:bg-midnight text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                                >
                                    {loading ? 'Checking...' : 'Check Eligibility'}
                                </button>
                            </form>

                            {/* Error */}
                            {error && (
                                <div className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Result */}
                            {result && (
                                <div className={`mx-6 mb-6 p-6 rounded-xl border-2 ${result.eligible
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-amber-50 border-amber-300'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        {result.eligible ? (
                                            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircle className="w-8 h-8 text-amber-600 flex-shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <h3 className={`text-lg font-bold ${result.eligible ? 'text-green-800' : 'text-amber-800'}`}>
                                                {result.eligible
                                                    ? '✅ You are eligible for free legal consultation!'
                                                    : '⚠️ You may not qualify for free Tele Law services'}
                                            </h3>

                                            {/* Reasons */}
                                            <ul className="mt-3 space-y-1.5">
                                                {result.reasons.map((reason, i) => (
                                                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                                        <span className="mt-1">•</span>
                                                        <span>{reason}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            {/* Benefits */}
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <h4 className="text-sm font-semibold text-gray-800 mb-2">
                                                    {result.eligible ? 'Your Benefits:' : 'Available Options:'}
                                                </h4>
                                                <ul className="space-y-1">
                                                    {result.benefits.map((b, i) => (
                                                        <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                                                            {b}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* CTA */}
                                            <div className="mt-5">
                                                {result.eligible ? (
                                                    <a
                                                        href="tel:18003453222"
                                                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-lg transition"
                                                    >
                                                        <Phone className="w-5 h-5" />
                                                        Call Tele Law Helpline: {result.helplineNumber}
                                                    </a>
                                                ) : (
                                                    <Link
                                                        to="/app/search"
                                                        className="inline-flex items-center gap-2 bg-primary hover:bg-midnight text-white font-semibold px-6 py-2.5 rounded-lg transition"
                                                    >
                                                        Find a Lawyer
                                                        <ChevronRight className="w-5 h-5" />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Scheme Information */}
                    <div className="space-y-6">
                        {/* What is Tele Law */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Info className="w-6 h-6 text-primary" />
                                What is Tele Law?
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                Tele Law is a service launched by the <strong>Department of Justice, Ministry of Law & Justice, Government of India</strong>.
                                It connects citizens at the pre-litigation stage with lawyers empanelled under the scheme through video conferencing
                                at Common Service Centres (CSCs) across India.
                            </p>
                        </div>

                        {/* Who is eligible */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Heart className="w-6 h-6 text-primary" />
                                Who is Eligible?
                            </h3>
                            <ul className="space-y-2">
                                {[
                                    'Members of SC/ST communities',
                                    'Women and children',
                                    'Persons with annual income below ₹3,00,000',
                                    'EWS certificate holders',
                                    'Victims of mass disaster or ethnic violence',
                                    'Disabled persons',
                                    'Industrial workmen',
                                    'Persons in custody',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-gray-700">
                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        <span className="text-sm">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Languages */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Globe className="w-6 h-6 text-primary" />
                                Available in 22 Languages
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    'Hindi', 'English', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati',
                                    'Kannada', 'Malayalam', 'Odia', 'Punjabi', 'Assamese', 'Urdu', 'Sindhi',
                                    'Nepali', 'Konkani', 'Manipuri', 'Kashmiri', 'Maithili', 'Santali',
                                    'Dogri', 'Bodo',
                                ].map((lang) => (
                                    <span key={lang} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">
                                        {lang}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Helpline */}
                        <div className="bg-gradient-to-r from-primary to-midnight rounded-2xl p-6 text-white">
                            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                <Phone className="w-6 h-6" />
                                Tele Law Helpline
                            </h3>
                            <p className="opacity-90 mb-4">For any queries related to the Tele Law scheme:</p>
                            <a
                                href="tel:18003453222"
                                className="inline-flex items-center gap-2 bg-white text-primary font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition"
                            >
                                <Phone className="w-5 h-5" />
                                1800-345-3222 (Toll Free)
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeleLawPage;

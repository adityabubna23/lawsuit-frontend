import { FC, useEffect } from 'react'
import { Link } from 'react-router-dom'

const PrivacyPolicyPage: FC = () => {
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Navigation */}
            <nav className="bg-white shadow-md mb-0.5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Link to="/">
                                    <h1 className="text-2xl font-bold text-primary">Lawsuit</h1>
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link to="/" className="text-gray-500 hover:text-gray-900 font-medium">
                                Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <main className="flex-grow bg-gray-50 py-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-8 rounded-lg shadow">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                    <p className="text-sm text-gray-500 mb-8">Last updated: February 2026</p>

                    <div className="space-y-6 text-gray-700">
                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
                            <p>We collect personal information you provide when registering, including your name, email address, phone number, and location. For lawyers, we additionally collect bar council ID, license details, specialization, and experience information. We may also collect usage data, device information, and interaction logs to improve our services.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
                            <p>Your information is used to: provide and maintain our legal services platform; connect clients with verified lawyers; process consultations and payments; send notifications about appointments, cases, and messages; improve and personalize your experience; comply with legal obligations.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Data Security</h2>
                            <p>We implement industry-standard security measures including encryption of data in transit and at rest, secure authentication with JWT tokens, and regular security audits. Payment processing is handled through Razorpay with PCI-DSS compliance.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Sharing</h2>
                            <p>We do not sell your personal data. Information is shared only with: lawyers you choose to consult with; payment processors for transaction handling; service providers who assist in platform operations. All third parties are bound by confidentiality agreements.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Your Rights</h2>
                            <p>You have the right to: access, update, or delete your personal information; opt out of marketing communications; request data portability; withdraw consent at any time. Contact us at support@lawsuit.com for any privacy-related requests.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
                            <p>We retain your data for as long as your account is active or as needed to provide services. Legal case records may be retained as required by applicable law. You may request deletion of your account and associated data at any time.</p>
                        </section>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 text-white mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h1 className="text-2xl font-bold text-white">Lawsuit .</h1>
                            <p className="mt-4 text-gray-300 text-sm">
                                Connect with experienced lawyers and manage your legal needs efficiently.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Quick Links</h3>
                            <ul className="mt-4 space-y-2">
                                <li><Link to="/app/search" className="text-gray-300 hover:text-white text-sm">Browse Lawyers</Link></li>
                                <li><Link to="/auth/login" className="text-gray-300 hover:text-white text-sm">Sign In</Link></li>
                                <li><Link to="/auth/register" className="text-gray-300 hover:text-white text-sm">Get Started</Link></li>
                                <li><Link to="/about" className="text-gray-300 hover:text-white text-sm">About Us</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Contact Us</h3>
                            <ul className="mt-4 space-y-2 text-gray-300 text-sm">
                                <li>Email: support@lawsuit.com</li>
                                <li>Phone: (123) 456-7890</li>
                                <li>Address: 123 Legal St, Justice City, 12345</li>
                                <li className="pt-2">
                                    <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
                                    <span className="mx-2">|</span>
                                    <Link to="/terms-of-service" className="hover:text-white">Terms of Service</Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-gray-700 text-center">
                        <p className="text-gray-300 text-sm">&copy; {new Date().getFullYear()} Lawsuit. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default PrivacyPolicyPage

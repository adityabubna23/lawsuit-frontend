import { FC, useEffect } from 'react'
import { Link } from 'react-router-dom'

const TermsOfServicePage: FC = () => {
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
                    <p className="text-sm text-gray-500 mb-8">Last updated: February 2026</p>

                    <div className="space-y-6 text-gray-700">
                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
                            <p>By using LawSoft, you agree to these Terms of Service. If you do not agree, please do not use the platform. We reserve the right to modify these terms at any time, and continued use constitutes acceptance of modifications.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. User Accounts</h2>
                            <p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials. Accounts are personal and non-transferable. We reserve the right to suspend or terminate accounts that violate these terms.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Legal Services Disclaimer</h2>
                            <p>LawSoft is a platform that connects clients with lawyers. We do not provide legal advice directly. All legal advice and representation is provided by independent lawyers registered on the platform. LawSoft is not liable for the quality of legal advice provided by lawyers.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Payments & Refunds</h2>
                            <p>Consultation fees are set by individual lawyers. Payments are processed securely through Razorpay. Cancellation and refund policies apply as per appointment terms. Wallet balances are non-transferable and subject to platform rules.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Lawyer Verification</h2>
                            <p>All lawyers on the platform undergo verification of their Bar Council registration and credentials. However, LawSoft does not guarantee the outcome of any legal matter. Clients should exercise their own judgment when selecting a lawyer.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Prohibited Conduct</h2>
                            <p>Users must not: provide false information; harass other users; misuse the platform for illegal activities; attempt to circumvent the platform for direct payments; share account credentials; scrape or reverse-engineer the platform.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitation of Liability</h2>
                            <p>LawSoft shall not be liable for any indirect, incidental, or consequential damages arising from use of the platform. Our total liability is limited to the amount paid by you in the preceding 12 months.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Governing Law</h2>
                            <p>These terms are governed by the laws of India. Any disputes shall be resolved through arbitration in accordance with the Arbitration and Conciliation Act, 1996, with the seat of arbitration in New Delhi.</p>
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

export default TermsOfServicePage

import { FC, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '../../types'

interface UserMenuProps {
  user: User | null;
  onLogout: () => void;
}

const UserMenu: FC<UserMenuProps> = ({ user, onLogout }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  return (
    <div className="ml-3 relative">
      <button
        type="button"
        className="bg-white rounded-full flex focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        onClick={() => setIsProfileOpen(!isProfileOpen)}
      >
        <span className="sr-only">Open user menu</span>
        {user?.avatar ? (
          <img
            className="h-8 w-8 rounded-full"
            src={user.avatar}
            alt={user.name}
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
            {user?.name?.charAt(0)}
          </div>
        )}
      </button>

      {/* Right-side profile panel (drawer) */}
      {isProfileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40"
            onClick={() => setIsProfileOpen(false)}
          />

          <aside className="fixed right-0 top-0 h-full w-full max-w-sm sm:w-96 bg-white shadow-xl z-50 transform transition-transform flex flex-col">
            {/*
              Header — fixed at the top, doesn't shrink.
              Padding kept on the inner divs so the scroll area below can
              extend edge-to-edge for cleaner long lists.
            */}
            <div className="p-6 pb-0 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-4">
                    {user?.avatar ? (
                      <img className="h-14 w-14 rounded-full object-cover" src={user.avatar} alt={user.name} />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-primary text-white flex items-center justify-center text-lg">
                        {user?.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="text-lg font-semibold">{user?.name}</div>
                      <div className="text-sm text-gray-500">{user?.email}</div>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsProfileOpen(false)} className="text-gray-500 hover:text-gray-700">Close</button>
              </div>
            </div>

            {/*
              Scrollable middle — `flex-1 min-h-0` lets it take the
              remaining vertical space and `overflow-y-auto` makes the
              menu items scroll when there are too many to fit. Without
              `min-h-0` flexbox would let the section grow past the
              container and the items at the bottom would be clipped
              instead of scrollable (which is exactly what was happening).
            */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 mt-6 border-t pt-4">
              <div>
                {user?.role === 'LAWYER' ? (
                  <>
                    <Link to="/lawyer/profile" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Your Profile</Link>
                    <Link to="/lawyer/availability" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Availability</Link>
                    <Link to="/lawyer/salary" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Salary Slip</Link>
                    <Link to="/lawyer/subscription" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Pro Subscription</Link>
                    <Link to="/lawyer/referral" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Refer & Earn</Link>
                    <Link to="/lawyer/bank-accounts" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Bank Accounts</Link>
                    <Link to="/lawyer/payments" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Payment History</Link>
                    <Link to="/lawyer/legal-updates" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Legal Updates</Link>
                    <div className="my-1 border-t border-gray-100" />
                    <Link to="/lawyer/settings" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Settings & Security</Link>
                    <Link to="/lawyer/help" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Help Center</Link>
                    <Link to="/lawyer/report-issue" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Report an Issue</Link>
                    <Link to="/lawyer/about" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">About NyayaX</Link>
                  </>
                ) : (
                  <>
                    <Link to="/app/profile" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Your Profile</Link>
                    <Link to="/app/ekyc" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Aadhaar Verification</Link>
                    <Link to="/app/referral" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Refer & Earn</Link>
                    <Link to="/app/bank-accounts" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Bank Accounts</Link>
                    <Link to="/app/subscription" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Subscription</Link>
                    <Link to="/app/payments" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Payment History</Link>
                    <Link to="/app/legal-updates" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Legal Updates</Link>
                    <div className="my-1 border-t border-gray-100" />
                    <Link to="/app/settings" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Settings & Security</Link>
                    <Link to="/app/help" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Help Center</Link>
                    <Link to="/app/report-issue" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Report an Issue</Link>
                    <Link to="/app/about" onClick={() => setIsProfileOpen(false)} className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">About NyayaX</Link>
                  </>
                )}
              </div>
            </div>

            {/*
              Footer — pinned to the bottom, never shrinks. Sits OUTSIDE the
              scroll area so the Sign-out button is always visible regardless
              of how far the user has scrolled the menu list.
            */}
            <div className="flex-shrink-0 px-6 pb-6 pt-3 border-t bg-white">
              <button
                onClick={() => { setIsProfileOpen(false); onLogout() }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                Sign out
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default UserMenu
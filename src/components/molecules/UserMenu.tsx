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

          <aside className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform">
            <div className="p-6 flex flex-col h-full">
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

              <div className="mt-6 border-t pt-4">
                <Link to="/app/profile" className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Your Profile</Link>
                <Link to="/app/settings" className="block px-2 py-3 rounded text-gray-700 hover:bg-gray-100">Settings</Link>
              </div>

              <div className="mt-auto">
                <div className="border-t pt-4">
                  <button
                    onClick={() => { setIsProfileOpen(false); onLogout() }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default UserMenu
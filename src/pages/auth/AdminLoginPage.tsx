import { FC } from 'react'
import { Navigate } from 'react-router-dom'

/**
 * Legacy admin-login route.
 *
 * The unified `/auth/login` page now hosts a "Super Admin" tab — selecting it
 * via `?mode=admin` opens the same form pre-switched to admin mode. We keep
 * this component so existing bookmarks / links to `/auth/admin-login` still
 * land users in the right place.
 */
const AdminLoginPage: FC = () => {
  return <Navigate to="/auth/login?mode=admin" replace />
}

export default AdminLoginPage

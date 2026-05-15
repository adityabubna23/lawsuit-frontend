import { FC } from 'react'
import { Navigate } from 'react-router-dom'

/**
 * Legacy admin-login route.
 *
 * Super Admin sign-in now lives at `/auth/super-admin-login` (reachable via
 * the Administrators hub at `/auth/administrators`). We keep this component
 * so existing bookmarks / links to `/auth/admin-login` still resolve.
 */
const AdminLoginPage: FC = () => {
  return <Navigate to="/auth/super-admin-login" replace />
}

export default AdminLoginPage

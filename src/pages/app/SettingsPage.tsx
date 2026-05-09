import { FC, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lock, KeyRound, ShieldCheck, Loader2, Eye, EyeOff, Check, AlertCircle, Bell, ArrowRight,
} from 'lucide-react'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { friendlyError } from '@/utils/errors'
import DangerZone from '@/components/molecules/DangerZone'

type ResetStep = 'idle' | 'sent'

const SettingsPage: FC = () => {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const email = user?.email || ''

  // Password reset (OTP)
  const [step, setStep] = useState<ResetStep>('idle')
  const [otp, setOtp] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [busy, setBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Notification permission state (browser-side)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof Notification !== 'undefined') setNotifPerm(Notification.permission)
  }, [])

  useEffect(() => {
    if (step !== 'sent' || resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer, step])

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSendOtp = async () => {
    if (!email) {
      showToast('No email on file. Please update your profile first.', 'error')
      return
    }
    setBusy(true)
    setPwError(null)
    try {
      await authApi.requestOtp(email)
      setStep('sent')
      setResendTimer(30)
      showToast(`OTP sent to ${email}`, 'success')
    } catch (err) {
      setPwError(friendlyError(err, "Couldn't send a verification code."))
    } finally {
      setBusy(false)
    }
  }

  const handleResetPassword = async () => {
    setPwError(null)
    if (otp.length !== 6) {
      setPwError('Enter the 6-digit code from your email.')
      return
    }
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError("Those passwords don't match.")
      return
    }
    setBusy(true)
    try {
      await authApi.restorePassword({ identifier: email, code: otp, password: newPw })
      showToast('Password updated. Use the new one next time you sign in.', 'success')
      setStep('idle')
      setOtp('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      setPwError(friendlyError(err, "Couldn't update your password."))
    } finally {
      setBusy(false)
    }
  }

  const handleEnableNotifications = async () => {
    if (typeof Notification === 'undefined') return
    try {
      const result = await Notification.requestPermission()
      setNotifPerm(result)
      if (result === 'granted') showToast('Browser notifications enabled.', 'success')
      else if (result === 'denied') showToast("Notifications blocked. You can re-enable them in your browser's site settings.", 'error')
    } catch {
      showToast("Couldn't request notification permission.", 'error')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings & Security</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account, password, and notification preferences.</p>
      </div>

      {/* Account info */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Account</h2>
        </div>
        <div className="text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-900 font-medium">{email || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className="text-gray-900 font-medium">{(user?.role || '—').toString().toUpperCase()}</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/app/profile')}
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Edit profile <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Change password */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Change password</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          We'll send a 6-digit code to <strong>{email}</strong>. Enter it along with your new password to confirm.
        </p>

        {step === 'idle' ? (
          <button
            onClick={handleSendOtp}
            disabled={busy || !email}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {busy ? 'Sending…' : 'Send OTP'}
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">OTP from email</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tracking-[0.4em] text-center"
              />
              <div className="text-xs text-gray-400 mt-1.5 flex items-center justify-between">
                {resendTimer > 0 ? (
                  <span>Resend in {resendTimer}s</span>
                ) : (
                  <button onClick={handleSendOtp} disabled={busy} className="text-primary hover:underline">
                    Resend code
                  </button>
                )}
                <button onClick={() => setStep('idle')} className="text-gray-400 hover:text-gray-600">
                  Cancel
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {pwError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {pwError}
              </div>
            )}
            <button
              onClick={handleResetPassword}
              disabled={busy || otp.length !== 6 || newPw.length < 8 || newPw !== confirmPw}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </div>
        )}

        {pwError && step === 'idle' && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {pwError}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Browser notifications</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Get desktop alerts for new messages, appointment reminders, and payment events even when this tab isn't focused.
        </p>
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${notifPerm === 'granted' ? 'bg-green-50 text-green-700'
              : notifPerm === 'denied' ? 'bg-red-50 text-red-700'
                : 'bg-gray-100 text-gray-600'
              }`}
          >
            {notifPerm === 'granted' ? 'Enabled' : notifPerm === 'denied' ? 'Blocked by browser' : 'Not enabled'}
          </span>
          {notifPerm !== 'granted' && (
            <button
              onClick={handleEnableNotifications}
              disabled={notifPerm === 'denied'}
              className="text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {notifPerm === 'denied' ? 'Adjust in browser' : 'Enable'}
            </button>
          )}
        </div>
      </div>

      {/* Danger zone — reuses the same component as ProfilePage */}
      <DangerZone />

      {toast && (
        <div className="fixed right-6 bottom-6 z-50">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, HelpCircle, PlayCircle, Lock, KeyRound } from 'lucide-react'
import { getPlayTutorialEveryLogin, setPlayTutorialEveryLogin } from '../lib/tutorialPrefs'
import DashboardLayout from '../components/DashboardLayout'
import ProfilePageLayout from '../components/ProfilePageLayout'
import { useAuth } from '../context/AuthContext'
import { changePassword, updateUser as updateUserApi, getUser, requestEmailChange, verifyEmailChange, cancelEmailChange, getEmailChangeStatus } from '../api'

const passwordInputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 placeholder:text-slate-400 transition-colors'

export default function AdminSettings() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileNotice, setProfileNotice] = useState('')
  const [playTutorialEveryLogin, setPlayTutorialEveryLoginState] = useState(() => user?.id ? getPlayTutorialEveryLogin(user.id) : false)
  const [refreshing, setRefreshing] = useState(true)
  const [pendingEmail, setPendingEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationBusy, setVerificationBusy] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const [resendSeconds, setResendSeconds] = useState(0)

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = setTimeout(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [resendSeconds])

  useEffect(() => {
    if (user === null) navigate('/', { replace: true })
  }, [user, navigate])

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)


  // Load fresh user data from API to ensure all fields (including college) are up to date
  useEffect(() => {
    if (!user?.id) return
    let isMounted = true
    getUser(user.id)
      .then((freshUser) => {
        if (isMounted && freshUser) {
          updateUser(freshUser)
        }
      })
      .catch((err) => {
        // Silently fail - use cached user data if API call fails
        console.debug('Failed to refresh user data:', err)
      })
      .finally(() => { if (isMounted) setRefreshing(false) })
    getEmailChangeStatus(user.id)
      .then((pending) => {
        if (isMounted && pending.email) {
          setPendingEmail(pending.email)
          setResendSeconds(pending.resend_after || 0)
          if (!pending.expires_in) setVerificationError('Your previous code has expired. Request a new code.')
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [user?.id, updateUser])

  const handleSaveProfile = async (payload) => {
    setProfileError('')
    setProfileNotice('')
    setSaving(true)
    setSaved(false)
    const { first_name, last_name, email, contact_number, profile_image } = payload
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      setProfileError('First name, surname, and email are required.')
      setSaving(false)
      return
    }
    try {
      const result = await updateUserApi(user.id, {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        contact_number: (contact_number || '').trim(),
        profile_image: profile_image || undefined,
      })
      updateUser(result)
      setSaved(true)
      if (email.trim().toLowerCase() !== result.email.toLowerCase()) {
        try {
          const verification = await requestEmailChange(user.id, email.trim())
          setPendingEmail(verification.email)
          setVerificationCode('')
          setVerificationError('')
          setResendSeconds(verification.resend_after)
          setProfileNotice('Profile details saved. Enter the code sent to your new email in the verification panel to finish changing your email.')
        } catch (err) {
          setProfileError(`Your other profile details were saved, but your email has not changed. ${err.message}`)
        }
      }
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setProfileError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyEmail = async (event) => {
    event.preventDefault()
    setVerificationBusy(true)
    setVerificationError('')
    try {
      const result = await verifyEmailChange(user.id, pendingEmail, verificationCode)
      updateUser(result)
      setPendingEmail('')
      setVerificationCode('')
      setProfileNotice('Your new email is verified and saved. Use it the next time you sign in.')
      setProfileError('')
    } catch (err) {
      setVerificationError(err.message)
    } finally {
      setVerificationBusy(false)
    }
  }

  const handleResendCode = async () => {
    setVerificationBusy(true)
    setVerificationError('')
    try {
      const result = await requestEmailChange(user.id, pendingEmail)
      setResendSeconds(result.resend_after)
      setVerificationCode('')
      setProfileNotice('A new code has been sent. Use the latest code within 10 minutes.')
    } catch (err) {
      setVerificationError(err.message)
    } finally {
      setVerificationBusy(false)
    }
  }

  const handleCancelEmail = async () => {
    setVerificationBusy(true)
    setVerificationError('')
    try {
      await cancelEmailChange(user.id)
      setPendingEmail('')
      setVerificationCode('')
      setProfileNotice('Email change cancelled. Your current email remains active.')
    } catch (err) {
      setVerificationError(err.message)
    } finally {
      setVerificationBusy(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from the current password.')
      return
    }

    setPasswordSaving(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(result?.message || 'Password updated successfully.')
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (!user || refreshing) {
    return (
      <DashboardLayout title="Administrator Dashboard" subtitle="Settings" icon={Shield} variant="admin">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-slate-500">Loading...</div>
      </DashboardLayout>
    )
  }

  const subtitle = [user.name, user.college].filter(Boolean).join(' - ') || 'Admin'

  const rightSection = (
    <div className="space-y-6">
      {pendingEmail && <section aria-label="Verify new email" className="rounded-xl border border-teal-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900">Verify your new email</h3>
        <p className="mt-2 break-words text-sm leading-6 text-slate-600">Enter the 6-digit code sent to <strong>{pendingEmail}</strong>. It expires in 10 minutes. Your current email is still active.</p>
        <form onSubmit={handleVerifyEmail} className="mt-4 space-y-3">
          <label htmlFor="email-change-code" className="block text-xs font-semibold text-slate-600">Verification code</label>
          <input id="email-change-code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={verificationBusy || saving} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg tracking-widest focus:outline-teal-600" />
          {verificationError && <p role="alert" className="text-sm text-red-700">{verificationError}</p>}
          <button type="submit" disabled={verificationBusy || saving || verificationCode.length !== 6} className="w-full rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{verificationBusy ? 'Please wait…' : 'Verify and change email'}</button>
          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" onClick={handleResendCode} disabled={verificationBusy || saving || resendSeconds > 0} className="text-xs font-semibold text-teal-700 disabled:opacity-50">{resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}</button>
            <button type="button" onClick={handleCancelEmail} disabled={verificationBusy || saving} className="text-xs font-semibold text-slate-600 disabled:opacity-50">Cancel email change</button>
          </div>
        </form>
      </section>}

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Security</h3>
        </div>
        <form onSubmit={handleChangePassword} className="p-6 space-y-3">
          <p className="text-sm text-slate-600">
            This admin account is pre-created. Change the password here after handing over the credentials.
          </p>
          {passwordError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              {passwordSuccess}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={passwordInputClass}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={passwordInputClass}
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={passwordInputClass}
              placeholder="Retype new password"
            />
          </div>
          <button
            type="submit"
            disabled={passwordSaving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-200/80 transition-colors disabled:opacity-60 disabled:pointer-events-none"
          >
            <KeyRound className="w-4 h-4" />
            {passwordSaving ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
            <HelpCircle className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Tutorial</h3>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-600">Show a short guide to dashboard features when you log in.</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={playTutorialEveryLogin}
              onChange={(e) => {
                const v = e.target.checked
                if (user) {
                  setPlayTutorialEveryLogin(user.id, v)
                  setPlayTutorialEveryLoginState(v)
                }
              }}
              className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
            />
            <span className="text-sm font-medium text-slate-700">Play tutorial every time I log in</span>
          </label>
          <button
            type="button"
            onClick={() => navigate('/admin', { state: { showTutorial: true } })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-50 border border-amber-200/80 transition-colors"
          >
            <PlayCircle className="w-4 h-4" />
            Play tutorial again
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <DashboardLayout title="Administrator Dashboard" subtitle={subtitle} icon={Shield} variant="admin">
      <div className="w-full">
        <ProfilePageLayout
          user={user}
          emailVerificationRequired
          onSaveProfile={handleSaveProfile}
          saving={saving || verificationBusy}
          saved={saved}
          profileError={profileError}
          profileNotice={profileNotice}
          rightSection={rightSection}
          saveButtonLabel="Save profile"
        />
      </div>
    </DashboardLayout>
  )
}

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, KeyRound, Lock, Send } from 'lucide-react'
import { changePassword, requestPasswordChangeCode } from '../api'

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'

export default function PasswordChangeCard({ description = 'A verification code will be sent to your registered email before the password can be changed.', accent = 'blue' }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [codeSending, setCodeSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const accentClass = accent === 'teal'
    ? 'bg-teal-100 text-teal-700'
    : accent === 'slate'
      ? 'bg-slate-100 text-slate-700'
      : 'bg-blue-100 text-blue-700'
  const buttonClass = accent === 'teal'
    ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/20'
    : accent === 'slate'
      ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-500/20'
      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
  const softButtonClass = accent === 'teal'
    ? 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100'
    : accent === 'slate'
      ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
      : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'

  const requestCode = async () => {
    setError('')
    setSuccess('')
    try {
      setCodeSending(true)
      const result = await requestPasswordChangeCode()
      setCodeSent(true)
      setSuccess(result?.message || 'Verification code sent to your email.')
    } catch (err) {
      setError(err.message || 'Failed to send verification code.')
    } finally {
      setCodeSending(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!currentPassword || !newPassword || !confirmPassword || !verificationCode) {
      setError('Please complete all password and verification code fields.')
      return
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and retyped password do not match.')
      return
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from the current password.')
      return
    }
    try {
      setSaving(true)
      const result = await changePassword(currentPassword, newPassword, verificationCode)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setVerificationCode('')
      setCodeSent(false)
      setSuccess(result?.message || 'Password updated successfully.')
    } catch (err) {
      setError(err.message || 'Failed to update password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-6 py-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentClass}`}>
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Security</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 p-6">
        {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />{error}</div>}
        {success && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />{success}</div>}

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Current password</span>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} placeholder="Enter current password" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">New password</span>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="Enter new password" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Retype new password</span>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Retype new password" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Email verification code</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input type="text" inputMode="numeric" maxLength={6} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className={`${inputClass} tracking-[0.35em]`} placeholder="000000" />
            <button type="button" onClick={requestCode} disabled={codeSending} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition disabled:opacity-60 ${softButtonClass}`}>
              <Send className="h-4 w-4" /> {codeSending ? 'Sending...' : codeSent ? 'Resend code' : 'Send code'}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">The code expires in 10 minutes.</p>
        </label>

        <button type="submit" disabled={saving} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition disabled:opacity-60 ${buttonClass}`}>
          <KeyRound className="h-4 w-4" /> {saving ? 'Updating...' : 'Change password'}
        </button>
      </form>
    </div>
  )
}

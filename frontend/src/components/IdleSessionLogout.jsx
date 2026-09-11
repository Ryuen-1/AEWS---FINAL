import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { idleSessionKey, watchIdleSession, IDLE_LOGOUT_MESSAGE } from '../lib/idleSession'

export default function IdleSessionLogout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const studentPage = pathname === '/student-dashboard' || pathname === '/student-profile'
  const staffPage = ['/instructor', '/admin', '/amu-staff', '/help'].some((base) => pathname === base || pathname.startsWith(`${base}/`))
  let studentId = null
  if (studentPage) {
    try {
      const student = JSON.parse(localStorage.getItem('student_user') || 'null')
      studentId = student?.id || student?.student_id || null
    } catch { /* The student page handles missing credentials. */ }
  }
  const sessionKind = studentPage ? 'student' : 'staff'
  const sessionId = studentPage ? studentId : staffPage ? user?.id : null

  useEffect(() => {
    if (!sessionId) return
    return watchIdleSession(idleSessionKey(sessionKind, sessionId), () => {
      if (sessionKind === 'student') {
        localStorage.removeItem('student_user')
      } else {
        // Local sign-out happens immediately; server revocation is best effort.
        void logout().catch(() => {})
      }
      navigate(sessionKind === 'student' ? '/student-login' : '/', {
        replace: true,
        state: { logoutReason: IDLE_LOGOUT_MESSAGE },
      })
    })
  }, [sessionId, sessionKind, logout, navigate])

  return null
}

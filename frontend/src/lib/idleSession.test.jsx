// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { watchIdleSession, idleSessionKey, IDLE_TIMEOUT_MS, IDLE_LOGOUT_MESSAGE } from './idleSession'
import IdleSessionLogout from '../components/IdleSessionLogout'
import { useAuth } from '../context/AuthContext'
import { logout as apiLogout } from '../api'
import { writeStoredAuth, readStoredAuth } from './authStorage'

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }))
let stop
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-11T10:00:00Z'))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  sessionStorage.clear()
  localStorage.clear()
})
afterEach(() => {
  stop?.()
  stop = null
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('expires exactly at 15 minutes and removes event listeners on cleanup', () => {
  const expire = vi.fn()
  const removeListener = vi.spyOn(document, 'removeEventListener')
  stop = watchIdleSession('test-session', expire)
  vi.advanceTimersByTime(IDLE_TIMEOUT_MS - 1)
  expect(expire).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(expire).toHaveBeenCalledTimes(1)
  document.dispatchEvent(new Event('pointerdown'))
  expect(expire).toHaveBeenCalledTimes(1)
  stop()
  expect(removeListener).toHaveBeenCalledWith('keydown', expect.any(Function), true)
})

it('extends the session for user activity, preserving its deadline across reloads', () => {
  const expire = vi.fn()
  stop = watchIdleSession('test-session', expire)
  vi.advanceTimersByTime(10 * 60 * 1000)
  document.dispatchEvent(new Event('keydown'))
  stop()
  stop = watchIdleSession('test-session', expire)
  vi.advanceTimersByTime(14 * 60 * 1000)
  expect(expire).not.toHaveBeenCalled()
  vi.advanceTimersByTime(60 * 1000)
  expect(expire).toHaveBeenCalledTimes(1)
})

it('does not count background work or hidden-tab events as user activity', () => {
  const expire = vi.fn()
  stop = watchIdleSession('test-session', expire)
  vi.advanceTimersByTime(10 * 60 * 1000)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  document.dispatchEvent(new Event('scroll'))
  document.dispatchEvent(new Event('notifications-refreshed'))
  vi.advanceTimersByTime(5 * 60 * 1000)
  expect(expire).toHaveBeenCalledTimes(1)
})

it.each(['focus', 'pointerdown'])('expires on return from sleep before %s can renew it', (event) => {
  const expire = vi.fn()
  stop = watchIdleSession('test-session', expire)
  vi.setSystemTime(Date.now() + IDLE_TIMEOUT_MS + 1000)
  ;(event === 'focus' ? window : document).dispatchEvent(new Event(event))
  expect(expire).toHaveBeenCalledTimes(1)
})

function LoginNotice() {
  const location = useLocation()
  return <div>{location.state?.logoutReason}</div>
}

it.each(['instructor', 'admin', 'amu-staff', 'student'])('redirects an idle %s session with an explanation', (role) => {
  const logout = vi.fn(() => new Promise(() => {}))
  useAuth.mockReturnValue({ user: role === 'student' ? null : { id: 'test-user', role }, logout })
  if (role === 'student') localStorage.setItem('student_user', JSON.stringify({ id: 'test-user' }))
  const route = role === 'student' ? '/student-dashboard' : `/${role}`
  render(<MemoryRouter initialEntries={[route]}><IdleSessionLogout /><Routes><Route path={route} element={<div>Private page</div>} /><Route path="/" element={<LoginNotice />} /><Route path="/student-login" element={<LoginNotice />} /></Routes></MemoryRouter>)
  act(() => vi.advanceTimersByTime(IDLE_TIMEOUT_MS))
  expect(screen.queryByText('Private page')).toBeNull()
  expect(screen.getByText(IDLE_LOGOUT_MESSAGE)).toBeTruthy()
  if (role === 'student') expect(localStorage.getItem('student_user')).toBeNull()
  else expect(logout).toHaveBeenCalledTimes(1)
  expect(sessionStorage.getItem(idleSessionKey(role === 'student' ? 'student' : 'staff', 'test-user'))).toBeNull()
})

it('clears local auth immediately without wiping a later login when revocation finishes', async () => {
  writeStoredAuth({ user: { id: 'old-user', role: 'admin' }, role: 'admin', accessToken: 'old-token' })
  localStorage.setItem('refresh_token', 'refresh-token')
  let finish
  vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { finish = resolve })))
  const request = apiLogout()
  expect(readStoredAuth()).toBeNull()
  expect(localStorage.getItem('refresh_token')).toBeNull()
  writeStoredAuth({ user: { id: 'new-user', role: 'admin' }, role: 'admin', accessToken: 'new-token' })
  finish({ ok: true })
  await request
  expect(readStoredAuth().user.id).toBe('new-user')
})

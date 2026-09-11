// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import AmuStaffSettings from './AmuStaffSettings'
import InstructorSettings from './InstructorSettings'
import AdminSettings from './AdminSettings'
import * as api from '../api'

vi.mock('../api', () => ({ getUser: vi.fn(), updateUser: vi.fn(), getEmailChangeStatus: vi.fn(), requestEmailChange: vi.fn(), verifyEmailChange: vi.fn(), cancelEmailChange: vi.fn(), logout: vi.fn(), changePassword: vi.fn() }))
vi.mock('../components/DashboardLayout', () => ({ default: ({ children }) => <div>{children}</div> }))

const baseUser = { id: 'amu-test', name: 'Raul Lecaros', email: 'old@example.com', college: 'College of Technology', role: 'amu-staff', contact_number: '123' }

describe.each([['AMU Staff', AmuStaffSettings, 'amu-staff'], ['Instructor', InstructorSettings, 'instructor'], ['Admin', AdminSettings, 'admin']])('%s profile settings', (label, SettingsPage, role) => {
const original = { ...baseUser, role }
beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  localStorage.clear()
  sessionStorage.setItem('auth', JSON.stringify({ user: original, role, accessToken: 'test-token' }))
  api.getUser.mockResolvedValue(original)
  api.getEmailChangeStatus.mockResolvedValue({ email: null })
  api.updateUser.mockImplementation(async (id, payload) => ({ ...original, ...payload, name: `${payload.first_name} ${payload.last_name}` }))
  api.requestEmailChange.mockResolvedValue({ email: 'new@example.com', resend_after: 60 })
})
afterEach(cleanup)

function mountSettings() {
  return render(<MemoryRouter><AuthProvider><SettingsPage /></AuthProvider></MemoryRouter>)
}

it('keeps edits and persists separate name fields without a refresh loop', async () => {
  mountSettings()
  const first = await screen.findByRole('textbox', { name: 'First name' })
  await waitFor(() => expect(first).toHaveValue('Raul'))
  expect(screen.getByRole('textbox', { name: 'Surname' })).toHaveValue('Lecaros')
  fireEvent.change(first, { target: { value: 'Maria Ana' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Surname' }), { target: { value: 'De la Cruz' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument())
  expect(first).toHaveValue('Maria Ana')
  expect(screen.getByRole('textbox', { name: 'Surname' })).toHaveValue('De la Cruz')
  expect(api.getUser).toHaveBeenCalledTimes(1)
  expect(JSON.parse(sessionStorage.getItem('auth')).user.name).toBe('Maria Ana De la Cruz')
  expect(api.updateUser.mock.calls[0][1]).not.toHaveProperty('email')
})

it('keeps the old email until verification succeeds and surfaces invalid codes', async () => {
  mountSettings()
  const email = await screen.findByRole('textbox', { name: 'Email' })
  await waitFor(() => expect(email).toHaveValue('old@example.com'))
  fireEvent.change(email, { target: { value: 'new@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  const code = await screen.findByLabelText('Verification code')
  expect(JSON.parse(sessionStorage.getItem('auth')).user.email).toBe('old@example.com')
  api.verifyEmailChange.mockRejectedValueOnce(new Error('Incorrect verification code'))
  fireEvent.change(code, { target: { value: '111111' } })
  fireEvent.click(screen.getByRole('button', { name: 'Verify and change email' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect verification code')
  expect(JSON.parse(sessionStorage.getItem('auth')).user.email).toBe('old@example.com')
  api.verifyEmailChange.mockResolvedValueOnce({ ...original, email: 'new@example.com', email_verified: true })
  fireEvent.change(code, { target: { value: '123456' } })
  fireEvent.click(screen.getByRole('button', { name: 'Verify and change email' }))
  await waitFor(() => expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument())
  expect(JSON.parse(sessionStorage.getItem('auth')).user.email).toBe('new@example.com')
  expect(api.logout).not.toHaveBeenCalled()
})

it('restores a pending email verification on reload and allows cancellation', async () => {
  api.getEmailChangeStatus.mockResolvedValue({ email: 'new@example.com', expires_in: 0, resend_after: 0 })
  api.cancelEmailChange.mockResolvedValue({})
  mountSettings()
  expect(await screen.findByRole('alert')).toHaveTextContent('expired')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel email change' }))
  await waitFor(() => expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument())
  expect(api.cancelEmailChange).toHaveBeenCalledWith(original.id)
  expect(JSON.parse(sessionStorage.getItem('auth')).user.email).toBe('old@example.com')
})

})

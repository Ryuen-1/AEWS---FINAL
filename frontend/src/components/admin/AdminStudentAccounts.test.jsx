// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import AdminStudentAccounts from './AdminStudentAccounts'
import { getStudents } from '../../api'

vi.mock('../../api', () => ({
  getStudents: vi.fn(), deleteStudent: vi.fn(), getStudent: vi.fn(), updateStudent: vi.fn(),
}))

afterEach(() => { cleanup(); vi.clearAllMocks() })

it('shows an API failure without crashing the error display', async () => {
  getStudents.mockRejectedValue(new Error('Could not load student accounts'))
  render(<AdminStudentAccounts />)
  expect(await screen.findByText('Could not load student accounts')).toBeTruthy()
  expect(screen.getByText('Student Accounts')).toBeTruthy()
})

it('shows legacy accounts with missing email and keeps duplicate profiles visible', async () => {
  getStudents.mockResolvedValue([
    { id: 'first', name: 'First Legacy Profile', id_number: '2201102063' },
    { id: 'second', name: 'Second Legacy Profile', id_number: '2201102063', email: null },
  ])
  render(<AdminStudentAccounts />)
  expect(await screen.findByText('First Legacy Profile')).toBeTruthy()
  expect(getStudents).toHaveBeenCalledWith('', true)
  expect(screen.getByText('Second Legacy Profile')).toBeTruthy()
})

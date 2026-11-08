// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { uploadAndCreateClasslist, uploadClassFiles, previewClasslist } from './api'

beforeEach(() => {
  sessionStorage.setItem('auth', JSON.stringify({ user: { id: 'instructor-test' }, role: 'instructor', accessToken: 'test-token' }))
})
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

const file = () => new File(['Student ID,Name\n123,Student'], 'record.csv', { type: 'text/csv' })

describe.each(['classlist', 'gradesheet', 'attendance'])('%s upload feedback', (type) => {
  it('preserves the server rejection message', async () => {
    const message = `Wrong file content. Please upload a ${type}.`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ detail: message }) }))
    await expect(uploadClassFiles('class-test', [file()], type)).rejects.toThrow(message)
    const options = fetch.mock.calls[0][1]
    expect(options.body.get('type')).toBe(type)
    expect(options.body.get('files').name).toBe('record.csv')
  })
  it('returns successful upload results', async () => {
    const result = { updated: 1, added: 1 }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => result }))
    await expect(uploadClassFiles('class-test', [file()], type)).resolves.toEqual(result)
  })
})

it('surfaces class creation and preview type errors', async () => {
  const message = 'This appears to be a gradesheet. Please upload a class list.'
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ detail: message }) }))
  await expect(uploadAndCreateClasslist([file()])).rejects.toThrow(message)
  await expect(previewClasslist(file())).rejects.toThrow(message)
})

import { describe, it, expect, vi } from 'vitest'
import { loadClasslistSource, saveClasslistSource, readClasslistSource, readDroppedClasslists } from './classlistSource'

describe('linked class list', () => {
  it('captures the original file handle during a drop and links it to the created class', async () => {
    const file = { name: 'class.csv' }
    const handle = { getFile: vi.fn().mockResolvedValue(file) }
    const item = { kind: 'file', getAsFile: () => file, getAsFileSystemHandle: vi.fn().mockResolvedValue(handle) }
    const pending = readDroppedClasslists([item])
    expect(item.getAsFileSystemHandle).toHaveBeenCalledTimes(1)
    const entries = await pending
    await saveClasslistSource('teacher', 'new-class', entries[0].handle)
    expect(await loadClasslistSource('teacher', 'new-class')).toBe(handle)
    expect(await readClasslistSource(handle)).toBe(file)
  })

  it('keeps ordinary uploads usable when dropped-file linking is unavailable', async () => {
    const file = { name: 'class.csv' }
    expect(await readDroppedClasslists([{ kind: 'file', getAsFile: () => file }])).toEqual([{ file, handle: null }])
  })
  it('reads saved edits from the file handle on every update', async () => {
    const original = { name: 'class.csv', contents: 'Original student' }
    const edited = { name: 'class.csv', contents: 'Corrected student' }
    const handle = { getFile: vi.fn().mockResolvedValueOnce(original).mockResolvedValueOnce(edited) }
    await saveClasslistSource('instructor', 'class', handle)
    const linked = await loadClasslistSource('instructor', 'class')
    expect(await readClasslistSource(linked)).toBe(original)
    expect(await readClasslistSource(linked)).toBe(edited)
    expect(handle.getFile).toHaveBeenCalledTimes(2)
    expect(await loadClasslistSource('another-instructor', 'class')).toBeFalsy()
  })

  it('requests read permission only when access needs restoring', async () => {
    const handle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
      getFile: vi.fn().mockResolvedValue({ name: 'class.xlsx' }),
    }
    await readClasslistSource(handle)
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'read' })
    handle.queryPermission.mockResolvedValue('granted')
    await readClasslistSource(handle)
    expect(handle.requestPermission).toHaveBeenCalledTimes(1)
  })

  it('does not read old contents when access is denied or the source is gone', async () => {
    const handle = {
      queryPermission: vi.fn().mockResolvedValue('denied'),
      requestPermission: vi.fn().mockResolvedValue('denied'),
      getFile: vi.fn(),
    }
    await expect(readClasslistSource(handle)).rejects.toThrow('Allow access')
    expect(handle.getFile).not.toHaveBeenCalled()
    handle.queryPermission.mockResolvedValue('granted')
    handle.getFile.mockRejectedValue(new Error('File missing'))
    await expect(readClasslistSource(handle)).rejects.toThrow('File missing')
  })
})

const handles = new Map()
const keyFor = (userId, classId) => `${userId}:${classId}`

async function storeHandle(key, handle) {
  if (!globalThis.indexedDB) return null
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('classlist-sources', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('sources')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('sources', handle ? 'readwrite' : 'readonly')
      const store = transaction.objectStore('sources')
      const request = handle ? store.put(handle, key) : store.get(key)
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function saveClasslistSource(userId, classId, handle) {
  const key = keyFor(userId, classId)
  handles.set(key, handle)
  // A browser may disable persistent storage; the live link still works this session.
  await storeHandle(key, handle).catch(() => {})
}

export async function loadClasslistSource(userId, classId) {
  const key = keyFor(userId, classId)
  if (handles.has(key)) return handles.get(key)
  const handle = await storeHandle(key).catch(() => null)
  if (handle) handles.set(key, handle)
  return handle
}

export async function readClasslistSource(handle) {
  if (handle.queryPermission && await handle.queryPermission({ mode: 'read' }) !== 'granted') {
    if (await handle.requestPermission({ mode: 'read' }) !== 'granted') {
      throw new Error('Allow access to the linked class list file to read your saved changes.')
    }
  }
  // Always read a new File snapshot; never reuse the original upload.
  return handle.getFile()
}

export function pickClasslistSource(multiple = false) {
  return window.showOpenFilePicker({
    multiple,
    types: [{ description: 'Class list', accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      ...(multiple ? { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] } : {}),
    } }],
    excludeAcceptAllOption: true,
  })
}

export async function readDroppedClasslists(items) {
  // Capture handles during the drop event, before the browser clears drag data.
  const requests = Array.from(items)
    .filter(item => item.kind === 'file')
    .map(item => ({
      file: item.getAsFile(),
      handle: item.getAsFileSystemHandle ? item.getAsFileSystemHandle().catch(() => null) : Promise.resolve(null),
    }))
  const entries = await Promise.all(requests.map(async entry => {
    const handle = await entry.handle
    return { handle, file: handle ? await handle.getFile() : entry.file }
  }))
  return entries.filter(entry => entry.file)
}

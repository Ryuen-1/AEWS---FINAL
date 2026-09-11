export const IDLE_TIMEOUT_MS = 15 * 60 * 1000
export const IDLE_LOGOUT_MESSAGE = 'You were signed out after 15 minutes of inactivity. Please sign in again.'

export function idleSessionKey(kind, id) {
  return `last-activity:${kind}:${id}`
}

export function resetIdleSession(kind, id) {
  sessionStorage.setItem(idleSessionKey(kind, id), String(Date.now()))
}

// Track user input, not API polling. Keep the timestamp across reloads.
export function watchIdleSession(key, onExpire) {
  const stored = Number(sessionStorage.getItem(key))
  let lastActivity = stored > 0 ? stored : Date.now()
  let lastWritten = lastActivity
  let expired = false
  let timer
  const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'wheel', 'touchstart']

  const expireIfNeeded = () => {
    if (expired) return true
    if (Date.now() - lastActivity < IDLE_TIMEOUT_MS) return false
    expired = true
    clearTimeout(timer)
    sessionStorage.removeItem(key)
    onExpire()
    return true
  }
  const schedule = () => {
    if (expireIfNeeded()) return
    timer = setTimeout(schedule, Math.max(1, IDLE_TIMEOUT_MS - (Date.now() - lastActivity)))
  }
  const activity = () => {
    if (expireIfNeeded() || document.visibilityState === 'hidden') return
    lastActivity = Date.now()
    // Avoid synchronous storage writes for every pointer-move event.
    if (lastActivity - lastWritten >= 1000) {
      sessionStorage.setItem(key, String(lastActivity))
      lastWritten = lastActivity
    }
  }
  const checkOnReturn = () => { expireIfNeeded() }
  const persist = () => {
    if (!expired) sessionStorage.setItem(key, String(lastActivity))
  }

  sessionStorage.setItem(key, String(lastActivity))
  events.forEach((event) => document.addEventListener(event, activity, { capture: true, passive: true }))
  document.addEventListener('visibilitychange', checkOnReturn)
  window.addEventListener('focus', checkOnReturn)
  window.addEventListener('pagehide', persist)
  schedule()
  return () => {
    clearTimeout(timer)
    events.forEach((event) => document.removeEventListener(event, activity, true))
    document.removeEventListener('visibilitychange', checkOnReturn)
    window.removeEventListener('focus', checkOnReturn)
    window.removeEventListener('pagehide', persist)
    persist()
  }
}

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { clearStoredAuth, normalizeAuthPayload, readStoredAuth, writeStoredAuth } from '../lib/authStorage'
import { logout as apiLogout } from '../api'

const AuthContext = createContext(null)

export { AuthContext }

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth)

  const login = useCallback((data) => {
    const payload = writeStoredAuth(data)
    if (payload) {
      setAuth(payload)
    }
  }, [])

  const logout = useCallback(async () => {
    setAuth(null)
    await apiLogout()  // Call API logout to revoke refresh token
  }, [])

  const updateUser = useCallback((updates) => {
    if (!auth?.user || !updates || typeof updates !== 'object') return
    const payload = normalizeAuthPayload({
      user: { ...auth.user, ...updates },
      role: auth.role,
      accessToken: auth.accessToken,
    })
    if (!payload) return
    setAuth(payload)
    writeStoredAuth(payload)
  }, [auth])

  const value = useMemo(
    () => ({
      user: auth?.user ?? null,
      role: auth?.role ?? null,
      isAuthenticated: Boolean(auth?.user),
      login,
      logout,
      updateUser,
    }),
    [auth, login, logout, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

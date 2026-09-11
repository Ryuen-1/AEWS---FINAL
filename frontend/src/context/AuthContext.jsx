import React, { useContext, useState, useCallback, useMemo } from 'react'
import { normalizeAuthPayload, readStoredAuth, writeStoredAuth } from '../lib/authStorage'
import { logout as apiLogout } from '../api'
import { resetIdleSession } from '../lib/idleSession'

import { AuthContext } from './authContextStore'

export { AuthContext }

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth)

  const login = useCallback((data) => {
    const payload = writeStoredAuth(data)
    if (payload) {
      resetIdleSession('staff', payload.user.id)
      setAuth(payload)
    }
  }, [])

  const logout = useCallback(async () => {
    setAuth(null)
    await apiLogout()  // Call API logout to revoke refresh token
  }, [])

  const updateUser = useCallback((updates) => {
    if (!updates || typeof updates !== 'object') return
    setAuth((current) => {
      if (!current?.user) return current
      const payload = normalizeAuthPayload({
        user: { ...current.user, ...updates },
        role: current.role,
        accessToken: current.accessToken,
      })
      if (!payload) return current
      writeStoredAuth(payload)
      return payload
    })
  }, [])

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

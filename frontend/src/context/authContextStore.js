import { createContext } from 'react'

// Keep the context identity stable when Fast Refresh reloads AuthProvider.
export const AuthContext = createContext(null)

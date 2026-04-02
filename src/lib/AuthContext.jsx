import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/api/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoadingAuth(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        const path = window.location.pathname
        const publicPaths = ['/SignIn', '/RoleSelection', '/Home', '/']
        if (!publicPaths.some((p) => path === p || path.startsWith(p))) {
          navigate('/SignIn')
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  const value = useMemo(() => ({
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError,
    navigateToLogin: () => navigate('/SignIn'),
  }), [isLoadingAuth, authError, navigate])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

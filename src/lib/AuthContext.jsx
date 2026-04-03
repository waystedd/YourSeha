import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/api/supabaseClient'

const AuthContext = createContext(null)

const PUBLIC_PATHS = [
  '/SignIn',
  '/VerifyEmail',
  '/RoleSelection',
  '/AboutCareco',
  '/PrivacyPolicy',
  '/Disclaimer',
  '/Contact',
  '/TermsOfService',
]

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function buildReturnUrl() {
  return `${window.location.pathname || '/'}${window.location.search || ''}`
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      const currentPath = window.location.pathname
      if (!session && !isPublicPath(currentPath)) {
        setAuthError({ type: 'auth_required' })
      } else {
        setAuthError(null)
      }
      setIsLoadingAuth(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentPath = window.location.pathname
      if (!session && !isPublicPath(currentPath)) {
        setAuthError({ type: 'auth_required' })
      } else {
        setAuthError(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError,
    navigateToLogin: () => navigate(`/SignIn?returnUrl=${encodeURIComponent(buildReturnUrl())}`),
  }), [isLoadingAuth, authError, navigate])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

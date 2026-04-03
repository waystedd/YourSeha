import React, { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQueryClient } from "@tanstack/react-query"
import { base44 } from "@/api/base44Client"
import { toast } from "sonner"

export default function SignIn() {
  const [tab, setTab] = useState("login")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [signupForm, setSignupForm] = useState({ full_name: "", email: "", password: "", confirm_password: "", role: "user" })
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const returnUrl = new URLSearchParams(location.search).get("returnUrl") || "/"

  const goAfterAuth = async () => {
    await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    const user = await queryClient.fetchQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() })
    if (!user?.role_selected) { navigate("/RoleSelection"); return }
    if (user?.role === "psychologist" && !user?.onboarding_completed) { toast.info("Please complete your professional profile first"); navigate("/EditProfile"); return }
    if (returnUrl && returnUrl !== "/") { navigate(returnUrl); return }
    navigate(user?.role === "psychologist" ? "/PsychologistDashboard" : "/WellnessDashboard")
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginForm.email || !loginForm.password) { toast.error("Please fill email and password"); return }
    setLoading(true)
    try { await base44.auth.signIn(loginForm); toast.success("Welcome back!"); await goAfterAuth() }
    catch (err) { toast.error(err?.message || "Unable to sign in") }
    finally { setLoading(false) }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!signupForm.full_name || !signupForm.email || !signupForm.password) { toast.error("Please complete all required fields"); return }
    if (signupForm.password.length < 8) { toast.error("Password must be at least 8 characters"); return }
    if (signupForm.password !== signupForm.confirm_password) { toast.error("Passwords do not match"); return }
    setLoading(true)
    try {
      const result = await base44.auth.signUp(signupForm)
      if (result?.needsEmailConfirmation) {
        toast.success("Check your email — enter the code or use the link we sent to continue.")
        navigate(`/VerifyEmail?email=${encodeURIComponent(result.email || signupForm.email)}`)
        return
      }
      toast.success("Account created! Welcome to YourSeha 💕")
      await goAfterAuth()
    }
    catch (err) { toast.error(err?.message || "Unable to create account") }
    finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try { await base44.auth.signInWithGoogle() }
    catch (err) { toast.error(err?.message || "Google sign-in failed"); setGoogleLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#FFE5D9]/60 shadow-sm p-5">
        <div className="text-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F4A896] to-[#E8907C] flex items-center justify-center mx-auto mb-2 shadow">
            <span className="text-white font-semibold">Y</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">{tab === "login" ? "Welcome back" : "Join YourSeha"}</h1>
          <p className="text-xs text-gray-500 mt-1">{tab === "login" ? "Sign in to continue your wellness journey" : "A supportive space made just for you"}</p>
        </div>
        <button onClick={handleGoogle} disabled={googleLoading} className="w-full h-10 mb-3 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition text-sm font-medium text-gray-700">
          {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
          Continue with Google
        </button>
        <div className="flex items-center gap-2 mb-3"><div className="flex-1 h-px bg-gray-100" /><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-100" /></div>
        <div className="grid grid-cols-2 gap-1 bg-[#FFF8F6] rounded-xl p-1 mb-4">
          <button onClick={() => setTab("login")} className={`h-9 rounded-lg text-sm ${tab === "login" ? "bg-white border border-gray-300 text-gray-800" : "text-gray-500"}`}>Log In</button>
          <button onClick={() => setTab("signup")} className={`h-9 rounded-lg text-sm ${tab === "signup" ? "bg-white border border-gray-300 text-gray-800" : "text-gray-500"}`}>Create Account</button>
        </div>
        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <div><label className="text-xs text-gray-600 mb-1 block">Email</label><Input type="email" value={loginForm.email} onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" className="h-9 rounded-lg" /></div>
            <div>
              <div className="flex items-center justify-between mb-1"><label className="text-xs text-gray-600">Password</label><span className="text-[10px] text-[#E8907C]">Forgot password?</span></div>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={loginForm.password} onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="h-9 rounded-lg pr-9" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <Button disabled={loading} className="w-full h-9 rounded-lg bg-gradient-to-r from-[#F4A896] to-[#E8907C] text-white">{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging in...</> : "Log In"}</Button>
            <p className="text-xs text-gray-500 text-center">No account? <button type="button" onClick={() => setTab("signup")} className="text-[#E8907C]">Create one</button></p>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3">
            <div><label className="text-xs text-gray-600 mb-1 block">Full Name</label><Input value={signupForm.full_name} onChange={(e) => setSignupForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Your name" className="h-9 rounded-lg" /></div>
            <div><label className="text-xs text-gray-600 mb-1 block">Email</label><Input type="email" value={signupForm.email} onChange={(e) => setSignupForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" className="h-9 rounded-lg" /></div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">I am signing up as</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSignupForm((f) => ({ ...f, role: "user" }))} className={`h-9 rounded-lg text-sm border ${signupForm.role === "user" ? "border-[#F4A896] bg-[#FFF8F6] text-[#E8907C]" : "border-gray-200 text-gray-600"}`}>Caregiver</button>
                <button type="button" onClick={() => setSignupForm((f) => ({ ...f, role: "psychologist" }))} className={`h-9 rounded-lg text-sm border ${signupForm.role === "psychologist" ? "border-[#F4A896] bg-[#FFF8F6] text-[#E8907C]" : "border-gray-200 text-gray-600"}`}>Psychologist</button>
              </div>
            </div>
            <div className="relative"><label className="text-xs text-gray-600 mb-1 block">Password</label><Input type={showPassword ? "text" : "password"} value={signupForm.password} onChange={(e) => setSignupForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" className="h-9 rounded-lg pr-9" /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-[34px] text-gray-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
            <div className="relative"><label className="text-xs text-gray-600 mb-1 block">Confirm Password</label><Input type={showConfirmPassword ? "text" : "password"} value={signupForm.confirm_password} onChange={(e) => setSignupForm((f) => ({ ...f, confirm_password: e.target.value }))} placeholder="Repeat password" className="h-9 rounded-lg pr-9" /><button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-2 top-[34px] text-gray-400">{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
            <Button disabled={loading} className="w-full h-9 rounded-lg bg-gradient-to-r from-[#F4A896] to-[#E8907C] text-white">{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Account"}</Button>
            <p className="text-xs text-gray-500 text-center">Have an account? <button type="button" onClick={() => setTab("login")} className="text-[#E8907C]">Log in</button></p>
          </form>
        )}
        <p className="text-[10px] text-center text-gray-400 mt-4">By continuing, you agree to our Terms and Privacy Policy</p>
      </div>
    </div>
  )
}

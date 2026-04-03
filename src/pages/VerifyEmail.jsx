import React, { useCallback, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQueryClient } from "@tanstack/react-query"
import { base44, supabase } from "@/api/base44Client"
import { toast } from "sonner"

function useGoAfterVerification(navigate) {
  const queryClient = useQueryClient()

  return useCallback(async () => {
    await base44.auth.completePendingSignup()
    await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    const user = await queryClient.fetchQuery({
      queryKey: ["currentUser"],
      queryFn: () => base44.auth.me(),
    })
    if (!user?.role_selected) {
      navigate("/RoleSelection")
      return
    }
    if (user?.role === "psychologist" && !user?.onboarding_completed) {
      toast.info("Please complete your professional profile first")
      navigate("/EditProfile")
      return
    }
    navigate(user?.role === "psychologist" ? "/PsychologistDashboard" : "/WellnessDashboard")
  }, [navigate, queryClient])
}

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const goAfter = useGoAfterVerification(navigate)

  const emailFromQuery = searchParams.get("email") || ""
  const [email, setEmail] = useState(emailFromQuery)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [finishing, setFinishing] = useState(true)

  useEffect(() => {
    if (emailFromQuery) setEmail(emailFromQuery)
  }, [emailFromQuery])

  const tryFinishFromSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setFinishing(false)
      return
    }
    try {
      await goAfter()
    } catch {
      setFinishing(false)
    }
  }, [goAfter])

  useEffect(() => {
    void tryFinishFromSession()
  }, [tryFinishFromSession])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) void tryFinishFromSession()
    })
    return () => subscription.unsubscribe()
  }, [tryFinishFromSession])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    const digits = code.replace(/\D/g, "")
    if (!trimmed) {
      toast.error("Please enter your email address")
      return
    }
    if (digits.length !== 6) {
      toast.error("Enter the 6-digit code from your email")
      return
    }
    setLoading(true)
    try {
      await base44.auth.verifyEmailOtp(trimmed, digits)
      toast.success("Email verified!")
      await goAfter()
    } catch (err) {
      toast.error(err?.message || "Invalid or expired code")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      toast.error("Enter your email first")
      return
    }
    setResending(true)
    try {
      await base44.auth.resendSignupEmail(trimmed)
      toast.success("We sent another email — check your inbox")
    } catch (err) {
      toast.error(err?.message || "Could not resend email")
    } finally {
      setResending(false)
    }
  }

  if (finishing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <Loader2 className="w-8 h-8 animate-spin text-[#E8907C]" />
          <p className="text-sm">Signing you in…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F6] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#FFE5D9]/60 shadow-sm p-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F4A896] to-[#E8907C] flex items-center justify-center mx-auto mb-4 shadow">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-semibold text-gray-800 text-center">Verify your email</h1>
        <p className="text-sm text-gray-500 text-center mt-2">
          We sent a message to your inbox. Enter the 6-digit code below, or open the link in that email to continue.
        </p>
        <p className="text-xs text-gray-400 text-center mt-3">
          Did not get an email? Check spam, or use “Resend” below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-10 rounded-lg"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">6-digit code</label>
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="h-10 rounded-lg text-center text-lg tracking-[0.4em] font-mono"
              maxLength={6}
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-gradient-to-r from-[#F4A896] to-[#E8907C] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify and continue"
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="w-full mt-3 text-sm text-[#E8907C] hover:underline disabled:opacity-50"
        >
          {resending ? "Sending…" : "Resend confirmation email"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/SignIn")}
          className="w-full mt-4 text-xs text-gray-500 hover:text-gray-700"
        >
          Back to sign in
        </button>
      </div>
    </div>
  )
}

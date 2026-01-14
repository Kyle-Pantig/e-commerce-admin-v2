"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { GalleryVerticalEnd, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { authApi } from "@/lib/api/services/users"

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isValidSession, setIsValidSession] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check if user came from signup flow
  useEffect(() => {
    if (!email) {
      router.push("/signup")
      return
    }
    
    // Check for valid signup session
    const pendingEmail = sessionStorage.getItem("pending_verification_email")
    if (pendingEmail !== email) {
      // User didn't come from signup flow - redirect
      toast.error("Please sign up first")
      router.push("/signup")
      return
    }
    
    setIsValidSession(true)
  }, [email, router])

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && isValidSession) {
      inputRef.current.focus()
    }
  }, [isValidSession])

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (code.length !== 6) {
      setError("Please enter a 6-digit code")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await authApi.verifyOtp(email, code)
      
      // Clear the session flag
      sessionStorage.removeItem("pending_verification_email")
      
      toast.success("Email verified successfully!", {
        description: "You can now log in to your account.",
      })
      router.push("/login?verified=true")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return

    setIsResending(true)
    setError(null)

    try {
      await authApi.resendOtp(email, "SIGNUP")
      toast.success("Code sent!", {
        description: "A new verification code has been sent to your email.",
      })
      setResendCooldown(60) // 60 second cooldown
      setCode("") // Clear existing code
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend code"
      setError(message)
    } finally {
      setIsResending(false)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6)
    setCode(value)
    setError(null)
  }

  // Show nothing while checking session
  if (!isValidSession) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleVerify}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-8 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-6" />
            </div>
            <h1 className="text-xl font-bold">Verify your email</h1>
            <FieldDescription>
              We sent a 6-digit code to <strong>{email}</strong>
            </FieldDescription>
          </div>

          {error && <FieldError>{error}</FieldError>}

          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="code">Verification Code</FieldLabel>
            <Input
              ref={inputRef}
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              disabled={isLoading}
              maxLength={6}
            />
            <FieldDescription>
              This code will expire in 10 minutes
            </FieldDescription>
          </Field>

          <Field>
            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
          </Field>

          <div className="text-center">
            <FieldDescription>
              Didn&apos;t receive the code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || resendCooldown > 0}
                className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {isResending ? (
                  "Sending..."
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  "Resend code"
                )}
              </button>
            </FieldDescription>
          </div>

          <div className="text-center">
            <FieldDescription>
              Wrong email?{" "}
              <a href="/signup" className="text-primary hover:underline">
                Go back to sign up
              </a>
            </FieldDescription>
          </div>
        </FieldGroup>
      </form>
    </div>
  )
}

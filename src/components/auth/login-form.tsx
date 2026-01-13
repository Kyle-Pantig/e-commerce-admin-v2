"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { GalleryVerticalEnd, Loader2, CheckCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { loginSchema, type LoginFormData } from "@/lib/validations"
import { authApi } from "@/lib/api/services/users"
import { ApiClientError } from "@/lib/api/client"

export function LoginForm({
  className,
  errorMessage,
  ...props
}: React.ComponentProps<"div"> & {
  errorMessage?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const verified = searchParams.get("verified")
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
    getValues,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Show verified message
  useEffect(() => {
    if (verified === "true") {
      setShowVerifiedMessage(true)
      // Remove the query param after showing
      const timer = setTimeout(() => {
        window.history.replaceState({}, "", "/login")
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [verified])

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Use shared API service for login - it checks approval status and email verification
      const authResponse = await authApi.login(data.email, data.password)
      
      if (!authResponse.user || !authResponse.access_token) {
        setFormError("root", {
          type: "manual",
          message: "Login failed. Please try again.",
        })
        return
      }

      // Set session in Supabase using tokens from backend
      const supabase = createClient()
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: authResponse.access_token,
        refresh_token: authResponse.refresh_token,
      })

      if (sessionError) {
        setFormError("root", {
          type: "manual",
          message: "Failed to set session. Please try again.",
        })
        return
      }
      
      // Check user role to determine redirect
      const role = authResponse.user.user_metadata?.role || "CUSTOMER"
      
      if (role === "CUSTOMER") {
        // Customers go to home page
        router.push("/")
      } else {
        // Admin/Staff go to dashboard
        router.push("/dashboard")
      }
      router.refresh()
    } catch (err) {
      let errorMessage = "Invalid email or password"
      
      if (err instanceof ApiClientError) {
        // Check for email verification error
        if (err.message?.toLowerCase().includes("verify your email")) {
          // Set session flag and redirect to verify page
          const email = getValues("email")
          sessionStorage.setItem("pending_verification_email", email)
          router.push(`/verify?email=${encodeURIComponent(email)}`)
          return
        }
        
        // Show specific message for approval pending (403)
        if (err.status === 403) {
          errorMessage = err.message || "Your account is pending approval."
        }
      }
      
      setFormError("root", {
        type: "manual",
        message: errorMessage,
      })
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">E-commerce Store</span>
            </a>
            <h1 className="text-xl font-bold">Welcome back</h1>
            <FieldDescription>
              Don&apos;t have an account? <a href="/signup">Sign up</a>
            </FieldDescription>
          </div>
          
          {showVerifiedMessage && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-md text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Email verified successfully! You can now log in.</span>
            </div>
          )}
          
          {(errors.root || errorMessage) && (
            <FieldError>{errorMessage || errors.root?.message}</FieldError>
          )}
          
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              aria-invalid={errors.email ? true : undefined}
              {...register("email")}
              disabled={isSubmitting}
            />
            {errors.email && (
              <FieldError>{errors.email.message}</FieldError>
            )}
          </Field>
          
          <Field data-invalid={errors.password ? true : undefined}>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <a
                href="#"
                className="text-sm text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                  // TODO: Implement forgot password
                  alert("Forgot password functionality coming soon")
                }}
              >
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              aria-invalid={errors.password ? true : undefined}
              {...register("password")}
              disabled={isSubmitting}
            />
            {errors.password && (
              <FieldError>{errors.password.message}</FieldError>
            )}
          </Field>
          
          <Field>
            <Button type="submit" variant='default' className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}

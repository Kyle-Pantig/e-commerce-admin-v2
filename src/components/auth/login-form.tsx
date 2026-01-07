"use client"

import { useRouter } from "next/navigation"
import { GalleryVerticalEnd } from "lucide-react"
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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Use shared API service for login - it checks approval status
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
      
      // Supabase handles cookies automatically via SSR
      // Redirect to dashboard
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      let errorMessage = "Invalid email or password"
      
      // Only show specific message for approval pending (403)
      if (err instanceof ApiClientError && err.status === 403) {
        errorMessage = err.message || "Your account is pending approval."
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
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">E-commerce Admin</span>
            </a>
            <h1 className="text-xl font-bold">Welcome back</h1>
            <FieldDescription>
              Don&apos;t have an account? <a href="/signup">Sign up</a>
            </FieldDescription>
          </div>
          
          {(errors.root || errorMessage) && (
            <FieldError>{errorMessage || errors.root?.message}</FieldError>
          )}
          
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
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
                  alert("Forgot password functionality will be implemented here")
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
              {isSubmitting ? "Signing in..." : "Login"}
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

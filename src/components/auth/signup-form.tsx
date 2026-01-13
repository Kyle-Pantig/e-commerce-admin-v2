"use client"

import { useRouter } from "next/navigation"
import { GalleryVerticalEnd, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
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
import { signupSchema, type SignupFormData } from "@/lib/validations"
import { authApi } from "@/lib/api/services/users"

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    try {
      // Use OTP-based signup flow
      await authApi.signupWithOtp({
        email: data.email,
        password: data.password,
        full_name: data.fullName,
      })
      
      // Show success toast
      toast.success("Verification code sent!", {
        description: "Please check your email for the verification code.",
        duration: 5000,
      })
      
      // Store email in session to allow access to verify page
      sessionStorage.setItem("pending_verification_email", data.email)
      
      // Redirect to verify page
      router.push(`/verify?email=${encodeURIComponent(data.email)}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Signup failed. Please try again."
      
      // Check if error is email-related and set it on the email field
      const lowerMessage = errorMessage.toLowerCase()
      if (lowerMessage.includes("email") || lowerMessage.includes("already exists")) {
        setFormError("email", {
          type: "manual",
          message: errorMessage,
        })
      } else if (lowerMessage.includes("wait") || lowerMessage.includes("too many")) {
        setFormError("root", {
          type: "manual",
          message: "Please wait a moment before trying again",
        })
      } else {
        setFormError("root", {
          type: "manual",
          message: errorMessage,
        })
      }
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
            <h1 className="text-xl font-bold">Create an account</h1>
            <FieldDescription>
              Already have an account? <a href="/login">Sign in</a>
            </FieldDescription>
          </div>
          
          {errors.root && (
            <FieldError>{errors.root.message}</FieldError>
          )}
          
          <Field data-invalid={errors.fullName ? true : undefined}>
            <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              aria-invalid={errors.fullName ? true : undefined}
              {...register("fullName")}
              disabled={isSubmitting}
            />
            {errors.fullName && (
              <FieldError>{errors.fullName.message}</FieldError>
            )}
          </Field>
          
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
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              aria-invalid={errors.password ? true : undefined}
              {...register("password")}
              disabled={isSubmitting}
            />
            {errors.password && (
              <FieldError>{errors.password.message}</FieldError>
            )}
          </Field>
          
          <Field data-invalid={errors.confirmPassword ? true : undefined}>
            <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              aria-invalid={errors.confirmPassword ? true : undefined}
              {...register("confirmPassword")}
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <FieldError>{errors.confirmPassword.message}</FieldError>
            )}
          </Field>
          
          <Field>
            <Button type="submit" variant='default' className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
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

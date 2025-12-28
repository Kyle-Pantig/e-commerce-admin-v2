import { SignUpForm } from "@/components/auth"

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <SignUpForm />
      </div>
    </div>
  )
}


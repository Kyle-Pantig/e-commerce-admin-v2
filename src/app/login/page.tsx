import { LoginForm } from "@/components/auth"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect if already logged in
  if (user) {
    redirect("/dashboard")
  }

  const params = await searchParams
  const errorMessage = params.error === "pending_approval" 
    ? "Your account is pending admin approval. Please wait for approval before signing in." 
    : undefined

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <LoginForm errorMessage={errorMessage} />
      </div>
    </div>
  )
}


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
  let errorMessage: string | undefined
  
  if (params.error === "pending_approval") {
    errorMessage = "Your account is pending approval. Please wait for approval before signing in."
  } else if (params.error === "session_expired") {
    errorMessage = "Your session has expired. Please sign in again."
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <LoginForm errorMessage={errorMessage} />
      </div>
    </div>
  )
}


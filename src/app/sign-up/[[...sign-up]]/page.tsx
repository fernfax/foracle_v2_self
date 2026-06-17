import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="bg-muted/50 flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  )
}

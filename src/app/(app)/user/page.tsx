import { redirect } from "next/navigation"

// /user has no content of its own — it lands on the default tab. No ?tab=
// back-compat (pre-release app); callers link straight to /user/<tab>.
export default function UserIndex() {
  redirect("/user/overview")
}

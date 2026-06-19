import { redirect } from "next/navigation"

// /goals has no content of its own — it lands on the default tab. No ?tab=
// back-compat (pre-release app); callers link straight to /goals/<tab>.
export default function GoalsIndex() {
  redirect("/goals/active")
}

import { redirect } from "next/navigation"

// /assets has no content of its own — it lands on the default tab. No ?tab=
// back-compat (pre-release app); callers link straight to /assets/<tab>.
export default function AssetsIndex() {
  redirect("/assets/property")
}

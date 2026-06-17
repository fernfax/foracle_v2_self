import { redirect } from "next/navigation"
import { getUserPolicies } from "@/actions/policies"
import { getUserFamilyMembers } from "@/actions/user"
import { currentUser } from "@clerk/nextjs/server"

import { PoliciesClient } from "@/app/(app)/policies/client"

export const dynamic = "force-dynamic"

export default async function PoliciesPage() {
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in")
  }

  const [policies, familyMembers] = await Promise.all([
    getUserPolicies(),
    getUserFamilyMembers()
  ])

  return (
    <PoliciesClient
      initialPolicies={policies}
      familyMembers={familyMembers}
      userId={user.id}
    />
  )
}

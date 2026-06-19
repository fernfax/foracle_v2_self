import { loadVisibleFamilyMembers } from "@/lib/user-page-data"
import { FamilyMemberGrid } from "@/components/family-members/family-member-grid"

export default async function FamilyTab() {
  const members = await loadVisibleFamilyMembers()
  return <FamilyMemberGrid initialMembers={members} />
}

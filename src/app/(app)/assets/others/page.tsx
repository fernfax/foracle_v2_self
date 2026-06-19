import { Package } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"

export default function OthersTab() {
  return (
    <EmptyState
      icon={Package}
      title="Other assets — coming soon"
      description="Track jewellery, collectibles, renovation value and more. Coming soon."
    />
  )
}

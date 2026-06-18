"use client"

import { useMemo, useState } from "react"
import { deleteFamilyMember } from "@/actions/family-members"
import { differenceInYears } from "date-fns"
import { Users } from "lucide-react"
import { toast } from "sonner"

import { CHART_PALETTE } from "@/lib/chart-palette"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { RowActions } from "@/components/ui/row-actions"
import { Toolbar } from "@/components/ui/toolbar"
import { AddFamilyMemberDialog } from "@/components/family-members/add-family-member-dialog"
import { EditFamilyMemberDialog } from "@/components/family-members/edit-family-member-dialog"

interface FamilyMember {
  id: string
  name: string
  relationship: string | null
  dateOfBirth: string | null
  isContributing: boolean | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

interface FamilyMemberGridProps {
  initialMembers: FamilyMember[]
}

/** Stable per-member color (no color column exists; derive from the id). */
function colorForId(id: string): string {
  let sum = 0
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
  return CHART_PALETTE[sum % CHART_PALETTE.length]
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function ageOf(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null
  const age = differenceInYears(new Date(), new Date(dateOfBirth))
  return Number.isFinite(age) ? age : null
}

const BRAND_ROLES = new Set(["self", "spouse"])

export function FamilyMemberGrid({ initialMembers }: FamilyMemberGridProps) {
  const [members, setMembers] = useState<FamilyMember[]>(initialMembers)
  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(
    null
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.relationship ?? "").toLowerCase().includes(q)
    )
  }, [members, search])

  const handleAdded = (member: FamilyMember) => {
    setMembers((prev) => [member, ...prev])
    toast.success(`${member.name} added`)
  }

  const handleUpdated = (member: FamilyMember) => {
    setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)))
    toast.success("Member updated")
  }

  const confirmDelete = async () => {
    if (!memberToDelete) return
    const { id, name } = memberToDelete
    try {
      await deleteFamilyMember(id)
      setMembers((prev) => prev.filter((m) => m.id !== id))
      toast.success(`${name} removed`)
    } catch (err) {
      console.error("Failed to delete family member:", err)
      toast.error("Could not remove member. Please try again.")
    } finally {
      setMemberToDelete(null)
    }
  }

  return (
    <div className="space-y-4">
      <Toolbar
        count={{
          value: members.length,
          label: members.length === 1 ? "member" : "members"
        }}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search members…"
        }}
        primaryAction={{ label: "Add member", onClick: () => setAddOpen(true) }}
      />

      {filtered.length === 0 ? (
        members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No family members yet"
            description="Add the people in your household — income, CPF and policies attach to them."
            action={{ label: "Add member", onClick: () => setAddOpen(true) }}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="No matches"
            description={`No members match “${search}”.`}
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => {
            const age = ageOf(member.dateOfBirth)
            const role = member.relationship ?? "Member"
            const isBrand = BRAND_ROLES.has(role.toLowerCase())
            return (
              <Card
                key={member.id}
                interactive
                className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="font-display inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                    style={{ backgroundColor: colorForId(member.id) }}>
                    {initialsOf(member.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display truncate text-base font-semibold tracking-tight">
                      {member.name}
                    </div>
                    <div className="text-muted-foreground truncate text-sm">
                      {role}
                      {age != null ? ` · Age ${age}` : ""}
                    </div>
                  </div>
                  <RowActions
                    onEdit={() => setMemberToEdit(member)}
                    onDelete={
                      role.toLowerCase() === "self"
                        ? undefined
                        : () => setMemberToDelete(member)
                    }
                  />
                </div>

                <div className="border-border/40 mt-auto flex items-center justify-between gap-2 border-t pt-3">
                  <span className="text-muted-foreground truncate text-xs">
                    {member.notes?.trim()
                      ? member.notes
                      : member.isContributing
                        ? "Contributing"
                        : "—"}
                  </span>
                  <Badge variant={isBrand ? "brand" : "neutral"}>{role}</Badge>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <AddFamilyMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onMemberAdded={handleAdded}
      />

      <EditFamilyMemberDialog
        open={memberToEdit !== null}
        onOpenChange={(open) => !open && setMemberToEdit(null)}
        member={memberToEdit}
        onMemberUpdated={handleUpdated}
      />

      <AlertDialog
        open={memberToDelete !== null}
        onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {memberToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Linked income, CPF and policies will be unlinked. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-brand-alert-red hover:bg-brand-alert-red/90 text-white">
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

"use client"

import { useState } from "react"
import { inviteFamilyMember } from "@/actions/family-invitations"
import {
  RELATIONSHIPS,
  type RelationshipValue
} from "@/data/family-relationships.data"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Status = "idle" | "submitting" | "success" | "error"

// Sentinel substring the server-side EXISTING_USER error message always
// contains. Server actions strip the Error subclass when crossing the RSC
// boundary, so we sniff the message string. Keep this in sync with
// lib/services/family.ts where the error is thrown.
const EXISTING_USER_SENTINEL = "already has a Foracle account"

export function InviteFamilyMemberForm({
  className,
  onSuccess
}: {
  className?: string
  onSuccess?: () => void
}) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [relationship, setRelationship] = useState<RelationshipValue | "">("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [existingUserBlock, setExistingUserBlock] = useState<{
    open: boolean
    email: string
    message: string
  }>({ open: false, email: "", message: "" })

  const isValid =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    relationship &&
    relationship !== "Self"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || status === "submitting") return

    setStatus("submitting")
    setErrorMessage("")
    const recipientName = `${firstName.trim()} ${lastName.trim()}`
    const recipientEmail = email.trim()
    try {
      await inviteFamilyMember({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: recipientEmail,
        relationship: relationship as RelationshipValue
      })
      setStatus("success")
      setFirstName("")
      setLastName("")
      setEmail("")
      setRelationship("")
      toast.success(`Invitation sent to ${recipientName}`, {
        description: `${recipientEmail} will appear as Pending in your Family tab until they accept.`,
        duration: 6000
      })
      onSuccess?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong"
      setStatus("error")
      setErrorMessage(message)

      // Existing-user case is a hard blocker — show a modal instead of a
      // toast so the master notices and can fix the email or back out.
      // Form fields are kept intact so a typo can be corrected in place.
      if (message.includes(EXISTING_USER_SENTINEL)) {
        setExistingUserBlock({
          open: true,
          email: recipientEmail,
          message
        })
        return
      }
      toast.error("Could not send invitation", { description: message })
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="invite-first-name">
            <Input
              id="invite-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={status === "submitting"}
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name" htmlFor="invite-last-name">
            <Input
              id="invite-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={status === "submitting"}
              autoComplete="family-name"
            />
          </Field>
        </div>

        <Field label="Email" htmlFor="invite-email">
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "submitting"}
            autoComplete="email"
            placeholder="them@example.com"
          />
        </Field>

        <Field label="Relationship" htmlFor="invite-relationship">
          {/* Native <select> — Radix Select portals to body and gets covered by
              Clerk's UserProfile modal overlay. Native is z-index-immune. */}
          <select
            id="invite-relationship"
            value={relationship}
            onChange={(e) =>
              setRelationship(e.target.value as RelationshipValue)
            }
            disabled={status === "submitting"}
            className={cn(
              "border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              relationship === "" && "text-muted-foreground"
            )}>
            <option value="" disabled>
              Select relationship
            </option>
            {RELATIONSHIPS.filter((r) => r.value !== "Self").map((r) => (
              <option key={r.value} value={r.value} className="text-foreground">
                {r.label}
              </option>
            ))}
          </select>
        </Field>

        {status === "error" && !existingUserBlock.open && (
          <p className="text-destructive text-sm">{errorMessage}</p>
        )}
        {status === "success" && (
          <p className="text-muted-foreground text-sm">
            Invitation sent. They will appear as Pending in your Family tab
            until they accept.
          </p>
        )}

        <Button
          type="submit"
          disabled={!isValid || status === "submitting"}
          className="w-full">
          {status === "submitting" ? "Sending invite…" : "Send invitation"}
        </Button>
      </form>

      <AlertDialog
        open={existingUserBlock.open}
        onOpenChange={(open) =>
          setExistingUserBlock((prev) => ({ ...prev, open }))
        }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account already exists</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  <span className="text-foreground font-medium">
                    {existingUserBlock.email}
                  </span>{" "}
                  already has a Foracle account in another family. They
                  can&apos;t be added to yours.
                </p>
                <p className="text-muted-foreground text-xs">
                  If this is the wrong email, edit it and try again. Otherwise
                  the invitee needs to delete their existing account before they
                  can join your family.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() =>
                setExistingUserBlock((prev) => ({ ...prev, open: false }))
              }>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

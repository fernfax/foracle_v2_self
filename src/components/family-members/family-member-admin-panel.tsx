"use client"

import { useState, useTransition } from "react"
import {
  convertFamilyMember,
  resendInvitation,
  revokeInvitation,
  type FamilyAdminData,
  type FamilyMemberSummary,
  type PendingInvitation
} from "@/actions/family-invitations"
import {
  Check,
  Clock,
  Copy,
  Crown,
  Mail,
  RotateCw,
  UserPlus,
  X
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
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
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InviteFamilyMemberForm } from "@/components/family-members/family-member-invite-form"

interface FamilyAdminPanelProps {
  initialData: FamilyAdminData
  className?: string
  // When true, lays out as a compact list (Clerk modal). When false, full
  // panel with cards/headings for the /user page.
  compact?: boolean
  // Triggered after a successful invite — lets the host refresh the local
  // pending list without a full page navigation.
  onPendingChanged?: () => void
}

function formatRelativeDate(iso: string): string {
  const sent = new Date(iso)
  const diffMs = Date.now() - sent.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "1 day ago"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return sent.toLocaleDateString()
}

export function FamilyAdminPanel({
  initialData,
  className,
  compact = false,
  onPendingChanged
}: FamilyAdminPanelProps) {
  const [data, setData] = useState<FamilyAdminData>(initialData)
  const [pendingAction, startTransition] = useTransition()
  const [actingOnId, setActingOnId] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<PendingInvitation | null>(
    null
  )
  const [familyIdCopied, setFamilyIdCopied] = useState(false)
  const [convertTarget, setConvertTarget] =
    useState<FamilyMemberSummary | null>(null)
  const [convertEmail, setConvertEmail] = useState("")
  const [convertSubmitting, setConvertSubmitting] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)

  const handleCopyFamilyId = async () => {
    try {
      await navigator.clipboard.writeText(data.familyId)
      setFamilyIdCopied(true)
      setTimeout(() => setFamilyIdCopied(false), 1500)
    } catch {
      // Clipboard API not available — silent ignore
    }
  }

  const handleResend = (invite: PendingInvitation) => {
    setActingOnId(invite.id)
    startTransition(async () => {
      try {
        await resendInvitation(invite.id)
        toast.success(`Resent invitation to ${invite.email}`, {
          description: "They will receive a fresh sign-in email shortly.",
          duration: 5000
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not resend invitation"
        toast.error("Resend failed", { description: message })
      } finally {
        setActingOnId(null)
      }
    })
  }

  const handleRevokeConfirm = () => {
    if (!revokeTarget) return
    const target = revokeTarget
    setActingOnId(target.id)
    setRevokeTarget(null)
    startTransition(async () => {
      try {
        await revokeInvitation(target.id)
        setData((prev) => ({
          ...prev,
          pendingInvitations: prev.pendingInvitations.filter(
            (p) => p.id !== target.id
          )
        }))
        toast.success(`Revoked invitation for ${target.email}`)
        onPendingChanged?.()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not revoke invitation"
        toast.error("Revoke failed", { description: message })
      } finally {
        setActingOnId(null)
      }
    })
  }

  // Optimistic refresh after a successful invite from the embedded form.
  const handleInviteSuccess = () => {
    onPendingChanged?.()
  }

  const handleOpenConvert = (member: FamilyMemberSummary) => {
    setConvertTarget(member)
    setConvertEmail("")
    setConvertError(null)
  }

  const handleCloseConvert = () => {
    if (convertSubmitting) return
    setConvertTarget(null)
    setConvertEmail("")
    setConvertError(null)
  }

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!convertTarget || convertSubmitting) return
    const trimmedEmail = convertEmail.trim()
    if (!trimmedEmail) {
      setConvertError("Email is required")
      return
    }
    setConvertSubmitting(true)
    setConvertError(null)
    const target = convertTarget
    try {
      await convertFamilyMember(target.id, { email: trimmedEmail })
      // The row flips from member → pending. Reflect that in local state so
      // the panel updates immediately, without a page nav.
      setData((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.id !== target.id),
        pendingInvitations: [
          {
            id: target.id,
            name: target.name,
            email: trimmedEmail,
            relationship: target.relationship,
            sentAt: new Date().toISOString()
          },
          ...prev.pendingInvitations
        ]
      }))
      toast.success(`Invitation sent to ${target.name}`, {
        description: `${trimmedEmail} will appear as Pending until they accept.`,
        duration: 6000
      })
      setConvertTarget(null)
      setConvertEmail("")
      onPendingChanged?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not convert member"
      setConvertError(message)
      toast.error("Conversion failed", { description: message })
    } finally {
      setConvertSubmitting(false)
    }
  }

  const {
    familyId,
    isMaster,
    masterName,
    masterEmail,
    members,
    pendingInvitations
  } = data

  return (
    <div className={cn("space-y-5", className)}>
      {/* Family identity block */}
      <div
        className={
          compact
            ? "space-y-2"
            : "border-border/60 bg-card space-y-3 rounded-lg border p-4"
        }>
        {!compact && <h3 className="text-base font-semibold">This family</h3>}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Family ID</span>
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
            {familyId}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleCopyFamilyId}
            aria-label="Copy family ID">
            {familyIdCopied ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>

        {members.length > 0 && (
          <ul className="space-y-2">
            {members.map((member) => {
              const isConverting = convertTarget?.id === member.id
              return (
                <li
                  key={member.id}
                  className="border-border/40 bg-background rounded-md border px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {member.name}
                        </span>
                        {member.isMaster && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-300 bg-amber-50 text-[10px] text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                            <Crown className="h-3 w-3" />
                            Master
                          </Badge>
                        )}
                        {member.isYou && (
                          <Badge variant="outline" className="text-[10px]">
                            You
                          </Badge>
                        )}
                        {member.relationship && !member.isMaster && (
                          <Badge variant="outline" className="text-[10px]">
                            {member.relationship}
                          </Badge>
                        )}
                      </div>
                      {member.email && (
                        <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      )}
                    </div>
                    {isMaster &&
                      member.canConvert &&
                      !member.isYou &&
                      !isConverting && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0 gap-1 text-xs"
                          onClick={() => handleOpenConvert(member)}>
                          <UserPlus className="h-3.5 w-3.5" />
                          Convert
                        </Button>
                      )}
                  </div>
                  {isConverting && (
                    <form
                      onSubmit={handleConvertSubmit}
                      className="border-border/40 mt-3 space-y-2 border-t pt-3">
                      <p className="text-muted-foreground text-xs">
                        Send{" "}
                        <span className="text-foreground font-medium">
                          {member.name}
                        </span>{" "}
                        a sign-in invite. They&apos;ll get their own login and
                        unique user ID, but skip onboarding — they inherit this
                        family&apos;s data.
                      </p>
                      <Field
                        label="Email"
                        htmlFor={`convert-email-${member.id}`}
                        error={convertError}>
                        <Input
                          id={`convert-email-${member.id}`}
                          type="email"
                          value={convertEmail}
                          onChange={(e) => setConvertEmail(e.target.value)}
                          placeholder="them@example.com"
                          autoComplete="email"
                          disabled={convertSubmitting}
                          autoFocus
                          className="h-9"
                        />
                      </Field>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCloseConvert}
                          disabled={convertSubmitting}>
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!convertEmail.trim() || convertSubmitting}>
                          {convertSubmitting ? "Sending…" : "Send invitation"}
                        </Button>
                      </div>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Invite form (master only) */}
      {isMaster ? (
        <div
          className={
            compact
              ? undefined
              : "border-border/60 bg-card rounded-lg border p-4"
          }>
          {!compact && (
            <div className="mb-3">
              <h3 className="text-base font-semibold">
                Invite a family member
              </h3>
              <p className="text-muted-foreground text-sm">
                Send a sign-in invitation so they can share this account.
              </p>
            </div>
          )}
          <InviteFamilyMemberForm onSuccess={handleInviteSuccess} />
        </div>
      ) : (
        <div className="border-border/60 bg-muted/40 rounded-lg border px-4 py-3">
          <p className="text-sm font-medium">
            Only the family master can invite members.
          </p>
          {(masterName || masterEmail) && (
            <p className="text-muted-foreground mt-1 text-xs">
              Ask {masterName ?? masterEmail} to send the invitation.
            </p>
          )}
        </div>
      )}

      {/* Pending invitations list */}
      {pendingInvitations.length > 0 && (
        <div
          className={
            compact
              ? "space-y-2"
              : "border-border/60 bg-card space-y-3 rounded-lg border p-4"
          }>
          {!compact && (
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Pending invitations</h3>
              <Badge variant="outline" className="text-xs">
                {pendingInvitations.length} pending
              </Badge>
            </div>
          )}
          <ul className="space-y-2">
            {pendingInvitations.map((invite) => {
              const isActing = actingOnId === invite.id && pendingAction
              return (
                <li
                  key={invite.id}
                  className="border-border/40 bg-background flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {invite.name}
                      </span>
                      {invite.relationship && (
                        <Badge variant="outline" className="text-xs">
                          {invite.relationship}
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{invite.email}</span>
                      <span aria-hidden>·</span>
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>sent {formatRelativeDate(invite.sentAt)}</span>
                    </div>
                  </div>
                  {isMaster && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        disabled={isActing}
                        onClick={() => handleResend(invite)}>
                        <RotateCw
                          className={cn(
                            "h-3.5 w-3.5",
                            isActing && "animate-spin"
                          )}
                        />
                        Resend
                      </Button>
                      <Button
                        variant="destructiveGhost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        disabled={isActing}
                        onClick={() => setRevokeTarget(invite)}>
                        <X className="h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget && (
                <>
                  The pending invitation for{" "}
                  <span className="font-medium">{revokeTarget.email}</span> will
                  be cancelled. They will no longer be able to use the existing
                  email link to join your family. You can invite them again
                  later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeConfirm}>
              Revoke invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

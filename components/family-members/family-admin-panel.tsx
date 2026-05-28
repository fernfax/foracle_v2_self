"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Mail, Clock, RotateCw, X, Crown, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InviteFamilyMemberForm } from "./invite-family-member-form";
import {
  resendInvitation,
  revokeInvitation,
  type FamilyAdminData,
  type PendingInvitation,
} from "@/lib/actions/family-invitations";
import { cn } from "@/lib/utils";

interface FamilyAdminPanelProps {
  initialData: FamilyAdminData;
  className?: string;
  // When true, lays out as a compact list (Clerk modal). When false, full
  // panel with cards/headings for the /user page.
  compact?: boolean;
  // Triggered after a successful invite — lets the host refresh the local
  // pending list without a full page navigation.
  onPendingChanged?: () => void;
}

function formatRelativeDate(iso: string): string {
  const sent = new Date(iso);
  const diffMs = Date.now() - sent.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return sent.toLocaleDateString();
}

export function FamilyAdminPanel({
  initialData,
  className,
  compact = false,
  onPendingChanged,
}: FamilyAdminPanelProps) {
  const [data, setData] = useState<FamilyAdminData>(initialData);
  const [pendingAction, startTransition] = useTransition();
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PendingInvitation | null>(null);
  const [familyIdCopied, setFamilyIdCopied] = useState(false);

  const handleCopyFamilyId = async () => {
    try {
      await navigator.clipboard.writeText(data.familyId);
      setFamilyIdCopied(true);
      setTimeout(() => setFamilyIdCopied(false), 1500);
    } catch {
      // Clipboard API not available — silent ignore
    }
  };

  const handleResend = (invite: PendingInvitation) => {
    setActingOnId(invite.id);
    startTransition(async () => {
      try {
        await resendInvitation(invite.id);
        toast.success(`Resent invitation to ${invite.email}`, {
          description: "They will receive a fresh sign-in email shortly.",
          duration: 5000,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not resend invitation";
        toast.error("Resend failed", { description: message });
      } finally {
        setActingOnId(null);
      }
    });
  };

  const handleRevokeConfirm = () => {
    if (!revokeTarget) return;
    const target = revokeTarget;
    setActingOnId(target.id);
    setRevokeTarget(null);
    startTransition(async () => {
      try {
        await revokeInvitation(target.id);
        setData((prev) => ({
          ...prev,
          pendingInvitations: prev.pendingInvitations.filter((p) => p.id !== target.id),
        }));
        toast.success(`Revoked invitation for ${target.email}`);
        onPendingChanged?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not revoke invitation";
        toast.error("Revoke failed", { description: message });
      } finally {
        setActingOnId(null);
      }
    });
  };

  // Optimistic refresh after a successful invite from the embedded form.
  const handleInviteSuccess = () => {
    onPendingChanged?.();
  };

  const { familyId, isMaster, masterName, masterEmail, members, pendingInvitations } = data;

  return (
    <div className={cn("space-y-5", className)}>
      {/* Family identity block */}
      <div className={compact ? "space-y-2" : "rounded-lg border border-border/60 bg-card p-4 space-y-3"}>
        {!compact && (
          <h3 className="text-base font-semibold">This family</h3>
        )}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Family ID</span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{familyId}</code>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleCopyFamilyId}
            aria-label="Copy family ID"
          >
            {familyIdCopied ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>

        {members.length > 0 && (
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{member.name}</span>
                    {member.isMaster && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-300 bg-amber-50 text-amber-900 text-[10px] dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
                      >
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
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invite form (master only) */}
      {isMaster ? (
        <div className={compact ? undefined : "rounded-lg border border-border/60 bg-card p-4"}>
          {!compact && (
            <div className="mb-3">
              <h3 className="text-base font-semibold">Invite a family member</h3>
              <p className="text-sm text-muted-foreground">
                Send a sign-in invitation so they can share this account.
              </p>
            </div>
          )}
          <InviteFamilyMemberForm onSuccess={handleInviteSuccess} />
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
          <p className="text-sm font-medium">Only the family master can invite members.</p>
          {(masterName || masterEmail) && (
            <p className="mt-1 text-xs text-muted-foreground">
              Ask {masterName ?? masterEmail} to send the invitation.
            </p>
          )}
        </div>
      )}

      {/* Pending invitations list */}
      {pendingInvitations.length > 0 && (
        <div className={compact ? "space-y-2" : "rounded-lg border border-border/60 bg-card p-4 space-y-3"}>
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
              const isActing = actingOnId === invite.id && pendingAction;
              return (
                <li
                  key={invite.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{invite.name}</span>
                      {invite.relationship && (
                        <Badge variant="outline" className="text-xs">
                          {invite.relationship}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
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
                        onClick={() => handleResend(invite)}
                      >
                        <RotateCw className={cn("h-3.5 w-3.5", isActing && "animate-spin")} />
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
                        disabled={isActing}
                        onClick={() => setRevokeTarget(invite)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AlertDialog open={revokeTarget !== null} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget && (
                <>
                  The pending invitation for{" "}
                  <span className="font-medium">{revokeTarget.email}</span> will be cancelled.
                  They will no longer be able to use the existing email link to join your family.
                  You can invite them again later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeConfirm}>Revoke invitation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RELATIONSHIPS, type RelationshipValue } from "@/lib/family-relationships";
import { inviteFamilyMember } from "@/lib/actions/family-invitations";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";

// Sentinel substring the server-side EXISTING_USER error message always
// contains. Server actions strip the Error subclass when crossing the RSC
// boundary, so we sniff the message string. Keep this in sync with
// lib/services/family.ts where the error is thrown.
const EXISTING_USER_SENTINEL = "already has a Foracle account";

export function InviteFamilyMemberForm({
  className,
  onSuccess,
}: {
  className?: string;
  onSuccess?: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState<RelationshipValue | "">("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [existingUserBlock, setExistingUserBlock] = useState<{
    open: boolean;
    email: string;
    message: string;
  }>({ open: false, email: "", message: "" });

  const isValid =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    relationship &&
    relationship !== "Self";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || status === "submitting") return;

    setStatus("submitting");
    setErrorMessage("");
    const recipientName = `${firstName.trim()} ${lastName.trim()}`;
    const recipientEmail = email.trim();
    try {
      await inviteFamilyMember({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: recipientEmail,
        relationship: relationship as RelationshipValue,
      });
      setStatus("success");
      setFirstName("");
      setLastName("");
      setEmail("");
      setRelationship("");
      toast.success(`Invitation sent to ${recipientName}`, {
        description: `${recipientEmail} will appear as Pending in your Family tab until they accept.`,
        duration: 6000,
      });
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setStatus("error");
      setErrorMessage(message);

      // Existing-user case is a hard blocker — show a modal instead of a
      // toast so the master notices and can fix the email or back out.
      // Form fields are kept intact so a typo can be corrected in place.
      if (message.includes(EXISTING_USER_SENTINEL)) {
        setExistingUserBlock({
          open: true,
          email: recipientEmail,
          message,
        });
        return;
      }
      toast.error("Could not send invitation", { description: message });
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-first-name">First name</Label>
            <Input
              id="invite-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={status === "submitting"}
              autoComplete="given-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-last-name">Last name</Label>
            <Input
              id="invite-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={status === "submitting"}
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "submitting"}
            autoComplete="email"
            placeholder="them@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invite-relationship">Relationship</Label>
          {/* Native <select> — Radix Select portals to body and gets covered by
              Clerk's UserProfile modal overlay. Native is z-index-immune. */}
          <select
            id="invite-relationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as RelationshipValue)}
            disabled={status === "submitting"}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              relationship === "" && "text-muted-foreground"
            )}
          >
            <option value="" disabled>
              Select relationship
            </option>
            {RELATIONSHIPS.filter((r) => r.value !== "Self").map((r) => (
              <option key={r.value} value={r.value} className="text-foreground">
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {status === "error" && !existingUserBlock.open && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
        {status === "success" && (
          <p className="text-sm text-muted-foreground">
            Invitation sent. They will appear as Pending in your Family tab until they accept.
          </p>
        )}

        <Button type="submit" disabled={!isValid || status === "submitting"} className="w-full">
          {status === "submitting" ? "Sending invite…" : "Send invitation"}
        </Button>
      </form>

      <AlertDialog
        open={existingUserBlock.open}
        onOpenChange={(open) =>
          setExistingUserBlock((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account already exists</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  <span className="font-medium text-foreground">
                    {existingUserBlock.email}
                  </span>{" "}
                  already has a Foracle account in another family. They can&apos;t be
                  added to yours.
                </p>
                <p className="text-xs text-muted-foreground">
                  If this is the wrong email, edit it and try again. Otherwise the
                  invitee needs to delete their existing account before they can
                  join your family.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() =>
                setExistingUserBlock((prev) => ({ ...prev, open: false }))
              }
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

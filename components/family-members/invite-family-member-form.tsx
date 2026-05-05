"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RELATIONSHIPS, type RelationshipValue } from "@/lib/family-relationships";
import { inviteFamilyMember } from "@/lib/actions/family-invitations";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";

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
    try {
      await inviteFamilyMember({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        relationship: relationship as RelationshipValue,
      });
      setStatus("success");
      setFirstName("");
      setLastName("");
      setEmail("");
      setRelationship("");
      onSuccess?.();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
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
        <Select
          value={relationship}
          onValueChange={(v) => setRelationship(v as RelationshipValue)}
          disabled={status === "submitting"}
        >
          <SelectTrigger id="invite-relationship">
            <SelectValue placeholder="Select relationship" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIPS.filter((r) => r.value !== "Self").map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {status === "error" && (
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
  );
}

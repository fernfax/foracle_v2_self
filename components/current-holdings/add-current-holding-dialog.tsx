"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { addCurrentHolding, updateCurrentHolding, CurrentHolding } from "@/lib/actions/current-holdings";
import { getFamilyMembers } from "@/lib/actions/family-members";

type FamilyMember = {
  id: string;
  name: string;
};

interface AddCurrentHoldingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHoldingAdded: (holding: CurrentHolding) => void;
  holding?: CurrentHolding | null;
}

export function AddCurrentHoldingDialog({
  open,
  onOpenChange,
  onHoldingAdded,
  holding,
}: AddCurrentHoldingDialogProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyMemberId, setFamilyMemberId] = useState<string>("");
  const [bankName, setBankName] = useState("");
  const [holdingAmount, setHoldingAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch family members
  useEffect(() => {
    getFamilyMembers().then((members) => {
      setFamilyMembers(members);
    });
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (holding) {
      setFamilyMemberId(holding.familyMemberId || "none");
      setBankName(holding.bankName);
      setHoldingAmount(holding.holdingAmount);
    } else {
      // Reset form for add mode
      setFamilyMemberId("none");
      setBankName("");
      setHoldingAmount("");
    }
  }, [holding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let resultHolding: CurrentHolding;
      const finalFamilyMemberId = familyMemberId === "none" ? null : familyMemberId || null;

      if (holding && holding.id) {
        // Edit mode - update existing holding
        resultHolding = await updateCurrentHolding(holding.id, {
          familyMemberId: finalFamilyMemberId,
          bankName,
          holdingAmount: parseFloat(holdingAmount),
        });
      } else {
        // Create mode - add new holding
        resultHolding = await addCurrentHolding({
          familyMemberId: finalFamilyMemberId,
          bankName,
          holdingAmount: parseFloat(holdingAmount),
        });
      }

      onHoldingAdded(resultHolding);

      // Reset form
      setFamilyMemberId("none");
      setBankName("");
      setHoldingAmount("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save current holding:", error);
      alert("Failed to save current holding. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{holding ? "Edit Current Holding" : "Add Current Holding"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Account Holder */}
          <div className="space-y-2">
            <Label htmlFor="familyMember">Account Holder</Label>
            <Select value={familyMemberId} onValueChange={setFamilyMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account holder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {familyMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bank Name */}
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g., DBS, OCBC, UOB"
              required
            />
          </div>

          {/* Holding Amount */}
          <div className="space-y-2">
            <Label htmlFor="holdingAmount">Holding Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="holdingAmount"
                type="number"
                step="0.01"
                min="0"
                value={holdingAmount}
                onChange={(e) => setHoldingAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : holding ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

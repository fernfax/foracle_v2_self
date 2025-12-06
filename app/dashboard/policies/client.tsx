"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, Plus, User, Users, Baby, Heart, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddPolicyDialog } from "@/components/policies/add-policy-dialog";
import { EditPolicyDialog } from "@/components/policies/edit-policy-dialog";
import { PolicyCard } from "@/components/policies/policy-card";
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
import { deletePolicy } from "@/lib/actions/policies";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Policy {
  id: string;
  userId: string;
  familyMemberId: string | null;
  linkedExpenseId: string | null;
  provider: string;
  policyNumber: string | null;
  policyType: string;
  status: string | null;
  startDate: string;
  maturityDate: string | null;
  coverageUntilAge: number | null;
  premiumAmount: string;
  premiumFrequency: string;
  customMonths: string | null;
  totalPremiumDuration: number | null;
  coverageOptions: string | null;
  isActive: boolean | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: string | null;
}

interface PoliciesClientProps {
  initialPolicies: Policy[];
  familyMembers: FamilyMember[];
  userId: string;
}

export function PoliciesClient({ initialPolicies, familyMembers, userId }: PoliciesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | undefined>(undefined);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<Policy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedPolicyType, setSelectedPolicyType] = useState<string>("All");

  // Update policies when initialPolicies changes (after router.refresh())
  useEffect(() => {
    setPolicies(initialPolicies);
  }, [initialPolicies]);

  // Handle URL-based edit parameter (e.g., ?edit=policyId)
  // Use initialPolicies directly to avoid timing issues with state sync
  useEffect(() => {
    const editPolicyId = searchParams.get("edit");
    if (editPolicyId && initialPolicies.length > 0) {
      const policyToEdit = initialPolicies.find(p => p.id === editPolicyId);
      if (policyToEdit) {
        // Use setTimeout to ensure the dialog opens after the component has fully mounted
        // This prevents race conditions with state updates
        const timeoutId = setTimeout(() => {
          setEditingPolicy(policyToEdit);
          setEditDialogOpen(true);
          // Clear the URL param after opening the dialog
          router.replace("/dashboard/policies", { scroll: false });
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [searchParams, initialPolicies, router]);

  // Get unique policy types with counts
  const policyTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    policies.forEach((policy) => {
      counts[policy.policyType] = (counts[policy.policyType] || 0) + 1;
    });
    return counts;
  }, [policies]);

  // Get avatar icon and color based on relationship
  const getAvatarConfig = (relationship: string | null) => {
    const rel = relationship?.toLowerCase() || '';

    switch (rel) {
      case 'self':
        return {
          icon: User,
          bgColor: 'bg-blue-100',
          iconColor: 'text-blue-600'
        };
      case 'spouse':
        return {
          icon: Heart,
          bgColor: 'bg-pink-100',
          iconColor: 'text-pink-600'
        };
      case 'child':
        return {
          icon: Baby,
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600'
        };
      case 'parent':
        return {
          icon: Users,
          bgColor: 'bg-purple-100',
          iconColor: 'text-purple-600'
        };
      case 'sibling':
        return {
          icon: Users,
          bgColor: 'bg-orange-100',
          iconColor: 'text-orange-600'
        };
      default:
        return {
          icon: UserCircle,
          bgColor: 'bg-gray-100',
          iconColor: 'text-gray-600'
        };
    }
  };

  // Filter policies by type
  const filteredPolicies = useMemo(() => {
    if (selectedPolicyType === "All") {
      return policies;
    }
    return policies.filter(p => p.policyType === selectedPolicyType);
  }, [policies, selectedPolicyType]);

  // Sort family members with "Self" at the top
  const sortedFamilyMembers = [...familyMembers].sort((a, b) => {
    if (a.relationship?.toLowerCase() === 'self') return -1;
    if (b.relationship?.toLowerCase() === 'self') return 1;
    return a.name.localeCompare(b.name);
  });

  // Group policies by family member
  const policiesByMember = sortedFamilyMembers.map(member => ({
    member,
    policies: filteredPolicies.filter(p => p.familyMemberId === member.id)
  }));

  // Sort to put members with no policies at the bottom
  const sortedPoliciesByMember = policiesByMember.sort((a, b) => {
    // Keep "Self" at the top regardless of policy count
    if (a.member.relationship?.toLowerCase() === 'self') return -1;
    if (b.member.relationship?.toLowerCase() === 'self') return 1;

    // Sort by policy count (members with policies first)
    if (a.policies.length > 0 && b.policies.length === 0) return -1;
    if (a.policies.length === 0 && b.policies.length > 0) return 1;

    // If both have policies or both don't, sort by name
    return a.member.name.localeCompare(b.member.name);
  });

  const handleAddPolicy = (familyMemberId?: string) => {
    setSelectedFamilyMemberId(familyMemberId);
    setAddDialogOpen(true);
  };

  const handleEditPolicy = (policy: Policy) => {
    setEditingPolicy(policy);
    setEditDialogOpen(true);
  };

  const handleDeletePolicy = (policy: Policy) => {
    setDeletingPolicy(policy);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingPolicy) return;

    setIsDeleting(true);
    try {
      await deletePolicy(deletingPolicy.id);
      // Remove from local state immediately
      setPolicies(policies.filter(p => p.id !== deletingPolicy.id));
      setDeleteDialogOpen(false);
      setDeletingPolicy(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete policy:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePolicyAdded = () => {
    // Refresh to get the new policy from the server
    router.refresh();
  };

  const handlePolicyUpdated = () => {
    // Refresh to get the updated policy from the server
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insurance Policies</h1>
          <p className="text-muted-foreground mt-1">
            Manage your insurance policies and coverage
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Policy
        </Button>
      </div>

      {/* Policy Type Filters */}
      {policies.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedPolicyType === "All" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPolicyType("All")}
            className={cn(
              "flex-shrink-0",
              selectedPolicyType === "All" && "bg-black text-white hover:bg-black/90"
            )}
          >
            All
            <Badge variant="secondary" className="ml-2">
              {policies.length}
            </Badge>
          </Button>
          {Object.entries(policyTypeCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([policyType, count]) => (
              <Button
                key={policyType}
                variant={selectedPolicyType === policyType ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPolicyType(policyType)}
                className={cn(
                  "flex-shrink-0",
                  selectedPolicyType === policyType && "bg-black text-white hover:bg-black/90"
                )}
              >
                {policyType}
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </Button>
            ))}
        </div>
      )}

      {/* Main Content */}
      {policies.length === 0 && familyMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No policies yet</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Start managing your insurance policies by adding your first policy.
          </p>
          <Button onClick={() => handleAddPolicy()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Policy
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedPoliciesByMember.map(({ member, policies: memberPolicies }) => {
            const avatarConfig = getAvatarConfig(member.relationship);
            const AvatarIcon = avatarConfig.icon;

            return (
              <div key={member.id}>
                {/* Family Member Header */}
                <div className="flex items-center gap-3 mb-4">
                  {/* Avatar */}
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full ${avatarConfig.bgColor}`}>
                    <AvatarIcon className={`w-6 h-6 ${avatarConfig.iconColor}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {member.name}
                      {member.relationship?.toLowerCase() === 'self' && (
                        <span className="ml-2 text-sm font-normal text-gray-500">(You)</span>
                      )}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {memberPolicies.length} {memberPolicies.length === 1 ? 'policy' : 'policies'}
                    </p>
                  </div>
                </div>

              {/* Policies Grid */}
              {memberPolicies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {memberPolicies.map((policy) => (
                    <PolicyCard
                      key={policy.id}
                      policy={policy}
                      familyMemberName={member.name}
                      onEdit={() => handleEditPolicy(policy)}
                      onDelete={() => handleDeletePolicy(policy)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg bg-gray-50">
                  <Shield className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-3">No policies for {member.name}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddPolicy(member.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Policy
                  </Button>
                </div>
              )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Policy Dialog */}
      <AddPolicyDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        userId={userId}
        preselectedFamilyMemberId={selectedFamilyMemberId}
        onPolicyAdded={handlePolicyAdded}
      />

      {/* Edit Policy Dialog */}
      <EditPolicyDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        policy={editingPolicy}
        userId={userId}
        onPolicyUpdated={handlePolicyUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this policy? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { UserButton } from "@clerk/nextjs";
import { Code2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { InviteFamilyMemberForm } from "@/components/family-members/invite-family-member-form";

type ClerkUserButtonProps = React.ComponentProps<typeof UserButton>;

const IS_DEV = process.env.NODE_ENV === "development";

export function ClerkUserButton(props: ClerkUserButtonProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  return (
    <UserButton afterSignOutUrl="/" {...props}>
      <UserButton.UserProfilePage
        label="Family"
        url="family"
        labelIcon={<Users className="h-4 w-4" />}
      >
        <div className="px-1 py-2">
          <h2 className="text-lg font-semibold mb-1">Invite a family member</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Send an invitation email so they can sign in and share this Foracle account.
          </p>
          <InviteFamilyMemberForm />
        </div>
      </UserButton.UserProfilePage>
      {IS_DEV && (
        <UserButton.MenuItems>
          <UserButton.Action
            label="Developer Mode"
            labelIcon={<Code2 className="h-4 w-4" />}
            onClick={() => router.push("/developer")}
          />
        </UserButton.MenuItems>
      )}
    </UserButton>
  );
}

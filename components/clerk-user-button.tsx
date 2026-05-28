"use client";

import { UserButton } from "@clerk/nextjs";
import { Code2, Palette, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FamilyAdminPanel } from "@/components/family-members/family-admin-panel";
import {
  getFamilyAdminData,
  type FamilyAdminData,
} from "@/lib/actions/family-invitations";
import { BackgroundDecorPicker } from "@/components/user/background-decor-picker";

type ClerkUserButtonProps = React.ComponentProps<typeof UserButton>;

const IS_DEV = process.env.NODE_ENV === "development";

function FamilyProfilePage() {
  const [data, setData] = useState<FamilyAdminData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const fresh = await getFamilyAdminData();
      setData(fresh);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load family data");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="px-1 py-2">
      <h2 className="text-lg font-semibold mb-1">Family</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {data?.isMaster
          ? "Invite family members to share this Foracle account."
          : "Pending invitations and family admin."}
      </p>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {!error && !data && (
        <div className="space-y-3" aria-busy="true">
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        </div>
      )}
      {data && (
        <FamilyAdminPanel
          initialData={data}
          compact
          onPendingChanged={refresh}
        />
      )}
    </div>
  );
}

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
        <FamilyProfilePage />
      </UserButton.UserProfilePage>
      <UserButton.UserProfilePage
        label="Display"
        url="display"
        labelIcon={<Palette className="h-4 w-4" />}
      >
        <div className="px-1 py-2">
          <h2 className="text-lg font-semibold mb-1">Display</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Choose the decorative wallpaper behind the app.
          </p>
          <BackgroundDecorPicker />
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

import { redirect } from "next/navigation";

import { getIsSuperAdmin } from "@/lib/admin/superadmin";
import { adminListFamilies } from "@/lib/actions/admin-feature-flags";
import { AdminFeatureFlagsPanel } from "@/components/admin/admin-feature-flags-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await getIsSuperAdmin())) redirect("/overview");

  const families = await adminListFamilies();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Admin — Feature Flags
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toggle beta features for any household. These settings control flags
          for ALL households on the platform — changes take effect immediately
          for the selected family.
        </p>
      </header>

      <AdminFeatureFlagsPanel families={families} />
    </div>
  );
}

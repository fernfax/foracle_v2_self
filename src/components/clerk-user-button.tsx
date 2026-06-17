"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getFamilyAdminData,
  type FamilyAdminData
} from "@/actions/family-invitations"
import { IS_DEV } from "@/configs/env.config"
import { UserButton } from "@clerk/nextjs"
import { Code2, Moon, Palette, Sun, Users } from "lucide-react"
import { useTheme } from "next-themes"

import { applyThemeWithTransition } from "@/lib/theme-transition"
import { FamilyAdminPanel } from "@/components/family-members/family-admin-panel"
import { BackgroundDecorPicker } from "@/components/user/background-decor-picker"
import { ThemePicker } from "@/components/user/theme-picker"

type ClerkUserButtonProps = React.ComponentProps<typeof UserButton>

function FamilyProfilePage() {
  const [data, setData] = useState<FamilyAdminData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const fresh = await getFamilyAdminData()
      setData(fresh)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load family data"
      )
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="px-1 py-2">
      <h2 className="mb-1 text-lg font-semibold">Family</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        {data?.isMaster
          ? "Invite family members to share this Foracle account."
          : "Pending invitations and family admin."}
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {!error && !data && (
        <div className="space-y-3" aria-busy="true">
          <div className="bg-muted h-24 animate-pulse rounded-lg" />
          <div className="bg-muted h-16 animate-pulse rounded-lg" />
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
  )
}

export function ClerkUserButton(props: ClerkUserButtonProps) {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
  }

  const toggleTheme = () =>
    applyThemeWithTransition(() => setTheme(isDark ? "light" : "dark"))

  return (
    <UserButton afterSignOutUrl="/" {...props}>
      <UserButton.UserProfilePage
        label="Family"
        url="family"
        labelIcon={<Users className="h-4 w-4" />}>
        <FamilyProfilePage />
      </UserButton.UserProfilePage>
      <UserButton.UserProfilePage
        label="Display"
        url="display"
        labelIcon={<Palette className="h-4 w-4" />}>
        <div className="px-1 py-2">
          <h2 className="mb-1 text-lg font-semibold">Display</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Set your color theme and the decorative wallpaper behind the app.
          </p>
          <div className="space-y-4">
            <ThemePicker />
            <BackgroundDecorPicker />
          </div>
        </div>
      </UserButton.UserProfilePage>
      <UserButton.MenuItems>
        {/* Quick theme toggle — surfaced straight in the menu instead of buried
            under Manage account → Display. The full Light/Dark/System picker
            still lives in the Display page. */}
        <UserButton.Action
          label={isDark ? "Light mode" : "Dark mode"}
          labelIcon={
            isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
          }
          onClick={toggleTheme}
        />
        {IS_DEV && (
          <UserButton.Action
            label="Developer Mode"
            labelIcon={<Code2 className="h-4 w-4" />}
            onClick={() => router.push("/developer")}
          />
        )}
      </UserButton.MenuItems>
    </UserButton>
  )
}

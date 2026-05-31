"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import {
  resolveFlags,
  type ResolvedFlags,
} from "@/lib/feature-flags/resolve";
import { getFlagOverrides, setFlagOverride } from "@/lib/actions/feature-flags";
import type { FlagKey } from "@/lib/feature-flags/registry";

interface FeatureFlagContextType {
  flags: ResolvedFlags;
  toggleFlag: (key: FlagKey, enabled: boolean) => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

interface FeatureFlagProviderProps {
  // Server-resolved flags, computed once in the app layout.
  initial: ResolvedFlags;
  children: ReactNode;
}

export function FeatureFlagProvider({
  initial,
  children,
}: FeatureFlagProviderProps) {
  const [flags, setFlags] = useState<ResolvedFlags>(initial);

  const toggleFlag = useCallback(
    async (key: FlagKey, enabled: boolean) => {
      // Optimistic: set the flag's own value and re-run the (pure) cascade so
      // dependents update immediately. We use the current resolved state as the
      // override base — good enough for instant feedback before the server
      // round-trip re-syncs the authoritative state.
      setFlags((prev) => resolveFlags({ ...prev, [key]: enabled }));
      try {
        await setFlagOverride(key, enabled);
        // Re-sync from the authoritative override map after the write so any
        // server-side normalisation is reflected.
        const overrides = await getFlagOverrides();
        setFlags(resolveFlags(overrides));
      } catch {
        // Roll back to the server's view on failure.
        const overrides = await getFlagOverrides();
        setFlags(resolveFlags(overrides));
      }
    },
    []
  );

  return (
    <FeatureFlagContext.Provider value={{ flags, toggleFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

function useFeatureFlagContext(): FeatureFlagContextType {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error(
      "useFeatureFlag(s) must be used within a FeatureFlagProvider"
    );
  }
  return context;
}

export function useFeatureFlag(key: FlagKey): boolean {
  return useFeatureFlagContext().flags[key];
}

export function useFeatureFlags(): ResolvedFlags {
  return useFeatureFlagContext().flags;
}

export function useToggleFlag(): (
  key: FlagKey,
  enabled: boolean
) => Promise<void> {
  return useFeatureFlagContext().toggleFlag;
}

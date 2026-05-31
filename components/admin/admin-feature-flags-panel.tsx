"use client";

// Cross-tenant platform-admin feature-flag panel.
//
// Mirrors the self-serve developer panel (components/developer/feature-flags-panel.tsx)
// but operates on ANOTHER household selected from a picker, via the admin server
// actions instead of the per-user context provider.
//
// Flow:
//   1. Pick a household from the top picker.
//   2. Load BOTH the resolved (effective + dep math) flag map AND the raw
//      override map (so we can distinguish explicitly-set from inherited-default).
//   3. Toggle flags with the same dependency-aware UX as the self-serve panel:
//        - ENABLE cascades required ancestors on (after inline confirm).
//        - DISABLE warns about currently-on dependents before proceeding.
//        - "blocked by" hints when an off flag is held off by a missing dep.
//   4. After every write, re-fetch resolved + overrides from the admin getters
//      (we don't rely on router.refresh()).
//
// Imports the already-built registry + resolve contract; no DB or registry
// mutation here.

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  FEATURE_FLAGS,
  ALL_FLAG_KEYS,
  type FlagKey,
} from "@/lib/feature-flags/registry";
import {
  wouldEnableAlso,
  dependentsOf,
  type ResolvedFlags,
} from "@/lib/feature-flags/resolve";
import {
  adminGetFamilyResolvedFlags,
  adminGetFamilyOverrides,
  adminSetFamilyFlag,
} from "@/lib/actions/admin-feature-flags";
import { Switch } from "@/components/ui/switch";

// A pending confirmation surfaced inline beneath a flag row. Either a cascade
// (enable required ancestors too) or a dependent warning (disable will block
// downstream flags).
type Pending =
  | {
      kind: "cascade";
      key: FlagKey;
      also: FlagKey[];
    }
  | {
      kind: "dependents";
      key: FlagKey;
      affected: FlagKey[];
    };

function labelFor(key: FlagKey): string {
  return FEATURE_FLAGS[key].label;
}

function StabilityBadge({
  stability,
}: {
  stability: "stable" | "beta" | "experimental";
}) {
  // Semantic-token styling only — no brand hex. `stable` is the calm/default
  // look; `beta`/`experimental` lean on the brand utilities for emphasis.
  const styles: Record<typeof stability, string> = {
    stable: "border-border bg-muted text-muted-foreground",
    beta: "border-border bg-secondary text-secondary-foreground",
    experimental: "border-border bg-accent text-accent-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${styles[stability]}`}
    >
      {stability}
    </span>
  );
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function AdminFeatureFlagsPanel({
  families,
}: {
  families: Array<{ id: string; name: string | null; masterEmail: string | null }>;
}) {
  const [selectedId, setSelectedId] = useState<string>("");

  // Effective state (after dep resolution) for the selected family.
  const [resolved, setResolved] = useState<ResolvedFlags | null>(null);
  // Raw, sparse overrides — lets us show "explicitly set" vs "inherited default".
  const [overrides, setOverrides] = useState<Partial<Record<FlagKey, boolean>>>(
    {}
  );

  const [pending, setPending] = useState<Pending | null>(null);
  // Keys with an in-flight write, so we can disable the control + show busy.
  const [busy, setBusy] = useState<Set<FlagKey>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  // Loading state for the initial / re-fetch of a family's flags.
  const [isLoading, startLoad] = useTransition();

  const selectedFamily = useMemo(
    () => families.find((f) => f.id === selectedId) ?? null,
    [families, selectedId]
  );

  // Fetch both maps for a family. Used on select and after every write. We never
  // rely on router.refresh() here — this client panel pulls authoritative state
  // for an arbitrary family straight from the admin getters.
  const loadFamily = useCallback((familyId: string) => {
    setLoadError(null);
    startLoad(async () => {
      try {
        const [nextResolved, nextOverrides] = await Promise.all([
          adminGetFamilyResolvedFlags(familyId),
          adminGetFamilyOverrides(familyId),
        ]);
        setResolved(nextResolved);
        setOverrides(nextOverrides);
      } catch (err) {
        setResolved(null);
        setOverrides({});
        setLoadError(
          err instanceof Error
            ? err.message
            : "Failed to load this household's flags."
        );
      }
    });
  }, []);

  // When the selection changes, reset transient UI and load the new family.
  useEffect(() => {
    setPending(null);
    setBusy(new Set());
    setResolved(null);
    setOverrides({});
    if (!selectedId) {
      setLoadError(null);
      return;
    }
    loadFamily(selectedId);
  }, [selectedId, loadFamily]);

  // Group flag keys by their registry `category`, preserving registry order.
  const grouped = useMemo(() => {
    const groups = new Map<string, FlagKey[]>();
    for (const key of ALL_FLAG_KEYS) {
      const category = FEATURE_FLAGS[key].category;
      const list = groups.get(category) ?? [];
      list.push(key);
      groups.set(category, list);
    }
    return [...groups.entries()];
  }, []);

  function markBusy(keys: FlagKey[], on: boolean) {
    setBusy((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  }

  // Enable a flag plus any required ancestors. Ancestors first (so the target
  // isn't briefly blocked), then the target itself. Sequential awaits are fine.
  // Re-fetch resolved + overrides after the writes land.
  async function cascadeEnable(key: FlagKey, also: FlagKey[]) {
    if (!selectedId) return;
    const all = [...also, key];
    markBusy(all, true);
    try {
      for (const ancestor of also) {
        await adminSetFamilyFlag(selectedId, ancestor, true);
      }
      await adminSetFamilyFlag(selectedId, key, true);
      loadFamily(selectedId);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to update flags."
      );
    } finally {
      markBusy(all, false);
    }
  }

  async function doDisable(key: FlagKey) {
    if (!selectedId) return;
    markBusy([key], true);
    try {
      await adminSetFamilyFlag(selectedId, key, false);
      loadFamily(selectedId);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to update flags."
      );
    } finally {
      markBusy([key], false);
    }
  }

  function onToggle(key: FlagKey, next: boolean) {
    if (!resolved || busy.has(key)) return;
    setPending(null);

    if (next) {
      // Enabling: are any required ancestors currently off?
      const also = wouldEnableAlso(key, resolved);
      if (also.length > 0) {
        setPending({ kind: "cascade", key, also });
        return;
      }
      void cascadeEnable(key, []);
      return;
    }

    // Disabling: which currently-effective-on flags will this block?
    const affected = dependentsOf(key).filter((k) => resolved[k]);
    if (affected.length > 0) {
      setPending({ kind: "dependents", key, affected });
      return;
    }
    void doDisable(key);
  }

  async function confirmPending() {
    if (!pending) return;
    const current = pending;
    setPending(null);
    if (current.kind === "cascade") {
      await cascadeEnable(current.key, current.also);
    } else {
      await doDisable(current.key);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Household Feature Flags
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage feature toggles for any household. Enabling a flag turns on
          anything it requires; disabling one warns about flags that depend on
          it.
        </p>

        {/* Family picker */}
        <div className="mt-4">
          {families.length === 0 ? (
            <p className="text-sm text-muted-foreground">No households found</p>
          ) : (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Household
              </span>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              >
                <option value="">Select a household…</option>
                {families.map((family) => {
                  const name = family.name || "(unnamed)";
                  const email = family.masterEmail
                    ? ` — ${family.masterEmail}`
                    : "";
                  return (
                    <option key={family.id} value={family.id}>
                      {name}
                      {email} ({shortId(family.id)})
                    </option>
                  );
                })}
              </select>
            </label>
          )}

          {selectedFamily && (
            <p className="mt-2 text-xs text-muted-foreground">
              Editing{" "}
              <span className="font-medium text-foreground">
                {selectedFamily.name || "(unnamed)"}
              </span>
              {selectedFamily.masterEmail && (
                <> · {selectedFamily.masterEmail}</>
              )}{" "}
              · <span className="font-mono">{shortId(selectedFamily.id)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      {!selectedId ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          Select a household to manage its flags
        </div>
      ) : loadError ? (
        <div className="px-5 py-6">
          <p className="text-sm text-destructive">{loadError}</p>
          <button
            type="button"
            onClick={() => loadFamily(selectedId)}
            className="mt-3 inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Retry
          </button>
        </div>
      ) : isLoading && !resolved ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          Loading flags…
        </div>
      ) : resolved ? (
        <div className="divide-y divide-border">
          {grouped.map(([category, keys]) => (
            <section key={category} className="px-5 py-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h3>
              <ul className="space-y-3">
                {keys.map((key) => {
                  const flag = FEATURE_FLAGS[key];
                  const on = resolved[key];
                  // "Blocked": a required dependency is currently off. If the
                  // flag is also effectively off but its own intent could be on,
                  // this names what's holding it back.
                  const missingDeps = wouldEnableAlso(key, resolved);
                  const blocked = !on && missingDeps.length > 0;
                  const isBusy = busy.has(key);
                  const isPendingRow = pending?.key === key;
                  // Whether the override is explicitly set vs inherited default.
                  const hasOverride = overrides[key] !== undefined;

                  return (
                    <li key={key}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">
                              {flag.label}
                            </span>
                            <StabilityBadge stability={flag.stability} />
                            {hasOverride ? (
                              <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                                override
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                default
                              </span>
                            )}
                            {blocked && (
                              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                blocked
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {flag.description}
                          </p>
                          {blocked && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Blocked by:{" "}
                              <span className="text-foreground">
                                {missingDeps.map(labelFor).join(", ")}
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2 pt-0.5">
                          <span
                            className={`text-xs font-medium ${
                              on ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {on ? "On" : "Off"}
                          </span>
                          <Switch
                            checked={on}
                            disabled={isBusy}
                            aria-label={`Toggle ${flag.label}`}
                            onCheckedChange={(checked) =>
                              onToggle(key, checked)
                            }
                          />
                        </div>
                      </div>

                      {isPendingRow && pending && (
                        <div className="mt-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
                          {pending.kind === "cascade" ? (
                            <p className="text-muted-foreground">
                              Enabling{" "}
                              <span className="font-medium text-foreground">
                                {labelFor(pending.key)}
                              </span>{" "}
                              will also enable:{" "}
                              <span className="font-medium text-foreground">
                                {pending.also.map(labelFor).join(", ")}
                              </span>
                              .
                            </p>
                          ) : (
                            <p className="text-muted-foreground">
                              Disabling{" "}
                              <span className="font-medium text-foreground">
                                {labelFor(pending.key)}
                              </span>{" "}
                              will block these dependent flags:{" "}
                              <span className="font-medium text-foreground">
                                {pending.affected.map(labelFor).join(", ")}
                              </span>
                              .
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void confirmPending()}
                              className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                              {pending.kind === "cascade"
                                ? "Enable all"
                                : "Disable anyway"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPending(null)}
                              className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

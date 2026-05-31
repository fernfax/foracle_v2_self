"use client";

// Dependency-aware feature-flag admin panel.
//
// Lists every flag in the registry grouped by category and lets a developer
// toggle each one. The panel understands the `requires` dependency graph:
//   - Enabling a flag whose required ancestors are off cascades those ancestors
//     on first (after confirming with the user).
//   - Disabling a flag that other flags transitively require warns that those
//     dependents will be blocked before proceeding.
//   - A flag whose own intent is on but is held off by a missing required
//     dependency is rendered as "blocked" with a hint naming the culprit(s).
//
// Imports the already-built contract only; no DB or registry mutation here.

import { useMemo, useState } from "react";
import {
  useFeatureFlags,
  useToggleFlag,
} from "@/components/feature-flags/feature-flag-provider";
import {
  FEATURE_FLAGS,
  ALL_FLAG_KEYS,
  type FlagKey,
} from "@/lib/feature-flags/registry";
import { wouldEnableAlso, dependentsOf } from "@/lib/feature-flags/resolve";
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

export function FeatureFlagsPanel() {
  const flags = useFeatureFlags();
  const toggleFlag = useToggleFlag();

  const [pending, setPending] = useState<Pending | null>(null);
  // Keys with an in-flight toggle, so we can disable the control + show busy.
  const [busy, setBusy] = useState<Set<FlagKey>>(new Set());

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
  async function cascadeEnable(key: FlagKey, also: FlagKey[]) {
    const all = [...also, key];
    markBusy(all, true);
    try {
      for (const ancestor of also) {
        await toggleFlag(ancestor, true);
      }
      await toggleFlag(key, true);
    } finally {
      markBusy(all, false);
    }
  }

  async function doDisable(key: FlagKey) {
    markBusy([key], true);
    try {
      await toggleFlag(key, false);
    } finally {
      markBusy([key], false);
    }
  }

  function onToggle(key: FlagKey, next: boolean) {
    if (busy.has(key)) return;
    setPending(null);

    if (next) {
      // Enabling: are any required ancestors currently off?
      const also = wouldEnableAlso(key, flags);
      if (also.length > 0) {
        setPending({ kind: "cascade", key, also });
        return;
      }
      void cascadeEnable(key, []);
      return;
    }

    // Disabling: which currently-on flags will this block?
    const affected = dependentsOf(key).filter((k) => flags[k]);
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
          Feature Flags
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-user feature toggles. Enabling a flag turns on anything it
          requires; disabling one warns about flags that depend on it.
        </p>
      </div>

      <div className="divide-y divide-border">
        {grouped.map(([category, keys]) => (
          <section key={category} className="px-5 py-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </h3>
            <ul className="space-y-3">
              {keys.map((key) => {
                const flag = FEATURE_FLAGS[key];
                const on = flags[key];
                // "Blocked": a required dependency is currently off. If the
                // flag is also effectively off but its own intent could be on,
                // this names what's holding it back.
                const missingDeps = wouldEnableAlso(key, flags);
                const blocked = !on && missingDeps.length > 0;
                const isBusy = busy.has(key);
                const isPendingRow = pending?.key === key;

                return (
                  <li key={key}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">
                            {flag.label}
                          </span>
                          <StabilityBadge stability={flag.stability} />
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
                            on
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {on ? "On" : "Off"}
                        </span>
                        <Switch
                          checked={on}
                          disabled={isBusy}
                          aria-label={`Toggle ${flag.label}`}
                          onCheckedChange={(checked) => onToggle(key, checked)}
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
    </div>
  );
}

// Pure flag-resolution logic. NO DB / framework imports — this file is the
// unit-testable core of the feature-flag system. The DB layer
// (`lib/services/feature-flags.ts`) loads a sparse override map and hands it to
// `resolveFlags` here.

import {
  ALL_FLAG_KEYS,
  FEATURE_FLAGS,
  type FlagKey,
} from "./registry";

export type ResolvedFlags = Record<FlagKey, boolean>;

// Resolve the final on/off state of every flag.
//
// Each flag starts at `override ?? defaultEnabled` (its "own value"). A flag is
// then *effectively-enabled* only if its own value is true AND every `requires`
// ancestor is (recursively) effectively-enabled. `enhances` deps are ignored
// here — they never force-disable.
//
// The recursion is memoized so transitive chains (e.g. timelineStudio ->
// income.beta -> income) resolve correctly and cheaply.
export function resolveFlags(
  overrides: Partial<Record<FlagKey, boolean>>
): ResolvedFlags {
  // Own value: the flag's intended state ignoring dependencies.
  const own: Record<FlagKey, boolean> = ALL_FLAG_KEYS.reduce((acc, key) => {
    acc[key] = overrides[key] ?? FEATURE_FLAGS[key].defaultEnabled;
    return acc;
  }, {} as Record<FlagKey, boolean>);

  const memo = new Map<FlagKey, boolean>();
  // Guards against infinite recursion on a malformed (cyclic) registry. A real
  // cycle should be caught by assertNoCycles() at module load; this is a safety
  // net so resolution can't hang.
  const visiting = new Set<FlagKey>();

  function effective(key: FlagKey): boolean {
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    if (visiting.has(key)) return false;

    visiting.add(key);
    const result =
      own[key] &&
      FEATURE_FLAGS[key].dependsOn.requires.every((dep) => effective(dep));
    visiting.delete(key);

    memo.set(key, result);
    return result;
  }

  return ALL_FLAG_KEYS.reduce((acc, key) => {
    acc[key] = effective(key);
    return acc;
  }, {} as ResolvedFlags);
}

// The set of currently-OFF `requires` ancestors that would have to be turned on
// for `key` to become enabled. Walks the requires-graph transitively and
// returns the deps (not `key` itself) that are currently false in `current`.
export function wouldEnableAlso(
  key: FlagKey,
  current: ResolvedFlags
): FlagKey[] {
  const result = new Set<FlagKey>();
  const seen = new Set<FlagKey>();

  function walk(k: FlagKey) {
    for (const dep of FEATURE_FLAGS[k].dependsOn.requires) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      if (!current[dep]) result.add(dep);
      walk(dep);
    }
  }

  walk(key);
  return [...result];
}

// All flags that (transitively) `requires` `key` — i.e. everything that would
// be force-disabled if `key` were turned off.
export function dependentsOf(key: FlagKey): FlagKey[] {
  const result = new Set<FlagKey>();
  let changed = true;
  // Iterate to a fixpoint: a flag is a dependent if it requires `key` directly
  // or requires any already-found dependent.
  while (changed) {
    changed = false;
    for (const candidate of ALL_FLAG_KEYS) {
      if (candidate === key || result.has(candidate)) continue;
      const requires = FEATURE_FLAGS[candidate].dependsOn.requires;
      if (requires.includes(key) || requires.some((r) => result.has(r))) {
        result.add(candidate);
        changed = true;
      }
    }
  }
  return [...result];
}

// Throws if the `requires` graph contains a cycle. Called once at module load
// (below) so a bad registry fails fast in dev/test rather than producing
// silently-wrong resolution.
export function assertNoCycles(): void {
  const WHITE = 0; // unvisited
  const GREY = 1; // on the current DFS stack
  const BLACK = 2; // fully explored
  const color = new Map<FlagKey, number>();

  function visit(key: FlagKey, path: FlagKey[]): void {
    color.set(key, GREY);
    for (const dep of FEATURE_FLAGS[key].dependsOn.requires) {
      const c = color.get(dep) ?? WHITE;
      if (c === GREY) {
        throw new Error(
          `Feature-flag requires graph has a cycle: ${[...path, key, dep].join(" -> ")}`
        );
      }
      if (c === WHITE) visit(dep, [...path, key]);
    }
    color.set(key, BLACK);
  }

  for (const key of ALL_FLAG_KEYS) {
    if ((color.get(key) ?? WHITE) === WHITE) visit(key, []);
  }
}

// Fail fast on a malformed registry the moment this module is imported.
assertNoCycles();

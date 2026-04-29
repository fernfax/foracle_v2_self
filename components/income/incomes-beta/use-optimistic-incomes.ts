"use client";

import { useOptimistic, useState, useTransition } from "react";

type IncomeShape = {
  id: string;
  [key: string]: unknown;
};

type OptimisticAction<T extends IncomeShape> =
  | { kind: "update"; id: string; patch: Partial<T> }
  | { kind: "delete"; id: string };

function reducer<T extends IncomeShape>(state: T[], action: OptimisticAction<T>): T[] {
  switch (action.kind) {
    case "update":
      return state.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i));
    case "delete":
      return state.filter((i) => i.id !== action.id);
  }
}

export function useOptimisticIncomes<T extends IncomeShape>(serverIncomes: T[]) {
  const [optimistic, addOptimistic] = useOptimistic(serverIncomes, reducer<T>);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mutate = (action: OptimisticAction<T>, run: () => Promise<unknown>) => {
    startTransition(async () => {
      addOptimistic(action);
      try {
        await run();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  };

  return {
    incomes: optimistic,
    mutate,
    error,
    clearError: () => setError(null),
    pending,
  };
}

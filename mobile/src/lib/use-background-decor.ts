import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getBackgroundDecor,
  setBackgroundDecor,
  type BackgroundDecor,
} from "@/src/api/user-prefs";
import { useApiClient } from "@/src/lib/use-api-client";

const QUERY_KEY = ["user", "background-decor"] as const;

export function useBackgroundDecor(): BackgroundDecor {
  const apiClient = useApiClient();
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getBackgroundDecor(apiClient),
    staleTime: 1000 * 60 * 5,
  });
  return data?.decor ?? "radial";
}

export function useSetBackgroundDecor() {
  const apiClient = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (decor: BackgroundDecor) => setBackgroundDecor(apiClient, decor),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<{ decor: BackgroundDecor }>(QUERY_KEY);
      qc.setQueryData(QUERY_KEY, { decor: next });
      return { prev };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

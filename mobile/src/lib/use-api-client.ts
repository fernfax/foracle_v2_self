import { useAuth } from "@clerk/clerk-expo";
import { useMemo } from "react";

import { API_BASE_URL, createApiClient } from "@/src/lib/api-client";

// Hook that returns an API client bound to the current Clerk session.
// Memoised so query-keyed callers don't re-create it every render.
export function useApiClient() {
  const { getToken } = useAuth();
  return useMemo(
    () =>
      createApiClient({
        baseUrl: API_BASE_URL,
        getToken: () => getToken(),
      }),
    [getToken]
  );
}

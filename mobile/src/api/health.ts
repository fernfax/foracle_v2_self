import type { ApiClient } from "@/src/lib/api-client";

export type HealthResponse = {
  ok: boolean;
  version: string;
  commit: string;
  time: string;
};

export function getHealth(client: ApiClient): Promise<HealthResponse> {
  return client.get<HealthResponse>("/api/v1/health");
}

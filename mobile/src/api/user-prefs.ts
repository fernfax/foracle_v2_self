import type { ApiClient } from "@/src/lib/api-client";

export type BackgroundDecor = "radial" | "peranakan" | "none";

export function getBackgroundDecor(client: ApiClient): Promise<{ decor: BackgroundDecor }> {
  return client.get<{ decor: BackgroundDecor }>("/api/v1/user/background-decor");
}

export function setBackgroundDecor(
  client: ApiClient,
  decor: BackgroundDecor
): Promise<{ decor: BackgroundDecor }> {
  return client.put<{ decor: BackgroundDecor }>("/api/v1/user/background-decor", {
    decor,
  });
}

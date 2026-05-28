import Constants from "expo-constants";

// Mobile API client. Defaults to localhost:3000 for dev; override via
// EXPO_PUBLIC_API_URL in mobile/.env.local (or eas.json env per profile)
// to point at staging / prod. iOS Simulator can hit localhost directly;
// physical devices need the LAN IP of your dev machine.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  "http://localhost:3000";

export type ApiSuccess<T> = { success: true; data: T; meta?: { cursor?: string | null } };
export type ApiError = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  constructor(status: number, body: ApiError["error"]) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

export type GetTokenFn = () => Promise<string | null>;

export type ApiClient = {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, body?: unknown) => Promise<T>;
  put: <T>(path: string, body?: unknown) => Promise<T>;
  patch: <T>(path: string, body?: unknown) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
};

export function createApiClient(opts: {
  baseUrl?: string;
  getToken?: GetTokenFn;
}): ApiClient {
  const baseUrl = opts.baseUrl ?? API_BASE_URL;

  const TIMEOUT_MS = 10_000;

  async function request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Client-Platform": "ios",
    };
    const token = opts.getToken ? await opts.getToken() : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // AbortSignal.timeout isn't on all Hermes engines yet — DIY a controller.
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        throw new ApiClientError(0, {
          code: "TIMEOUT",
          message: `Request to ${path} timed out after ${TIMEOUT_MS / 1000}s. Is the API at ${baseUrl} reachable?`,
        });
      }
      throw new ApiClientError(0, {
        code: "NETWORK",
        message: `Couldn't reach ${baseUrl}${path}: ${(err as Error).message}`,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }

    let json: ApiResponse<T>;
    try {
      json = (await res.json()) as ApiResponse<T>;
    } catch {
      throw new ApiClientError(res.status, {
        code: "BAD_RESPONSE",
        message: `HTTP ${res.status} from ${path} (non-JSON body)`,
      });
    }

    if (!res.ok || json.success === false) {
      const err =
        json.success === false
          ? json.error
          : { code: "UNKNOWN", message: `HTTP ${res.status}` };
      throw new ApiClientError(res.status, err);
    }
    return json.data;
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
    patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
    delete: <T>(path: string) => request<T>("DELETE", path),
  };
}

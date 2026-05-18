import { ApiError } from "./errors";

export type Cursor = { createdAt: string; id: string };

export type ListQuery = {
  limit: number;
  cursor: Cursor | null;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(raw: string): Cursor {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as Cursor).createdAt !== "string" ||
      typeof (parsed as Cursor).id !== "string"
    ) {
      throw new Error("malformed");
    }
    return parsed as Cursor;
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Invalid pagination cursor");
  }
}

export function parseListQuery(searchParams: URLSearchParams): ListQuery {
  const rawLimit = searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (rawLimit !== null) {
    const n = Number.parseInt(rawLimit, 10);
    if (!Number.isFinite(n) || n <= 0) {
      throw new ApiError("VALIDATION_ERROR", "limit must be a positive integer");
    }
    limit = Math.min(n, MAX_LIMIT);
  }

  const rawCursor = searchParams.get("cursor");
  const cursor = rawCursor ? decodeCursor(rawCursor) : null;

  return { limit, cursor };
}

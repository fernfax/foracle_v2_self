import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, errorResponse, type ApiErrorBody } from "./errors";

export type ApiSuccessBody<T> = {
  success: true;
  data: T;
  meta?: { cursor?: string | null };
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json<ApiSuccessBody<T>>(
    { success: true, data },
    { status: 200, ...init }
  );
}

export function created<T>(data: T): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json<ApiSuccessBody<T>>(
    { success: true, data },
    { status: 201 }
  );
}

export function paginated<T>(
  data: T,
  cursor: string | null
): NextResponse<ApiSuccessBody<T>> {
  const res = NextResponse.json<ApiSuccessBody<T>>(
    { success: true, data, meta: { cursor } },
    { status: 200 }
  );
  if (cursor) res.headers.set("X-Next-Cursor", cursor);
  return res;
}

// Wraps a route handler body, turning thrown ApiError + ZodError into the
// canonical error response. Unknown errors are surfaced as INTERNAL and logged.
export async function wrap<T>(
  fn: () => Promise<NextResponse<ApiSuccessBody<T>>>
): Promise<NextResponse<ApiSuccessBody<T>> | NextResponse<ApiErrorBody>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) return errorResponse(err);
    if (err instanceof ZodError) {
      return errorResponse(
        new ApiError("VALIDATION_ERROR", "Invalid request", err.issues)
      );
    }
    console.error("[api/v1] unhandled error", err);
    return errorResponse(new ApiError("INTERNAL", "Internal server error"));
  }
}

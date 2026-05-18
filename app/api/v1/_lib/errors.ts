import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export type ApiErrorBody = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export function errorResponse(err: ApiError): NextResponse<ApiErrorBody> {
  return NextResponse.json<ApiErrorBody>(
    {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    },
    { status: err.status }
  );
}

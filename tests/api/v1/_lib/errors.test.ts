import { describe, it, expect } from "vitest";
import {
  ApiError,
  errorResponse,
  type ApiErrorCode,
} from "@/app/api/v1/_lib/errors";

describe("ApiError", () => {
  const cases: Array<[ApiErrorCode, number]> = [
    ["UNAUTHORIZED", 401],
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
    ["VALIDATION_ERROR", 422],
    ["CONFLICT", 409],
    ["RATE_LIMITED", 429],
    ["INTERNAL", 500],
  ];

  it.each(cases)("maps %s to status %i", (code, status) => {
    const err = new ApiError(code, "msg");
    expect(err.code).toBe(code);
    expect(err.status).toBe(status);
    expect(err.message).toBe("msg");
  });

  it("preserves details when provided", () => {
    const details = { field: "amount", reason: "required" };
    const err = new ApiError("VALIDATION_ERROR", "Invalid", details);
    expect(err.details).toEqual(details);
  });

  it("is throwable + catchable as Error", () => {
    expect(() => {
      throw new ApiError("NOT_FOUND", "x");
    }).toThrow(ApiError);
  });
});

describe("errorResponse", () => {
  it("returns canonical body shape", async () => {
    const res = errorResponse(new ApiError("FORBIDDEN", "Nope"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: "FORBIDDEN", message: "Nope" },
    });
  });

  it("includes details when present", async () => {
    const details = [{ path: ["amount"], message: "required" }];
    const res = errorResponse(
      new ApiError("VALIDATION_ERROR", "Invalid request", details)
    );
    const body = await res.json();
    expect(body.error.details).toEqual(details);
  });

  it("omits details key when undefined", async () => {
    const res = errorResponse(new ApiError("INTERNAL", "boom"));
    const body = await res.json();
    expect(body.error).not.toHaveProperty("details");
  });
});

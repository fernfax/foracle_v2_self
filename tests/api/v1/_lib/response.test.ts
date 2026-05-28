import { describe, it, expect } from "vitest";
import { z } from "zod";
import { created, ok, paginated, wrap } from "@/app/api/v1/_lib/response";
import { ApiError } from "@/app/api/v1/_lib/errors";

describe("success helpers", () => {
  it("ok() returns 200 with canonical body", async () => {
    const res = ok({ a: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { a: 1 } });
  });

  it("created() returns 201", async () => {
    const res = created({ id: "x" });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true, data: { id: "x" } });
  });

  it("paginated() sets meta.cursor and X-Next-Cursor when cursor present", async () => {
    const res = paginated([1, 2, 3], "abc123");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Next-Cursor")).toBe("abc123");
    expect(await res.json()).toEqual({
      success: true,
      data: [1, 2, 3],
      meta: { cursor: "abc123" },
    });
  });

  it("paginated() omits X-Next-Cursor header when cursor is null", async () => {
    const res = paginated([], null);
    expect(res.headers.get("X-Next-Cursor")).toBeNull();
    const body = await res.json();
    expect(body.meta.cursor).toBeNull();
  });
});

describe("wrap()", () => {
  it("passes through successful responses", async () => {
    const res = await wrap(async () => ok({ hello: "world" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { hello: "world" } });
  });

  it("catches ApiError and returns canonical error shape", async () => {
    const res = await wrap(async () => {
      throw new ApiError("NOT_FOUND", "missing");
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "missing" },
    });
  });

  it("catches ZodError and returns VALIDATION_ERROR(422)", async () => {
    const schema = z.object({ amount: z.string() });
    const res = await wrap(async () => {
      schema.parse({ amount: 42 });
      return ok({});
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(body.error.details)).toBe(true);
  });

  it("catches unknown errors as INTERNAL(500)", async () => {
    const res = await wrap(async () => {
      throw new Error("unexpected");
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL");
  });
});

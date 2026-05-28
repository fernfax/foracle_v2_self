import { describe, it, expect } from "vitest";
import {
  decodeCursor,
  encodeCursor,
  parseListQuery,
} from "@/app/api/v1/_lib/pagination";
import { ApiError } from "@/app/api/v1/_lib/errors";

describe("cursor encoding", () => {
  it("roundtrips", () => {
    const c = { createdAt: "2026-05-15T12:00:00.000Z", id: "uuid-1" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it("decodeCursor rejects garbage with ApiError(VALIDATION_ERROR)", () => {
    expect(() => decodeCursor("not-base64!!")).toThrow(ApiError);
    try {
      decodeCursor("not-base64!!");
    } catch (err) {
      expect((err as ApiError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("decodeCursor rejects valid base64 of wrong shape", () => {
    const bogus = Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64url");
    expect(() => decodeCursor(bogus)).toThrow(ApiError);
  });
});

describe("parseListQuery", () => {
  function q(s: string): URLSearchParams {
    return new URLSearchParams(s);
  }

  it("defaults limit to 50 when omitted", () => {
    expect(parseListQuery(q(""))).toEqual({ limit: 50, cursor: null });
  });

  it("uses provided limit when valid", () => {
    expect(parseListQuery(q("limit=25"))).toEqual({ limit: 25, cursor: null });
  });

  it("clamps limit to 200", () => {
    expect(parseListQuery(q("limit=1000"))).toEqual({ limit: 200, cursor: null });
  });

  it("rejects non-positive limit", () => {
    expect(() => parseListQuery(q("limit=0"))).toThrow(ApiError);
    expect(() => parseListQuery(q("limit=-5"))).toThrow(ApiError);
  });

  it("rejects non-numeric limit", () => {
    expect(() => parseListQuery(q("limit=abc"))).toThrow(ApiError);
  });

  it("decodes cursor when present", () => {
    const c = { createdAt: "2026-05-15T12:00:00.000Z", id: "row-9" };
    const encoded = encodeCursor(c);
    expect(parseListQuery(q(`cursor=${encoded}`))).toEqual({
      limit: 50,
      cursor: c,
    });
  });
});

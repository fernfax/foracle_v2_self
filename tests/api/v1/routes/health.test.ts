import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/v1/health/route";

describe("GET /api/v1/health", () => {
  it("returns 200 with canonical body shape", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      data: {
        ok: true,
        version: expect.any(String),
        commit: expect.any(String),
        time: expect.any(String),
      },
    });
  });

  it("commit falls back to 'dev' when RENDER_GIT_COMMIT is unset", async () => {
    const prev = process.env.RENDER_GIT_COMMIT;
    delete process.env.RENDER_GIT_COMMIT;
    try {
      const res = await GET();
      const body = await res.json();
      expect(body.data.commit).toBe("dev");
    } finally {
      if (prev !== undefined) process.env.RENDER_GIT_COMMIT = prev;
    }
  });

  it("time is a valid ISO timestamp", async () => {
    const res = await GET();
    const body = await res.json();
    expect(() => new Date(body.data.time).toISOString()).not.toThrow();
    expect(new Date(body.data.time).toISOString()).toBe(body.data.time);
  });
});

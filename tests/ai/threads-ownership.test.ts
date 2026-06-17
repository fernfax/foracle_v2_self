import { auth } from "@clerk/nextjs/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  addMessageToThread,
  createThread,
  deleteThread,
  getThread,
  getThreadMessages,
  getUserThreads,
  renameThread
} from "@/lib/ai/threads"

// IDOR / ownership audit for the AI assistant thread store (lib/ai/threads.ts).
// The store is an in-memory Map keyed by threadId; every operation re-derives the
// caller's Clerk userId and refuses to act on a thread owned by anyone else.
// These tests lock in that guarantee (previously asserted nowhere). We drive the
// "current user" by mocking Clerk's auth().
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn()
}))

function asUser(userId: string | null) {
  vi.mocked(auth).mockResolvedValue({ userId } as never)
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("AI thread store — cross-user ownership (IDOR)", () => {
  it("user B cannot read user A's thread", async () => {
    asUser("owner-read")
    const t = await createThread("Owner's private question")

    asUser("intruder-read")
    expect(await getThread(t.id)).toBeNull()
    expect(await getThreadMessages(t.id)).toEqual([])
  })

  it("user B's thread list excludes user A's threads", async () => {
    asUser("owner-list")
    await createThread("A-1")
    await createThread("A-2")

    asUser("intruder-list")
    const intruderThreads = await getUserThreads()
    expect(intruderThreads).toHaveLength(0)

    asUser("owner-list")
    expect(await getUserThreads()).toHaveLength(2)
  })

  it("user B cannot delete user A's thread", async () => {
    asUser("owner-del")
    const t = await createThread("Do not delete me")

    asUser("intruder-del")
    expect(await deleteThread(t.id)).toBe(false)

    // Still intact for the real owner.
    asUser("owner-del")
    expect(await getThread(t.id)).not.toBeNull()
  })

  it("user B cannot rename user A's thread", async () => {
    asUser("owner-ren")
    const t = await createThread("Original title")

    asUser("intruder-ren")
    expect(await renameThread(t.id, "Hacked title")).toBe(false)

    asUser("owner-ren")
    const after = await getThread(t.id)
    expect(after?.title).toBe("Original title")
  })

  it("user B cannot append a message to user A's thread", async () => {
    asUser("owner-msg")
    const t = await createThread("Owner thread")
    await addMessageToThread(t.id, "user", "owner message")

    asUser("intruder-msg")
    await expect(
      addMessageToThread(t.id, "user", "injected message")
    ).rejects.toThrow("Thread not found")

    // Owner's message count is unchanged (no injection landed).
    asUser("owner-msg")
    expect(await getThreadMessages(t.id)).toHaveLength(1)
  })
})

describe("AI thread store — unauthenticated access", () => {
  it("throws Unauthorized when there is no Clerk session", async () => {
    asUser(null)
    await expect(createThread("nope")).rejects.toThrow("Unauthorized")
    await expect(getThread("thread_anything")).rejects.toThrow("Unauthorized")
    await expect(getUserThreads()).rejects.toThrow("Unauthorized")
    await expect(deleteThread("thread_anything")).rejects.toThrow(
      "Unauthorized"
    )
  })
})

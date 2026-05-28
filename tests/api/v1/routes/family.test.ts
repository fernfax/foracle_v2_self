import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-context", () => ({
  getCurrentUserAndFamily: vi.fn(),
  assertCallerIsMaster: vi.fn(),
}));
vi.mock("@/lib/services/family", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/family")>(
    "@/lib/services/family"
  );
  return {
    ...actual,
    listFamilyMembers: vi.fn(),
    getFamilyMemberById: vi.fn(),
    createFamilyMember: vi.fn(),
    updateFamilyMember: vi.fn(),
    deleteFamilyMember: vi.fn(),
    getFamilyMemberIncomes: vi.fn(),
    inviteFamilyMember: vi.fn(),
    revokeInvitation: vi.fn(),
    resendInvitation: vi.fn(),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  GET as MEMBERS_LIST_GET,
  POST as MEMBERS_LIST_POST,
} from "@/app/api/v1/family/members/route";
import {
  DELETE as MEMBER_DELETE,
  GET as MEMBER_GET,
  PATCH as MEMBER_PATCH,
} from "@/app/api/v1/family/members/[id]/route";
import { GET as MEMBER_INCOMES_GET } from "@/app/api/v1/family/members/[id]/incomes/route";
import { POST as INVITE_POST } from "@/app/api/v1/family/invitations/route";
import { POST as REVOKE_POST } from "@/app/api/v1/family/invitations/[id]/revoke/route";
import { POST as RESEND_POST } from "@/app/api/v1/family/invitations/[id]/resend/route";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  FamilyMemberNotFoundError,
  InvitationError,
  createFamilyMember,
  deleteFamilyMember,
  getFamilyMemberById,
  getFamilyMemberIncomes,
  inviteFamilyMember,
  listFamilyMembers,
  resendInvitation,
  revokeInvitation,
  updateFamilyMember,
} from "@/lib/services/family";

const mockCtx = { userId: "u1", familyId: "f1", isMaster: true };
const ID = "fm-1";

const sampleMember = {
  id: ID,
  userId: "u1",
  familyId: "f1" as string | null,
  clerkUserId: null as string | null,
  status: "active",
  invitedEmail: null as string | null,
  clerkInvitationId: null as string | null,
  emailInvitationAccepted: false,
  name: "Jane",
  firstName: null as string | null,
  lastName: null as string | null,
  relationship: "Spouse" as string | null,
  dateOfBirth: null as string | null,
  isContributing: false as boolean | null,
  notes: null as string | null,
  createdAt: new Date("2026-05-15T12:00:00Z"),
  updatedAt: new Date("2026-05-15T12:00:00Z"),
};

const idCtx = { params: Promise.resolve({ id: ID }) };

function listReq(): NextRequest {
  return new NextRequest(new URL("/api/v1/family/members", "http://test"));
}

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://test"), {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    duplex: "half",
  } as unknown as ConstructorParameters<typeof NextRequest>[1]);
}

beforeEach(() => {
  vi.mocked(getCurrentUserAndFamily).mockResolvedValue(mockCtx);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Family members routes", () => {
  it("GET list happy", async () => {
    vi.mocked(listFamilyMembers).mockResolvedValueOnce([sampleMember]);
    const res = await MEMBERS_LIST_GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("POST creates member", async () => {
    vi.mocked(createFamilyMember).mockResolvedValueOnce(sampleMember);
    const res = await MEMBERS_LIST_POST(
      jsonReq("/api/v1/family/members", "POST", {
        name: "Jane",
        relationship: "Spouse",
      })
    );
    expect(res.status).toBe(201);
  });

  it("POST returns 422 on missing fields", async () => {
    const res = await MEMBERS_LIST_POST(
      jsonReq("/api/v1/family/members", "POST", { name: "" })
    );
    expect(res.status).toBe(422);
  });

  it("GET by id 200 + 404", async () => {
    vi.mocked(getFamilyMemberById).mockResolvedValueOnce(sampleMember);
    expect(
      (await MEMBER_GET(jsonReq(`/api/v1/family/members/${ID}`, "GET"), idCtx)).status
    ).toBe(200);

    vi.mocked(getFamilyMemberById).mockResolvedValueOnce(null);
    expect(
      (await MEMBER_GET(jsonReq(`/api/v1/family/members/${ID}`, "GET"), idCtx)).status
    ).toBe(404);
  });

  it("PATCH 200 / 404 / 422-empty", async () => {
    vi.mocked(updateFamilyMember).mockResolvedValueOnce({
      ...sampleMember,
      name: "Renamed",
    });
    expect(
      (await MEMBER_PATCH(
        jsonReq(`/api/v1/family/members/${ID}`, "PATCH", { name: "Renamed" }),
        idCtx
      )).status
    ).toBe(200);

    vi.mocked(updateFamilyMember).mockRejectedValueOnce(new FamilyMemberNotFoundError());
    expect(
      (await MEMBER_PATCH(
        jsonReq(`/api/v1/family/members/${ID}`, "PATCH", { name: "Renamed" }),
        idCtx
      )).status
    ).toBe(404);

    expect(
      (await MEMBER_PATCH(jsonReq(`/api/v1/family/members/${ID}`, "PATCH", {}), idCtx)).status
    ).toBe(422);
  });

  it("DELETE returns deletedIncomes summary", async () => {
    vi.mocked(deleteFamilyMember).mockResolvedValueOnce({
      deletedIncomes: [{ id: "inc-1", name: "Salary", amount: "5000", category: "Employment" }],
    });
    const res = await MEMBER_DELETE(
      jsonReq(`/api/v1/family/members/${ID}`, "DELETE"),
      idCtx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
    expect(body.data.deletedIncomes).toHaveLength(1);
  });

  it("GET incomes 200 + 404", async () => {
    vi.mocked(getFamilyMemberIncomes).mockResolvedValueOnce([]);
    expect(
      (await MEMBER_INCOMES_GET(
        jsonReq(`/api/v1/family/members/${ID}/incomes`, "GET"),
        idCtx
      )).status
    ).toBe(200);

    vi.mocked(getFamilyMemberIncomes).mockRejectedValueOnce(new FamilyMemberNotFoundError());
    expect(
      (await MEMBER_INCOMES_GET(
        jsonReq(`/api/v1/family/members/${ID}/incomes`, "GET"),
        idCtx
      )).status
    ).toBe(404);
  });
});

describe("Family invitations routes (master gating)", () => {
  it("POST invite returns 201 on success", async () => {
    vi.mocked(inviteFamilyMember).mockResolvedValueOnce({
      id: "fm_1",
      status: "pending",
    });
    const res = await INVITE_POST(
      jsonReq("/api/v1/family/invitations", "POST", {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        relationship: "Spouse",
      })
    );
    expect(res.status).toBe(201);
  });

  it("POST invite returns 403 when service throws master error", async () => {
    vi.mocked(inviteFamilyMember).mockRejectedValueOnce(
      new Error("Only the family master can perform this action")
    );
    const res = await INVITE_POST(
      jsonReq("/api/v1/family/invitations", "POST", {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        relationship: "Spouse",
      })
    );
    expect(res.status).toBe(403);
  });

  it("POST invite returns 409 on OTHER_FAMILY conflict", async () => {
    vi.mocked(inviteFamilyMember).mockRejectedValueOnce(
      new InvitationError("OTHER_FAMILY", "This email is already part of another family")
    );
    const res = await INVITE_POST(
      jsonReq("/api/v1/family/invitations", "POST", {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        relationship: "Spouse",
      })
    );
    expect(res.status).toBe(409);
  });

  it("POST invite returns 422 on invalid relationship", async () => {
    const res = await INVITE_POST(
      jsonReq("/api/v1/family/invitations", "POST", {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        relationship: "Friend",
      })
    );
    expect(res.status).toBe(422);
  });

  it("revoke + resend forward to service", async () => {
    vi.mocked(revokeInvitation).mockResolvedValueOnce({
      id: "fm_1",
      status: "revoked",
    });
    expect(
      (await REVOKE_POST(
        jsonReq("/api/v1/family/invitations/fm_1/revoke", "POST"),
        { params: Promise.resolve({ id: "fm_1" }) }
      )).status
    ).toBe(200);

    vi.mocked(resendInvitation).mockResolvedValueOnce({
      id: "fm_1",
      status: "pending",
    });
    expect(
      (await RESEND_POST(
        jsonReq("/api/v1/family/invitations/fm_1/resend", "POST"),
        { params: Promise.resolve({ id: "fm_1" }) }
      )).status
    ).toBe(200);
  });

  it("revoke 404 + 403 paths", async () => {
    vi.mocked(revokeInvitation).mockRejectedValueOnce(new FamilyMemberNotFoundError());
    expect(
      (await REVOKE_POST(
        jsonReq("/api/v1/family/invitations/fm_1/revoke", "POST"),
        { params: Promise.resolve({ id: "fm_1" }) }
      )).status
    ).toBe(404);

    vi.mocked(revokeInvitation).mockRejectedValueOnce(
      new Error("Only the family master can perform this action")
    );
    expect(
      (await REVOKE_POST(
        jsonReq("/api/v1/family/invitations/fm_1/revoke", "POST"),
        { params: Promise.resolve({ id: "fm_1" }) }
      )).status
    ).toBe(403);
  });
});

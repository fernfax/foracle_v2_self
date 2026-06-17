import { headers } from "next/headers"
import { CLERK_WEBHOOK_SECRET } from "@/configs/clerk.config"
import { db } from "@/db"
import { WebhookEvent } from "@clerk/nextjs/server"
import { and, eq, ne } from "drizzle-orm"
import { Webhook } from "svix"

import {
  assets,
  budgetShifts,
  currentHoldings,
  dailyExpenses,
  expenseCategories,
  expenses,
  expenseSubcategories,
  families,
  familyMembers,
  goals,
  holdingAmountHistory,
  incomesBeta,
  insuranceProviders,
  investmentPolicies,
  policies,
  propertyAssets,
  users,
  vehicleAssets
} from "@/db/schema"

// Family-shared financial tables whose rows carry the creating user's id with
// `onDelete: cascade`. When the family master is deleted these would otherwise
// be wiped out from under the remaining members, so we re-parent them to an heir
// first. (quick_links and user_chunks are intentionally NOT here — they are the
// departing user's personal data and should be removed with them.)
const FAMILY_SHARED_TABLES = [
  expenses,
  dailyExpenses,
  expenseCategories,
  expenseSubcategories,
  insuranceProviders,
  assets,
  propertyAssets,
  vehicleAssets,
  policies,
  goals,
  currentHoldings,
  holdingAmountHistory,
  investmentPolicies,
  budgetShifts,
  incomesBeta,
  familyMembers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any[]

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const WEBHOOK_SECRET = CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET to .env.local")
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400
    })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature
    }) as WebhookEvent
  } catch (err) {
    console.error("Error verifying webhook:", err)
    return new Response("Error occured", {
      status: 400
    })
  }

  const eventType = evt.type

  if (eventType === "user.created") {
    const {
      id,
      email_addresses,
      first_name,
      last_name,
      image_url,
      public_metadata
    } = evt.data

    try {
      // Two paths diverge here:
      //   (a) Invited via Foracle's Family invite flow — public_metadata carries
      //       foracleFamilyMemberId. We attach the new Clerk user to that
      //       existing pending family_members row + family.
      //   (b) Self-signup — create a fresh family-of-1 with this user as master.
      const invitedRowId =
        typeof public_metadata?.foracleFamilyMemberId === "string"
          ? public_metadata.foracleFamilyMemberId
          : null

      const primaryEmail = email_addresses[0].email_address
      let familyId: string | null = null
      let onboardingCompleted = false

      if (invitedRowId) {
        const invitedRow = await db.query.familyMembers.findFirst({
          where: eq(familyMembers.id, invitedRowId)
        })

        // Email-match check guards against tampered metadata.
        if (
          invitedRow &&
          invitedRow.status === "pending" &&
          invitedRow.familyId &&
          invitedRow.invitedEmail &&
          invitedRow.invitedEmail.toLowerCase() === primaryEmail.toLowerCase()
        ) {
          familyId = invitedRow.familyId
          onboardingCompleted = true // Invited members inherit the family's setup.
        }
      }

      if (!familyId) {
        familyId = `fam_${id}`
        await db
          .insert(families)
          .values({
            id: familyId,
            masterUserId: id,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .onConflictDoNothing()
      }

      await db.insert(users).values({
        id,
        email: primaryEmail,
        firstName: first_name || null,
        lastName: last_name || null,
        imageUrl: image_url || null,
        familyId,
        onboardingCompleted
      })

      // Link the family_members row to the new Clerk user (only after the user
      // row exists, so the FK on clerk_user_id resolves).
      if (invitedRowId && onboardingCompleted) {
        await db
          .update(familyMembers)
          .set({
            clerkUserId: id,
            status: "active",
            emailInvitationAccepted: true,
            updatedAt: new Date()
          })
          .where(eq(familyMembers.id, invitedRowId))
      }

      console.log("User created in database:", id, {
        familyId,
        invited: Boolean(invitedRowId && onboardingCompleted)
      })
    } catch (error) {
      console.error("Error creating user:", error)
      return new Response("Error creating user", { status: 500 })
    }
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    try {
      await db
        .update(users)
        .set({
          email: email_addresses[0].email_address,
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))

      console.log("User updated in database:", id)
    } catch (error) {
      console.error("Error updating user:", error)
      return new Response("Error updating user", { status: 500 })
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data
    const deletedUserId = id!

    try {
      // If this user is the master of a family that still has other members,
      // a blind delete would cascade-wipe the household's shared financial data.
      // Re-parent the family + its shared rows to a surviving member first.
      const ownedFamily = await db.query.families.findFirst({
        where: eq(families.masterUserId, deletedUserId)
      })

      let heirId: string | null = null
      if (ownedFamily) {
        const heir = await db.query.users.findFirst({
          where: and(
            eq(users.familyId, ownedFamily.id),
            ne(users.id, deletedUserId)
          )
        })
        heirId = heir?.id ?? null
      }

      if (ownedFamily && heirId) {
        await db.transaction(async (tx) => {
          // Re-parent shared data to the heir so the cascade can't reach it.
          for (const table of FAMILY_SHARED_TABLES) {
            await tx
              .update(table)
              .set({ userId: heirId })
              .where(eq(table.userId, deletedUserId))
          }
          // Hand the family to the heir.
          await tx
            .update(families)
            .set({ masterUserId: heirId, updatedAt: new Date() })
            .where(eq(families.id, ownedFamily.id))
          // Now deleting the user only cascades their personal rows
          // (quick_links, user_chunks).
          await tx.delete(users).where(eq(users.id, deletedUserId))
        })
        console.log("Master user deleted; family re-parented to heir:", {
          deletedUserId,
          familyId: ownedFamily.id,
          heirId
        })
      } else {
        // Solo user (no surviving heir) — their own data is theirs to lose.
        await db.delete(users).where(eq(users.id, deletedUserId))
        console.log("User deleted from database:", deletedUserId)
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      return new Response("Error deleting user", { status: 500 })
    }
  }

  return new Response("", { status: 200 })
}

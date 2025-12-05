"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { quickLinks } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { MAX_QUICK_LINKS } from "@/lib/quick-links-config";

export type QuickLink = {
  id: string;
  userId: string;
  linkKey: string;
  label: string;
  href: string;
  icon: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Get all quick links for the authenticated user
 */
export async function getQuickLinks(): Promise<QuickLink[]> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const userQuickLinks = await db
      .select()
      .from(quickLinks)
      .where(eq(quickLinks.userId, userId))
      .orderBy(asc(quickLinks.sortOrder));

    return userQuickLinks;
  } catch (error) {
    console.error("Error fetching quick links:", error);
    return [];
  }
}

/**
 * Add a new quick link
 */
export async function addQuickLink(data: {
  linkKey: string;
  label: string;
  href: string;
  icon: string;
}): Promise<QuickLink> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Check if user has reached the maximum number of quick links
  const existingLinks = await db
    .select()
    .from(quickLinks)
    .where(eq(quickLinks.userId, userId));

  if (existingLinks.length >= MAX_QUICK_LINKS) {
    throw new Error(`Maximum of ${MAX_QUICK_LINKS} quick links allowed`);
  }

  // Check if this link already exists for the user
  const existingLink = existingLinks.find((link) => link.linkKey === data.linkKey);
  if (existingLink) {
    throw new Error("This quick link already exists");
  }

  // Get the next sort order
  const maxSortOrder = existingLinks.reduce(
    (max, link) => Math.max(max, link.sortOrder),
    -1
  );

  const id = randomUUID();

  const [newQuickLink] = await db
    .insert(quickLinks)
    .values({
      id,
      userId,
      linkKey: data.linkKey,
      label: data.label,
      href: data.href,
      icon: data.icon,
      sortOrder: maxSortOrder + 1,
    })
    .returning();

  return newQuickLink;
}

/**
 * Remove a quick link
 */
export async function removeQuickLink(linkKey: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(quickLinks)
    .where(and(eq(quickLinks.linkKey, linkKey), eq(quickLinks.userId, userId)));
}

/**
 * Update the sort order of quick links
 */
export async function updateQuickLinksOrder(
  links: { id: string; sortOrder: number }[]
): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Update each link's sort order
  await Promise.all(
    links.map(async (link) => {
      await db
        .update(quickLinks)
        .set({ sortOrder: link.sortOrder, updatedAt: new Date() })
        .where(and(eq(quickLinks.id, link.id), eq(quickLinks.userId, userId)));
    })
  );
}

/**
 * Sync quick links - add multiple and remove those not in the list
 * This is used when the modal "Done" button is clicked
 */
export async function syncQuickLinks(
  selectedKeys: string[],
  allOptions: { key: string; label: string; href: string; icon: string }[]
): Promise<QuickLink[]> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (selectedKeys.length > MAX_QUICK_LINKS) {
    throw new Error(`Maximum of ${MAX_QUICK_LINKS} quick links allowed`);
  }

  // Get current quick links
  const currentLinks = await db
    .select()
    .from(quickLinks)
    .where(eq(quickLinks.userId, userId));

  const currentKeys = currentLinks.map((link) => link.linkKey);

  // Find keys to add and remove
  const keysToAdd = selectedKeys.filter((key) => !currentKeys.includes(key));
  const keysToRemove = currentKeys.filter((key) => !selectedKeys.includes(key));

  // Remove unselected links
  if (keysToRemove.length > 0) {
    await Promise.all(
      keysToRemove.map(async (key) => {
        await db
          .delete(quickLinks)
          .where(and(eq(quickLinks.linkKey, key), eq(quickLinks.userId, userId)));
      })
    );
  }

  // Add new links
  const maxSortOrder = currentLinks
    .filter((link) => selectedKeys.includes(link.linkKey))
    .reduce((max, link) => Math.max(max, link.sortOrder), -1);

  let nextSortOrder = maxSortOrder + 1;

  await Promise.all(
    keysToAdd.map(async (key) => {
      const option = allOptions.find((o) => o.key === key);
      if (option) {
        const id = randomUUID();
        await db.insert(quickLinks).values({
          id,
          userId,
          linkKey: option.key,
          label: option.label,
          href: option.href,
          icon: option.icon,
          sortOrder: nextSortOrder++,
        });
      }
    })
  );

  // Return updated list
  return getQuickLinks();
}

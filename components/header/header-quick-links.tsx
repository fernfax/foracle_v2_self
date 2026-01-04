"use client";

import { useState, useEffect, useCallback } from "react";
import { QuickLinksModal } from "./quick-links-modal";
import { QuickLinksDisplay } from "./quick-links-display";
import {
  getQuickLinks,
  syncQuickLinks,
  updateQuickLinksOrder,
  type QuickLink,
} from "@/lib/actions/quick-links";
import { QUICK_LINK_OPTIONS } from "@/lib/quick-links-config";

export function HeaderQuickLinks() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch quick links on mount
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const fetchedLinks = await getQuickLinks();
        setLinks(fetchedLinks);
      } catch (error) {
        console.error("Error fetching quick links:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLinks();
  }, []);

  // Handle reorder with optimistic update
  const handleReorder = useCallback(async (newLinks: QuickLink[]) => {
    // Optimistic update
    setLinks(newLinks);

    try {
      await updateQuickLinksOrder(
        newLinks.map((link) => ({ id: link.id, sortOrder: link.sortOrder }))
      );
    } catch (error) {
      console.error("Error updating quick links order:", error);
      // Revert on error by refetching
      const fetchedLinks = await getQuickLinks();
      setLinks(fetchedLinks);
    }
  }, []);

  // Handle save from modal
  const handleSave = useCallback(async (selectedKeys: string[]) => {
    setIsSaving(true);
    try {
      const updatedLinks = await syncQuickLinks(
        selectedKeys,
        QUICK_LINK_OPTIONS.map((o) => ({
          key: o.key,
          label: o.label,
          href: o.href,
          icon: o.icon,
        }))
      );
      setLinks(updatedLinks);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving quick links:", error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const selectedKeys = links.map((link) => link.linkKey);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-24 bg-muted/50 animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div data-tour="header-quick-links">
      <QuickLinksDisplay
        links={links}
        onReorder={handleReorder}
        onEditClick={() => setIsModalOpen(true)}
      />
      <QuickLinksModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedKeys={selectedKeys}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}

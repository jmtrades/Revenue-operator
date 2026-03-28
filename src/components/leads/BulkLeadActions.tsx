"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Ban, Megaphone, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ExportCSVButton } from "@/components/ui/ExportCSVButton";

interface BulkLeadActionsProps {
  selectedIds: string[];
  selectedLeads: Array<{
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    state?: string;
    [key: string]: unknown;
  }>;
  workspaceId: string;
  onComplete: () => void;
}

export function BulkLeadActions({
  selectedIds,
  selectedLeads,
  workspaceId,
  onComplete,
}: BulkLeadActionsProps) {
  const [isAddingDNC, setIsAddingDNC] = useState(false);

  const count = selectedIds.length;
  const isEmpty = count === 0;

  // Prepare export data
  const exportData = useMemo(() => {
    return selectedLeads.map((lead) => ({
      "Lead ID": lead.id,
      Name: lead.name ?? "",
      Phone: lead.phone ?? "",
      Email: lead.email ?? "",
      Status: lead.state ?? "",
    }));
  }, [selectedLeads]);

  const handleAddToDNC = async () => {
    if (isEmpty) return;

    setIsAddingDNC(true);
    try {
      const failedPhones: string[] = [];
      const successCount = { count: 0 };

      // Add each phone to DNC
      for (const lead of selectedLeads) {
        if (!lead.phone) {
          failedPhones.push(lead.name || "Unknown");
          continue;
        }

        try {
          const response = await fetch("/api/dnc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspace_id: workspaceId,
              phone_number: lead.phone,
              reason: "bulk_action",
              source: "dashboard",
              notes: `Added from bulk action on ${new Date().toLocaleDateString()}`,
            }),
          });

          if (response.ok || response.status === 409) {
            // 409 = already on DNC, treat as success
            successCount.count += 1;
          } else {
            failedPhones.push(lead.name || lead.phone);
          }
        } catch (_err) {
          failedPhones.push(lead.name || lead.phone);
        }
      }

      // Toast result
      if (successCount.count > 0) {
        toast.success(`Added ${successCount.count} lead(s) to DNC`);
      }
      if (failedPhones.length > 0) {
        toast.error(`Failed to add ${failedPhones.length} lead(s): ${failedPhones.join(", ")}`);
      }

      onComplete();
    } catch (error) {
      console.error("Error adding to DNC:", error);
      toast.error("Failed to add leads to DNC");
    } finally {
      setIsAddingDNC(false);
    }
  };

  return (
    <AnimatePresence>
      {!isEmpty && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 32,
            mass: 0.8,
          }}
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-default)] bg-gradient-to-t from-[var(--bg-surface)] via-[var(--bg-surface)]/95 to-[var(--bg-surface)]/90 px-4 py-4 backdrop-blur-md sm:left-auto sm:right-4 sm:w-auto sm:rounded-t-[var(--radius-lg)] sm:border sm:border-b-0"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {/* Selection info */}
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Users className="h-4 w-4 text-[var(--text-secondary)]" />
              <span>{count} selected</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              {/* Add to Campaign */}
              <Link
                href={`/app/campaigns/new?leadIds=${selectedIds.join(",")}`}
                className="inline-block"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Megaphone}
                  className="h-8"
                >
                  Add to Campaign
                </Button>
              </Link>

              {/* Add to DNC */}
              <Button
                variant="secondary"
                size="sm"
                icon={Ban}
                loading={isAddingDNC}
                disabled={isAddingDNC}
                onClick={handleAddToDNC}
                className="h-8"
              >
                {isAddingDNC ? "Adding..." : "Add to DNC"}
              </Button>

              {/* Export Selected */}
              <ExportCSVButton
                data={exportData}
                filename={`leads-export-${new Date().toISOString().split("T")[0]}`}
                columns={[
                  { key: "Lead ID", label: "Lead ID" },
                  { key: "Name", label: "Name" },
                  { key: "Phone", label: "Phone" },
                  { key: "Email", label: "Email" },
                  { key: "Status", label: "Status" },
                ]}
                variant="secondary"
                size="sm"
                disabled={exportData.length === 0}
              />
            </div>

            {/* Close button (mobile) */}
            <button
              onClick={onComplete}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 sm:hidden"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

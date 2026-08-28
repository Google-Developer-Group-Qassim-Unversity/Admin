import * as React from "react";
import { toast } from "sonner";

import type { Member } from "@/lib/api-types";

export interface RecipientEntry {
  name: string;
  email: string;
  member_id?: number;
}

interface UseRecipientListOptions {
  /** Shown when a manually-typed address duplicates one already in the list. */
  duplicateMessage?: string;
}

/**
 * Owns the manual add-by-email / add-from-member-picker / remove state
 * machine shared by direct email's recipient list and blast's guaranteed
 * recipients - the same shape under two different names today.
 */
export function useRecipientList({ duplicateMessage = "That email is already in the list" }: UseRecipientListOptions = {}) {
  const [recipients, setRecipients] = React.useState<RecipientEntry[]>([]);
  const [manualName, setManualName] = React.useState("");
  const [manualEmail, setManualEmail] = React.useState("");

  const addMembers = (members: Member[]) => {
    setRecipients((prev) => {
      const existing = new Set(prev.map((r) => r.email.toLowerCase()));
      const additions = members
        .filter((m) => !existing.has(m.email.toLowerCase()))
        .map((m) => ({ name: m.name, email: m.email, member_id: m.id }));
      return [...prev, ...additions];
    });
    toast.success(`Added ${members.length} member${members.length !== 1 ? "s" : ""}`);
  };

  const addManual = () => {
    const email = manualEmail.trim();
    if (!email) return;
    if (recipients.some((r) => r.email.toLowerCase() === email.toLowerCase())) {
      toast.error(duplicateMessage);
      return;
    }
    setRecipients((prev) => [...prev, { name: manualName.trim() || email, email }]);
    setManualName("");
    setManualEmail("");
  };

  const remove = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r.email.toLowerCase() !== email.toLowerCase()));
  };

  return { recipients, manualName, setManualName, manualEmail, setManualEmail, addMembers, addManual, remove };
}

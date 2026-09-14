"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DepartmentForm } from "@/components/club-structure/department-form";
import { useClubMutation } from "@/hooks/use-club-structure";
import type { DepartmentSettings } from "@/lib/club-structure-types";

export function CreateDepartmentDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const t = useTranslations("clubStructure");
  const common = useTranslations("common");
  const mutation = useClubMutation((api, settings: DepartmentSettings) => api.createDepartment(settings));
  async function create(settings: DepartmentSettings) {
    try {
      const department = await mutation.mutateAsync(settings);
      toast.success(t("departmentCreated"));
      onCreated(department.id);
    } catch {
      /* The form stays open with its entered values. */
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md" showCloseButton={!mutation.isPending}>
        <DialogHeader>
          <DialogTitle>{t("newDepartment")}</DialogTitle>
          <DialogDescription>{t("createDescription")}</DialogDescription>
        </DialogHeader>
        {mutation.error && (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error.message}
          </p>
        )}
        <DepartmentForm
          pending={mutation.isPending}
          submitLabel={t("createDepartment")}
          onSubmit={(values) => void create(values)}
        />
        <Button variant="outline" disabled={mutation.isPending} onClick={onClose}>
          {common("actions.cancel")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

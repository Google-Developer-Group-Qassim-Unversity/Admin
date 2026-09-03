"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCreateMemberManual } from "@/hooks/use-members";
import type { Gender, Member, ManualMemberCreateRequest } from "@/lib/api-types";
import { useTranslations } from "next-intl";

interface CreateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onCreatedMember?: (member: Member) => void;
  getToken: () => Promise<string | null>;
}

export function CreateMemberDialog({
  open,
  onOpenChange,
  onSuccess,
  onCreatedMember,
  getToken,
}: CreateMemberDialogProps) {
  const t = useTranslations("createMember");
  const tf = useTranslations("common.fields");
  const tc = useTranslations("common.actions");
  const createMutation = useCreateMemberManual(getToken);

  const GENDER_OPTIONS: { value: Gender; label: string }[] = [
    { value: "Male", label: tf("male") },
    { value: "Female", label: tf("female") },
  ];

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [uniId, setUniId] = React.useState("");
  const [gender, setGender] = React.useState<Gender>("Male");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const resetForm = React.useCallback(() => {
    setName("");
    setEmail("");
    setPhoneNumber("");
    setUniId("");
    setGender("Male");
    setErrors({});
  }, []);

  const validate = React.useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t("nameRequired");
    if (!email.trim()) newErrors.email = t("emailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t("invalidEmail");
    if (uniId.trim() && !/^\d{9}$/.test(uniId.trim())) newErrors.uniId = t("uniIdDigits");
    return newErrors;
  }, [name, email, uniId, t]);

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const validationErrors = validate();
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) return;

      const data: ManualMemberCreateRequest = {
        name: name.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim() || undefined,
        uni_id: uniId.trim() || undefined,
        gender,
      };

      createMutation.mutate(data, {
        onSuccess: (result) => {
          if (result.already_exists) {
            toast.warning(t("alreadyExists", { uniId }), {
              description: t("alreadyExistsDescription"),
            });
          } else {
            toast.success(t("createdSuccess", { name }));
          }
          resetForm();
          onOpenChange(false);
          onCreatedMember?.(result.member);
          onSuccess?.();
        },
        onError: (error) => {
          toast.error(t("createFailed"), {
            description: error.message,
          });
        },
      });
    },
    [name, email, phoneNumber, uniId, gender, createMutation, resetForm, onOpenChange, onSuccess, validate, t]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{tf("name")} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder={t("namePlaceholder")}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{tf("email")} *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
              }}
              placeholder="email@example.com"
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t("phoneNumber")}</Label>
            <Input
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t("phonePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uniId">{t("universityId")}</Label>
            <Input
              id="uniId"
              value={uniId}
              onChange={(e) => {
                setUniId(e.target.value);
                if (errors.uniId) setErrors((prev) => ({ ...prev, uniId: "" }));
              }}
              placeholder={t("uniIdPlaceholder")}
            />
            {errors.uniId && <p className="text-sm text-destructive">{errors.uniId}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">{tf("gender")} *</Label>
            <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
              <SelectTrigger id="gender">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={createMutation.isPending}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("creating")}
                </>
              ) : (
                t("createMember")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
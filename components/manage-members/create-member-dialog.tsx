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
import type { Gender, ManualMemberCreateRequest } from "@/lib/api-types";

interface CreateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  getToken: () => Promise<string | null>;
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

export function CreateMemberDialog({
  open,
  onOpenChange,
  onSuccess,
  getToken,
}: CreateMemberDialogProps) {
  const createMutation = useCreateMemberManual(getToken);

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
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email format";
    if (!uniId.trim()) newErrors.uniId = "University ID is required";
    else if (!/^\d{9}$/.test(uniId)) newErrors.uniId = "University ID must be 9 digits";
    return newErrors;
  }, [name, email, uniId]);

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
        uni_id: uniId.trim(),
        gender,
      };

      createMutation.mutate(data, {
        onSuccess: (result) => {
          if (result.already_exists) {
            toast.warning(`Member with uni ID ${uniId} already exists`, {
              description: "The existing member's information has been updated.",
            });
          } else {
            toast.success(`Member ${name} created successfully`);
          }
          resetForm();
          onOpenChange(false);
          onSuccess();
        },
        onError: (error) => {
          toast.error("Failed to create member", {
            description: error.message,
          });
        },
      });
    },
    [name, email, phoneNumber, uniId, gender, createMutation, resetForm, onOpenChange, onSuccess, validate]
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
          <DialogTitle>Create Member</DialogTitle>
          <DialogDescription>
            Add a new member manually. They will be marked as unauthenticated until they register through the system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="Full name"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
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
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="05XXXXXXXX (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uniId">University ID *</Label>
            <Input
              id="uniId"
              value={uniId}
              onChange={(e) => {
                setUniId(e.target.value);
                if (errors.uniId) setErrors((prev) => ({ ...prev, uniId: "" }));
              }}
              placeholder="9-digit university ID"
            />
            {errors.uniId && <p className="text-sm text-destructive">{errors.uniId}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender *</Label>
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
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Member"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
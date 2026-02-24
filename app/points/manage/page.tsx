"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getAllActions, createAction, updateAction } from "@/lib/api";
import type { ActionWithUsage, ActionType, CreateActionPayload, UpdateActionPayload } from "@/lib/api-types";

interface ActionFormData {
  action_name: string;
  ar_action_name: string;
  action_type: ActionType;
  points: number;
}

const initialFormData: ActionFormData = {
  action_name: "",
  ar_action_name: "",
  action_type: "bonus",
  points: 0,
};

const actionTypeColors: Record<ActionType, string> = {
  composite: "bg-purple-500 hover:bg-purple-600",
  department: "bg-blue-500 hover:bg-blue-600",
  member: "bg-green-500 hover:bg-green-600",
  bonus: "bg-amber-500 hover:bg-amber-600",
};

export default function ManagePointsPage() {
  const { getToken } = useAuth();

  const [actions, setActions] = useState<ActionWithUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionWithUsage | null>(null);
  const [formData, setFormData] = useState<ActionFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadActions() {
      setIsLoading(true);
      const response = await getAllActions();
      if (response.success) {
        setActions(response.data);
      } else {
        toast.error("Failed to load actions: " + response.error.message);
      }
      setIsLoading(false);
    }
    loadActions();
  }, []);

  const fetchActions = useCallback(async () => {
    setIsLoading(true);
    const response = await getAllActions();
    if (response.success) {
      setActions(response.data);
    } else {
      toast.error("Failed to load actions: " + response.error.message);
    }
    setIsLoading(false);
  }, []);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingAction(null);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (action: ActionWithUsage) => {
    setEditingAction(action);
    setFormData({
      action_name: action.action_name,
      ar_action_name: action.ar_action_name,
      action_type: action.action_type,
      points: action.points,
    });
    setIsEditDialogOpen(true);
  };

  const handleCreateAction = async () => {
    if (!formData.action_name.trim() || !formData.ar_action_name.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    const payload: CreateActionPayload = {
      action_name: formData.action_name.trim(),
      ar_action_name: formData.ar_action_name.trim(),
      action_type: formData.action_type,
      points: formData.points,
    };

    const response = await createAction(payload, getToken);
    setIsSubmitting(false);

    if (response.success) {
      toast.success("Action created successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchActions();
    } else {
      toast.error("Failed to create action: " + response.error.message);
    }
  };

  const handleUpdateAction = async () => {
    if (!editingAction) return;
    if (!formData.action_name.trim() || !formData.ar_action_name.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    const payload: UpdateActionPayload = {
      action_name: formData.action_name.trim(),
      ar_action_name: formData.ar_action_name.trim(),
      action_type: formData.action_type,
      points: formData.points,
    };

    const response = await updateAction(editingAction.id, payload, getToken);
    setIsSubmitting(false);

    if (response.success) {
      toast.success("Action updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      fetchActions();
    } else {
      toast.error("Failed to update action: " + response.error.message);
    }
  };

  const getTypeBadge = (type: ActionType) => {
    return (
      <Badge className={`${actionTypeColors[type]} text-white`}>
        {type}
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                {actions.length} action{actions.length !== 1 ? "s" : ""} configured
              </CardDescription>
            </div>
            <Button onClick={handleOpenAddDialog} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Add Action
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading actions...</div>
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No actions found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Arabic Name</TableHead>
                    <TableHead className="w-[100px]">Points</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[80px]">Used</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-mono text-xs">{action.id}</TableCell>
                      <TableCell className="font-medium">{action.action_name}</TableCell>
                      <TableCell dir="rtl">{action.ar_action_name}</TableCell>
                      <TableCell>{action.points}</TableCell>
                      <TableCell>{getTypeBadge(action.action_type)}</TableCell>
                      <TableCell>{action.usage_count}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditDialog(action)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Action</DialogTitle>
            <DialogDescription>
              Create a new action for assigning points
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name (English)</label>
              <Input
                value={formData.action_name}
                onChange={(e) => setFormData({ ...formData, action_name: e.target.value })}
                placeholder="Action name"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Name (Arabic)</label>
              <Input
                dir="rtl"
                value={formData.ar_action_name}
                onChange={(e) => setFormData({ ...formData, ar_action_name: e.target.value })}
                placeholder="اسم الإجراء"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Points</label>
              <Input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select
                value={formData.action_type}
                onValueChange={(value: ActionType) => setFormData({ ...formData, action_type: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="composite">Composite</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateAction} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Action"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Action</DialogTitle>
            <DialogDescription>
              Update the action details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name (English)</label>
              <Input
                value={formData.action_name}
                onChange={(e) => setFormData({ ...formData, action_name: e.target.value })}
                placeholder="Action name"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Name (Arabic)</label>
              <Input
                dir="rtl"
                value={formData.ar_action_name}
                onChange={(e) => setFormData({ ...formData, ar_action_name: e.target.value })}
                placeholder="اسم الإجراء"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Points</label>
              <Input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select
                value={formData.action_type}
                onValueChange={(value: ActionType) => setFormData({ ...formData, action_type: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="composite">Composite</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateAction} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Action"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

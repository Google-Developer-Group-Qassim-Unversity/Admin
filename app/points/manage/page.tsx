"use client";

import * as React from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Pencil, Loader2, GripVertical, Eye, EyeOff, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getAllActions, createAction, updateAction, reorderActions, deleteAction } from "@/lib/api";
import type { ActionWithUsage, ActionType, CreateActionPayload, UpdateActionPayload } from "@/lib/api-types";

interface ActionFormData {
  action_name: string;
  ar_action_name: string;
  action_type: ActionType;
  points: number;
  is_hidden: boolean;
}

const initialFormData: ActionFormData = {
  action_name: "",
  ar_action_name: "",
  action_type: "bonus",
  points: 0,
  is_hidden: false,
};

const actionTypeColors: Record<ActionType, string> = {
  composite: "bg-purple-500 hover:bg-purple-600",
  department: "bg-blue-500 hover:bg-blue-600",
  member: "bg-green-500 hover:bg-green-600",
  bonus: "bg-amber-500 hover:bg-amber-600",
};

type SortBy = "order" | "points" | "used";
type SortOrder = "asc" | "desc";

interface SortableTableRowProps {
  action: ActionWithUsage;
  onEdit: (action: ActionWithUsage) => void;
  onToggleHidden: (action: ActionWithUsage) => void;
  onDelete: (action: ActionWithUsage) => void;
}

function SortableTableRow({ action, onEdit, onToggleHidden, onDelete }: SortableTableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getTypeBadge = (type: ActionType) => {
    return (
      <Badge className={`${actionTypeColors[type]} text-white`}>
        {type}
      </Badge>
    );
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`${action.is_hidden ? "opacity-50" : ""} ${isDragging ? "bg-muted" : ""}`}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="font-mono text-xs">{action.id}</span>
        </div>
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {action.action_name}
          {action.is_hidden && (
            <Badge variant="outline" className="text-xs">
              <EyeOff className="h-3 w-3 mr-1" />
              Hidden
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell dir="rtl">{action.ar_action_name}</TableCell>
      <TableCell>{action.points}</TableCell>
      <TableCell>{getTypeBadge(action.action_type)}</TableCell>
      <TableCell>{action.usage_count}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleHidden(action)}
            title={action.is_hidden ? "Show action" : "Hide action"}
          >
            {action.is_hidden ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(action)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(action)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ManagePointsPage() {
  const { getToken } = useAuth();

  const [actions, setActions] = useState<ActionWithUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionWithUsage | null>(null);
  const [formData, setFormData] = useState<ActionFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [filterType, setFilterType] = useState<ActionType | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("order");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAction, setDeletingAction] = useState<ActionWithUsage | null>(null);
  const [replacementActionId, setReplacementActionId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredAndSortedActions = useMemo(() => {
    let result = [...actions];
    
    if (filterType !== "all") {
      result = result.filter(a => a.action_type === filterType);
    }
    
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "order":
          comparison = a.order - b.order;
          break;
        case "points":
          comparison = a.points - b.points;
          break;
        case "used":
          comparison = a.usage_count - b.usage_count;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return result;
  }, [actions, filterType, sortBy, sortOrder]);

  const availableReplacements = useMemo(() => {
    if (!deletingAction) return [];
    return actions.filter(a => a.id !== deletingAction.id);
  }, [actions, deletingAction]);

  const groupedReplacements = useMemo(() => {
    const composite = availableReplacements.filter(a => a.action_type === "composite");
    const department = availableReplacements.filter(a => a.action_type === "department");
    const member = availableReplacements.filter(a => a.action_type === "member");
    const bonus = availableReplacements.filter(a => a.action_type === "bonus");
    return { composite, department, member, bonus };
  }, [availableReplacements]);

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
      is_hidden: action.is_hidden,
    });
    setIsEditDialogOpen(true);
  };

  const handleToggleHidden = async (action: ActionWithUsage) => {
    const newHiddenState = !action.is_hidden;
    const payload: UpdateActionPayload = {
      is_hidden: newHiddenState,
    };

    const response = await updateAction(action.id, payload, getToken);

    if (response.success) {
      setActions(actions.map(a => 
        a.id === action.id ? { ...a, is_hidden: newHiddenState } : a
      ));
      toast.success(newHiddenState ? "Action hidden" : "Action shown");
    } else {
      toast.error("Failed to update action: " + response.error.message);
    }
  };

  const handleOpenDeleteDialog = (action: ActionWithUsage) => {
    setDeletingAction(action);
    setReplacementActionId(null);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteAction = async () => {
    if (!deletingAction) return;
    
    if (deletingAction.usage_count > 0 && !replacementActionId) {
      toast.error("Please select a replacement action");
      return;
    }

    setIsDeleting(true);
    const response = await deleteAction(deletingAction.id, replacementActionId, getToken);
    setIsDeleting(false);

    if (response.success) {
      toast.success("Action deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingAction(null);
      setReplacementActionId(null);
      fetchActions();
    } else {
      toast.error("Failed to delete action: " + response.error.message);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = actions.findIndex((a) => a.id === active.id);
      const newIndex = actions.findIndex((a) => a.id === over.id);

      const reordered = arrayMove(actions, oldIndex, newIndex);
      const updatedActions = reordered.map((action, index) => ({
        ...action,
        order: index,
      }));

      setActions(updatedActions);

      const payload = {
        action_orders: updatedActions.map((a) => ({ id: a.id, order: a.order })),
      };

      const response = await reorderActions(payload, getToken);

      if (!response.success) {
        toast.error("Failed to reorder actions: " + response.error.message);
        setActions(actions);
      }
    }
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
      is_hidden: formData.is_hidden,
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

  const toggleSort = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (column: SortBy) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === "asc" 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                {actions.length} action{actions.length !== 1 ? "s" : ""} configured • Drag to reorder
              </CardDescription>
            </div>
            <Button onClick={handleOpenAddDialog} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Add Action
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Filter:</label>
              <Select value={filterType} onValueChange={(value) => setFilterType(value as ActionType | "all")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="composite">Composite</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading actions...</div>
            </div>
          ) : filteredAndSortedActions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{filterType === "all" ? "No actions found" : "No actions match the filter"}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Arabic Name</TableHead>
                      <TableHead className="w-[100px]">
                        <button
                          onClick={() => toggleSort("points")}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          Points
                          {getSortIcon("points")}
                        </button>
                      </TableHead>
                      <TableHead className="w-[120px]">Type</TableHead>
                      <TableHead className="w-[80px]">
                        <button
                          onClick={() => toggleSort("used")}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          Used
                          {getSortIcon("used")}
                        </button>
                      </TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={filteredAndSortedActions.map((a) => a.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredAndSortedActions.map((action) => (
                        <SortableTableRow
                          key={action.id}
                          action={action}
                          onEdit={handleOpenEditDialog}
                          onToggleHidden={handleToggleHidden}
                          onDelete={handleOpenDeleteDialog}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
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
        <DialogContent className="max-w-lg">
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
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_hidden"
                checked={formData.is_hidden}
                onChange={(e) => setFormData({ ...formData, is_hidden: e.target.checked })}
                disabled={isSubmitting || formData.action_type === "bonus"}
                className="h-4 w-4"
              />
              <label htmlFor="is_hidden" className="text-sm font-medium">
                Hide this action
              </label>
              {formData.action_type === "bonus" && (
                <span className="text-xs text-muted-foreground">(Bonus actions are always hidden)</span>
              )}
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {deletingAction && (
                  <>
                    <p>
                      Are you sure you want to delete <strong>{deletingAction.action_name}</strong>?
                    </p>
                    {deletingAction.usage_count > 0 ? (
                      <div className="space-y-3">
                        <p className="text-destructive font-medium">
                          This action has been used {deletingAction.usage_count} time{deletingAction.usage_count !== 1 ? "s" : ""}.
                          You must select a replacement action to reassign these logs.
                        </p>
                        <div>
                          <label className="text-sm font-medium">Replacement Action</label>
                          <Select
                            value={replacementActionId?.toString() || ""}
                            onValueChange={(value) => setReplacementActionId(parseInt(value))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a replacement action" />
                            </SelectTrigger>
                            <SelectContent>
                              {groupedReplacements.composite.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>Composite</SelectLabel>
                                  {groupedReplacements.composite.map((action) => (
                                    <SelectItem key={action.id} value={action.id.toString()}>
                                      {action.action_name} (+{action.points})
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              {groupedReplacements.department.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>Department</SelectLabel>
                                  {groupedReplacements.department.map((action) => (
                                    <SelectItem key={action.id} value={action.id.toString()}>
                                      {action.action_name} (+{action.points})
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              {groupedReplacements.member.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>Member</SelectLabel>
                                  {groupedReplacements.member.map((action) => (
                                    <SelectItem key={action.id} value={action.id.toString()}>
                                      {action.action_name} (+{action.points})
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              {groupedReplacements.bonus.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>Bonus</SelectLabel>
                                  {groupedReplacements.bonus.map((action) => (
                                    <SelectItem key={action.id} value={action.id.toString()}>
                                      {action.action_name} (+{action.points})
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <p>This action has not been used yet. It can be safely deleted.</p>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAction}
              disabled={isDeleting || (deletingAction !== null && deletingAction.usage_count > 0 && !replacementActionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : deletingAction && deletingAction.usage_count > 0 ? (
                `Delete & Reassign ${deletingAction.usage_count} Log${deletingAction.usage_count !== 1 ? "s" : ""}`
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import * as React from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Pencil, Loader2, GripVertical, Eye, EyeOff, Trash2, ArrowUpDown, ArrowUp, ArrowDown, EllipsisVertical } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useTranslations } from "next-intl";

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

// Action type is a category, not a state, so it stays neutral (DESIGN.md:
// colour = state).
function TypeBadge({ type }: { type: ActionType }) {
  const t = useTranslations("manageActions");
  return (
    <Badge variant="outline" className="text-muted-foreground font-medium">
      {t(`types.${type}`)}
    </Badge>
  );
}

function formatPoints(points: number) {
  return points > 0 ? `+${points}` : String(points);
}

const SORT_OPTIONS = ["order-asc", "points-desc", "points-asc", "used-desc", "used-asc"] as const;

type SortBy = "order" | "points" | "used";
type SortOrder = "asc" | "desc";

interface SortableTableRowProps {
  action: ActionWithUsage;
  onEdit: (action: ActionWithUsage) => void;
  onToggleHidden: (action: ActionWithUsage) => void;
  onDelete: (action: ActionWithUsage) => void;
}

function SortableTableRow({ action, onEdit, onToggleHidden, onDelete }: SortableTableRowProps) {
  const t = useTranslations("manageActions");
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
          <span className="tabular font-mono text-xs">{action.id}</span>
        </div>
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span dir="auto">{action.action_name}</span>
          {action.is_hidden && (
            <Badge variant="outline" className="text-xs">
              <EyeOff className="h-3 w-3 me-1" />
              {t("hidden")}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell dir="rtl" lang="ar">{action.ar_action_name}</TableCell>
      <TableCell className={`tabular font-semibold ${action.points < 0 ? "text-destructive" : ""}`}>{action.points}</TableCell>
      <TableCell><TypeBadge type={action.action_type} /></TableCell>
      <TableCell className="tabular">{action.usage_count}</TableCell>
      <TableCell className="text-end">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleHidden(action)}
            title={action.is_hidden ? t("showAction") : t("hideAction")}
            aria-label={action.is_hidden ? t("showAction") : t("hideAction")}
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
            <Pencil className="h-4 w-4 me-1" />
            {t("edit")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(action)}
            className="text-destructive hover:text-destructive"
            aria-label={t("delete")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * The phone form of a table row: points up front where the eye lands, the two
 * names, then type / usage / id as meta, and the row's actions in a menu.
 * Reordering is a desktop job (drag handles fight the page scroll on touch).
 */
function ActionListItem({ action, onEdit, onToggleHidden, onDelete }: SortableTableRowProps) {
  const t = useTranslations("manageActions");
  return (
    <li
      className={`bg-card border-border flex items-center gap-3 rounded-xl border p-3 ${action.is_hidden ? "opacity-60" : ""}`}
    >
      <span
        className={`bg-muted font-display tabular flex h-11 min-w-12 shrink-0 items-center justify-center rounded-lg px-1.5 text-base font-semibold ${
          action.points < 0 ? "text-destructive" : ""
        }`}
        aria-label={`${t("points")}: ${action.points}`}
        dir="ltr"
      >
        {formatPoints(action.points)}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="line-clamp-2 text-[15px] leading-snug font-medium" dir="auto">
          {action.action_name}
        </p>
        {action.ar_action_name ? (
          <p className="text-muted-foreground truncate text-[13px] text-start" dir="rtl" lang="ar">
            {action.ar_action_name}
          </p>
        ) : null}
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
          <TypeBadge type={action.action_type} />
          {action.is_hidden && (
            <Badge variant="outline" className="text-muted-foreground gap-1">
              <EyeOff className="h-3 w-3" />
              {t("hidden")}
            </Badge>
          )}
          <span className="tabular">{t("usedCount", { count: action.usage_count })}</span>
          <span className="tabular font-mono">#{action.id}</span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            aria-label={t("moreActions", { name: action.action_name })}
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onSelect={() => onEdit(action)}>
            <Pencil />
            {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onToggleHidden(action)}>
            {action.is_hidden ? <Eye /> : <EyeOff />}
            {action.is_hidden ? t("showAction") : t("hideAction")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(action)}>
            <Trash2 />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

export default function ManagePointsPage() {
  const t = useTranslations("manageActions");
  const tc = useTranslations("common.actions");
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
        toast.error(t("loadFailed", { error: response.error.message }));
      }
      setIsLoading(false);
    }
    loadActions();
  }, [t]);

  const fetchActions = useCallback(async () => {
    setIsLoading(true);
    const response = await getAllActions();
    if (response.success) {
      setActions(response.data);
    } else {
      toast.error(t("loadFailed", { error: response.error.message }));
    }
    setIsLoading(false);
  }, [t]);

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
      toast.success(newHiddenState ? t("actionHidden") : t("actionShown"));
    } else {
      toast.error(t("updateFailed", { error: response.error.message }));
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
      toast.error(t("selectReplacement"));
      return;
    }

    setIsDeleting(true);
    const response = await deleteAction(deletingAction.id, replacementActionId, getToken);
    setIsDeleting(false);

    if (response.success) {
      toast.success(t("deletedSuccess"));
      setIsDeleteDialogOpen(false);
      setDeletingAction(null);
      setReplacementActionId(null);
      fetchActions();
    } else {
      toast.error(t("deleteFailed", { error: response.error.message }));
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
        toast.error(t("reorderFailed", { error: response.error.message }));
        setActions(actions);
      }
    }
  };

  const handleCreateAction = async () => {
    if (!formData.action_name.trim() || !formData.ar_action_name.trim()) {
      toast.error(t("fillRequiredFields"));
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
      toast.success(t("createdSuccess"));
      setIsAddDialogOpen(false);
      resetForm();
      fetchActions();
    } else {
      toast.error(t("createFailed", { error: response.error.message }));
    }
  };

  const handleUpdateAction = async () => {
    if (!editingAction) return;
    if (!formData.action_name.trim() || !formData.ar_action_name.trim()) {
      toast.error(t("fillRequiredFields"));
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
      toast.success(t("updatedSuccess"));
      setIsEditDialogOpen(false);
      resetForm();
      fetchActions();
    } else {
      toast.error(t("updateFailed", { error: response.error.message }));
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

  const typeFilterSelect = (
    <Select value={filterType} onValueChange={(value) => setFilterType(value as ActionType | "all")}>
      <SelectTrigger className="bg-card w-full md:w-[150px]" aria-label={t("filter")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("allTypes")}</SelectItem>
        <SelectItem value="composite">{t("types.composite")}</SelectItem>
        <SelectItem value="department">{t("types.department")}</SelectItem>
        <SelectItem value="member">{t("types.member")}</SelectItem>
        <SelectItem value="bonus">{t("types.bonus")}</SelectItem>
      </SelectContent>
    </Select>
  );

  // On a phone the table's clickable headers are gone, so sorting is a select.
  const sortValue = `${sortBy}-${sortOrder}`;
  const sortSelect = (
    <Select
      value={(SORT_OPTIONS as readonly string[]).includes(sortValue) ? sortValue : ""}
      onValueChange={(value) => {
        const [by, order] = value.split("-") as [SortBy, SortOrder];
        setSortBy(by);
        setSortOrder(order);
      }}
    >
      <SelectTrigger className="bg-card w-full" aria-label={t("sortLabel")}>
        <SelectValue placeholder={t("sortLabel")} />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`sort.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <Card className="max-md:gap-4 max-md:bg-transparent max-md:py-0 max-md:shadow-none max-md:ring-0">
        <CardHeader className="max-md:px-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="font-display text-lg font-semibold tracking-tight">{t("actionsTitle")}</CardTitle>
              <CardDescription className="tabular">
                <span className="md:hidden">{t("actionsCountShort", { count: actions.length })}</span>
                <span className="max-md:hidden">{t("actionsCount", { count: actions.length })}</span>
              </CardDescription>
            </div>
            <Button onClick={handleOpenAddDialog} disabled={isLoading} className="shrink-0">
              <Plus className="h-4 w-4" />
              {t("addAction")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-md:px-0">
          <div className="mb-4 grid grid-cols-2 gap-2 md:hidden">
            {typeFilterSelect}
            {sortSelect}
          </div>
          <div className="mb-4 hidden items-center gap-2 md:flex">
            <label className="text-sm font-medium">{t("filter")}</label>
            {typeFilterSelect}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse text-muted-foreground">{t("loadingActions")}</div>
            </div>
          ) : filteredAndSortedActions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{filterType === "all" ? t("noneFound") : t("noneMatchFilter")}</p>
            </div>
          ) : (
            <>
            <ul className="space-y-2 md:hidden">
              {filteredAndSortedActions.map((action) => (
                <ActionListItem
                  key={action.id}
                  action={action}
                  onEdit={handleOpenEditDialog}
                  onToggleHidden={handleToggleHidden}
                  onDelete={handleOpenDeleteDialog}
                />
              ))}
            </ul>
            <div className="hidden rounded-md border md:block">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">{t("columnId")}</TableHead>
                      <TableHead>{t("columnName")}</TableHead>
                      <TableHead>{t("columnArabicName")}</TableHead>
                      <TableHead className="w-[100px]">
                        <button
                          onClick={() => toggleSort("points")}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {t("columnPoints")}
                          {getSortIcon("points")}
                        </button>
                      </TableHead>
                      <TableHead className="w-[120px]">{t("columnType")}</TableHead>
                      <TableHead className="w-[80px]">
                        <button
                          onClick={() => toggleSort("used")}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {t("columnUsed")}
                          {getSortIcon("used")}
                        </button>
                      </TableHead>
                      <TableHead className="w-[140px] text-end">{t("columnActions")}</TableHead>
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
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("addTitle")}</DialogTitle>
            <DialogDescription>
              {t("addDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 *:space-y-1.5">
            <div>
              <label htmlFor="action-name" className="text-sm font-medium">{t("nameEnglish")}</label>
              <Input
                id="action-name"
                dir="auto"
                autoComplete="off"
                enterKeyHint="next"
                value={formData.action_name}
                onChange={(e) => setFormData({ ...formData, action_name: e.target.value })}
                placeholder={t("actionNamePlaceholder")}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="action-ar-name" className="text-sm font-medium">{t("nameArabic")}</label>
              <Input
                id="action-ar-name"
                dir="rtl"
                lang="ar"
                autoComplete="off"
                enterKeyHint="next"
                value={formData.ar_action_name}
                onChange={(e) => setFormData({ ...formData, ar_action_name: e.target.value })}
                placeholder="اسم الإجراء"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="action-points" className="text-sm font-medium">{t("points")}</label>
              <Input
                id="action-points"
                type="number"
                enterKeyHint="done"
                className="tabular"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("type")}</label>
              <Select
                value={formData.action_type}
                onValueChange={(value: ActionType) => setFormData({ ...formData, action_type: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="composite">{t("types.composite")}</SelectItem>
                  <SelectItem value="department">{t("types.department")}</SelectItem>
                  <SelectItem value="member">{t("types.member")}</SelectItem>
                  <SelectItem value="bonus">{t("types.bonus")}</SelectItem>
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
              {tc("cancel")}
            </Button>
            <Button onClick={handleCreateAction} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("creating")}
                </>
              ) : (
                t("createAction")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
            <DialogDescription>
              {t("editDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 *:space-y-1.5">
            <div>
              <label htmlFor="action-name" className="text-sm font-medium">{t("nameEnglish")}</label>
              <Input
                id="action-name"
                dir="auto"
                autoComplete="off"
                enterKeyHint="next"
                value={formData.action_name}
                onChange={(e) => setFormData({ ...formData, action_name: e.target.value })}
                placeholder={t("actionNamePlaceholder")}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="action-ar-name" className="text-sm font-medium">{t("nameArabic")}</label>
              <Input
                id="action-ar-name"
                dir="rtl"
                lang="ar"
                autoComplete="off"
                enterKeyHint="next"
                value={formData.ar_action_name}
                onChange={(e) => setFormData({ ...formData, ar_action_name: e.target.value })}
                placeholder="اسم الإجراء"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="action-points" className="text-sm font-medium">{t("points")}</label>
              <Input
                id="action-points"
                type="number"
                enterKeyHint="done"
                className="tabular"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("type")}</label>
              <Select
                value={formData.action_type}
                onValueChange={(value: ActionType) => setFormData({ ...formData, action_type: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="composite">{t("types.composite")}</SelectItem>
                  <SelectItem value="department">{t("types.department")}</SelectItem>
                  <SelectItem value="member">{t("types.member")}</SelectItem>
                  <SelectItem value="bonus">{t("types.bonus")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 space-y-0!">
              <input
                type="checkbox"
                id="is_hidden"
                checked={formData.is_hidden}
                onChange={(e) => setFormData({ ...formData, is_hidden: e.target.checked })}
                disabled={isSubmitting || formData.action_type === "bonus"}
                className="accent-primary h-5 w-5"
              />
              <label htmlFor="is_hidden" className="py-2 text-sm font-medium">
                {t("hideThisAction")}
              </label>
              {formData.action_type === "bonus" && (
                <span className="text-xs text-muted-foreground">{t("bonusAlwaysHidden")}</span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              {tc("cancel")}
            </Button>
            <Button onClick={handleUpdateAction} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("updating")}
                </>
              ) : (
                t("updateAction")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {deletingAction && (
                  <>
                    <p>
                      {t.rich("confirmDelete", { strong: (chunks) => <strong>{chunks}</strong>, name: deletingAction.action_name })}
                    </p>
                    {deletingAction.usage_count > 0 ? (
                      <div className="space-y-3">
                        <p className="text-destructive font-medium">
                          {t("usedTimesWarning", { count: deletingAction.usage_count })}
                        </p>
                        <div>
                          <label className="text-sm font-medium">{t("replacementAction")}</label>
                          <Select
                            value={replacementActionId?.toString() || ""}
                            onValueChange={(value) => setReplacementActionId(parseInt(value))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t("selectReplacementPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              {groupedReplacements.composite.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>{t("types.composite")}</SelectLabel>
                                  {groupedReplacements.composite.map((action) => (
                                    <SelectItem key={action.id} value={action.id.toString()}>
                                      {action.action_name} <span className="tabular" dir="ltr">({formatPoints(action.points)})</span>
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              {groupedReplacements.department.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>{t("types.department")}</SelectLabel>
                                  {groupedReplacements.department.map((action) => (
                                    <SelectItem key={action.id} value={action.id.toString()}>
                                      {action.action_name} <span className="tabular" dir="ltr">({formatPoints(action.points)})</span>
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              {groupedReplacements.member.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>{t("types.member")}</SelectLabel>
                                  {groupedReplacements.member.map((action) => (
                                    <SelectItem key={action.id} value={action.id.toString()}>
                                      {action.action_name} <span className="tabular" dir="ltr">({formatPoints(action.points)})</span>
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              {groupedReplacements.bonus.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>{t("types.bonus")}</SelectLabel>
                                  {groupedReplacements.bonus.map((action) => (
                                    <SelectItem key={action.id} value={action.id.toString()}>
                                      {action.action_name} <span className="tabular" dir="ltr">({formatPoints(action.points)})</span>
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <p>{t("notUsedYet")}</p>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAction}
              disabled={isDeleting || (deletingAction !== null && deletingAction.usage_count > 0 && !replacementActionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t("deleting")}
                </>
              ) : deletingAction && deletingAction.usage_count > 0 ? (
                t("deleteAndReassign", { count: deletingAction.usage_count })
              ) : (
                t("delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

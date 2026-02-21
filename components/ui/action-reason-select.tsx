"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Action, GroupedActions } from "@/lib/api-types";

interface ActionReasonSelectProps {
  /** Grouped actions: department and bonus types */
  actionOptions: GroupedActions;
  /** Currently selected action ID (null = custom/default bonus) */
  selectedActionId: number | null;
  /** Custom action name (when not selecting from predefined) */
  customActionName: string | null;
  /** Called when selection changes */
  onChange: (actionId: number | null, actionName: string | null, points: number | null) => void;
  /** Disable the input */
  disabled?: boolean;
  className?: string;
}

/**
 * Action/Reason selector with grouped options (Department, Custom) and creatable input.
 * 
 * Behavior:
 * - Select predefined action → returns action_id, action_name, and action.points
 * - Type custom reason → returns action_id=null, action_name=typed, points=null
 * - Clear selection → returns action_id=null, action_name=null, points=null
 */
export function ActionReasonSelect({
  actionOptions,
  selectedActionId,
  customActionName,
  onChange,
  disabled = false,
  className,
}: ActionReasonSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  // Find the currently selected action
  const allActions = [...actionOptions.department, ...actionOptions.member, ...actionOptions.bonus];
  const selectedAction = selectedActionId
    ? allActions.find((a) => a.id === selectedActionId)
    : null;

  // Determine display value
  const displayValue = React.useMemo(() => {
    if (selectedAction) {
      const points = selectedAction.points;
      const sign = points >= 0 ? "+" : "";
      return `${selectedAction.ar_action_name || selectedAction.action_name} (${sign}${points})`;
    }
    if (customActionName) {
      return customActionName;
    }
    return null;
  }, [selectedAction, customActionName]);

  // Filter actions by search
  const normalizedSearch = searchValue.trim().toLowerCase();

  const filterActions = (actions: Action[]) =>
    actions.filter(
      (action) =>
        action.action_name.toLowerCase().includes(normalizedSearch) ||
        action.ar_action_name.toLowerCase().includes(normalizedSearch)
    );

  const filteredDepartment = filterActions(actionOptions.department);
  const filteredMember = filterActions(actionOptions.member);
  const filteredBonus = filterActions(actionOptions.bonus);

  // Always show create option when user types - allows creating new action
  // with same name but different points
  const showCreateOption = normalizedSearch.length > 0;
  const hasAnyResults = filteredDepartment.length > 0 || filteredMember.length > 0 || filteredBonus.length > 0 || showCreateOption;

  const handleSelectAction = (action: Action) => {
    onChange(action.id, action.action_name, action.points);
    setOpen(false);
    setSearchValue("");
  };

  const handleCreateCustom = () => {
    if (!normalizedSearch) return;
    // Custom action: action_id=null, action_name=typed text, points=null (user enters manually)
    onChange(null, searchValue.trim(), null);
    setOpen(false);
    setSearchValue("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null, null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && showCreateOption) {
      e.preventDefault();
      handleCreateCustom();
    }
  };

  const formatActionLabel = (action: Action) => {
    const points = action.points;
    const sign = points >= 0 ? "+" : "";
    return `${action.ar_action_name || action.action_name} (${sign}${points})`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {displayValue || "Select reason (optional)..."}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {displayValue && (
              <span
                role="button"
                tabIndex={0}
                className="rounded-sm hover:bg-accent p-0.5"
                onClick={handleClear}
                onPointerDown={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClear(e as unknown as React.MouseEvent);
                  }
                }}
              >
                <X className="h-4 w-4 opacity-50 hover:opacity-100" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type custom reason..."
            value={searchValue}
            onValueChange={setSearchValue}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            {!hasAnyResults && (
              <CommandEmpty>No actions found. Type to create custom.</CommandEmpty>
            )}

            {/* Create custom option */}
            {showCreateOption && (
              <>
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreateCustom}
                    className="flex items-center gap-2 text-primary"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create &quot;{searchValue.trim()}&quot;</span>
                  </CommandItem>
                </CommandGroup>
                {(filteredDepartment.length > 0 || filteredMember.length > 0 || filteredBonus.length > 0) && (
                  <CommandSeparator />
                )}
              </>
            )}

            {/* Department actions group */}
            {filteredDepartment.length > 0 && (
              <CommandGroup heading="Department">
                {filteredDepartment.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={String(action.id)}
                    onSelect={() => handleSelectAction(action)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedActionId === action.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {formatActionLabel(action)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Separator between department and member */}
            {filteredDepartment.length > 0 && filteredMember.length > 0 && (
              <CommandSeparator />
            )}

            {/* Member actions group */}
            {filteredMember.length > 0 && (
              <CommandGroup heading="Member">
                {filteredMember.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={String(action.id)}
                    onSelect={() => handleSelectAction(action)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedActionId === action.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {formatActionLabel(action)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Separator between member and custom */}
            {filteredMember.length > 0 && filteredBonus.length > 0 && (
              <CommandSeparator />
            )}

            {/* Separator between department and custom when member is empty */}
            {filteredDepartment.length > 0 && filteredMember.length === 0 && filteredBonus.length > 0 && (
              <CommandSeparator />
            )}

            {/* Custom/Bonus actions group */}
            {filteredBonus.length > 0 && (
              <CommandGroup heading="Custom">
                {filteredBonus.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={String(action.id)}
                    onSelect={() => handleSelectAction(action)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedActionId === action.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {formatActionLabel(action)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

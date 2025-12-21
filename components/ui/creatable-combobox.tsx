"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CreatableComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onCreateOption?: (value: string) => Promise<void> | void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  isLoading?: boolean;
}

export function CreatableCombobox({
  options,
  value,
  onChange,
  onCreateOption,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No option found.",
  disabled = false,
  className,
  isLoading = false,
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  // Normalize search value for comparison
  const normalizedSearch = searchValue.trim().toLowerCase();

  // Check if current search matches any existing option (case-insensitive)
  const matchingOptions = options.filter((option) =>
    option.toLowerCase().includes(normalizedSearch)
  );

  // Check if exact match exists
  const exactMatchExists = options.some(
    (option) => option.toLowerCase() === normalizedSearch
  );

  // Show create option if search has value and no exact match exists
  const showCreateOption =
    normalizedSearch.length > 0 && !exactMatchExists && onCreateOption;

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue === value ? "" : selectedValue);
    setOpen(false);
    setSearchValue("");
  };

  const handleCreate = async () => {
    if (!onCreateOption || !normalizedSearch) return;

    setIsCreating(true);
    try {
      await onCreateOption(searchValue.trim());
      onChange(searchValue.trim());
      setOpen(false);
      setSearchValue("");
    } catch (error) {
      console.error("Failed to create option:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && showCreateOption && !isCreating) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn("w-full justify-between", className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            {matchingOptions.length === 0 && !showCreateOption && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            {showCreateOption && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreate}
                  disabled={isCreating}
                  className="flex items-center gap-2 text-primary"
                >
                  <Plus className="h-4 w-4" />
                  <span>
                    {isCreating
                      ? "Creating..."
                      : `Create "${searchValue.trim()}"`}
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
            {matchingOptions.length > 0 && (
              <CommandGroup>
                {matchingOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
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

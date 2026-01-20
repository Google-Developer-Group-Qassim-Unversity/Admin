"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Copy, CheckCheck, Users } from "lucide-react";

interface ActionsDropdownProps {
  onCopyAsTSV: () => void;
  onAcceptAll: () => void;
  onAcceptBulk: () => void;
  filteredRowCount: number;
}

export function ActionsDropdown({
  onCopyAsTSV,
  onAcceptAll,
  onAcceptBulk,
  filteredRowCount,
}: ActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Actions
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuItem onClick={onCopyAsTSV}>
          <Copy className="mr-2 h-4 w-4" />
          Copy as TSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAcceptAll}>
          <CheckCheck className="mr-2 h-4 w-4" />
          Accept All ({filteredRowCount})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAcceptBulk}>
          <Users className="mr-2 h-4 w-4" />
          Accept Bulk
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

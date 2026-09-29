"use client";

import type { ComponentProps } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// The shared TabsList scrolls sideways and is pinned to 40px on touch. These
// lists are short, and their triggers overlap the divider by 1px so the active
// underline sits on it - so they must neither clip nor take a fixed height.
export function ClubTabsList({ className, ...props }: ComponentProps<typeof TabsList>) {
  return (
    <TabsList variant="line" className={cn("group-data-horizontal/tabs:h-auto pointer-coarse:group-data-horizontal/tabs:h-auto w-full items-stretch justify-start overflow-visible gap-4 border-b p-0 sm:justify-start", className)} {...props} />
  );
}

export function ClubTabsTrigger({ className, ...props }: ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      className={cn(
        "-mb-px h-auto flex-none gap-2 rounded-none border-0 border-b-2 border-transparent px-1 py-3 shadow-none after:hidden data-[state=active]:border-b-primary! data-[state=active]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

"use client";

import type { ComponentProps } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function ClubTabsList({ className, ...props }: ComponentProps<typeof TabsList>) {
  return (
    <TabsList variant="line" className={cn("group-data-horizontal/tabs:h-auto w-full items-stretch justify-start gap-4 border-b p-0", className)} {...props} />
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

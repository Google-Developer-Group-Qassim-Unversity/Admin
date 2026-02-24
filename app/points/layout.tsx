"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PointsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isCustomActive = pathname === "/points" || pathname === "/points/" || pathname === "/points/custom";
  const isFullActive = pathname === "/points/full";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Points</h1>
          <p className="text-muted-foreground mt-2">
            View and manage point events for departments and members
          </p>
        </div>
        <Button asChild>
          <Link href="/points/create" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Create Custom Event
          </Link>
        </Button>
      </div>

      <nav className="border-b">
        <div className="flex gap-1">
          <Link
            href="/points"
            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors relative ${
              isCustomActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="h-4 w-4" />
            Custom Events
            {isCustomActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </Link>
          <Link
            href="/points/full"
            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors relative ${
              isFullActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarPlus className="h-4 w-4" />
            Full Events
            {isFullActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </Link>
        </div>
      </nav>

      {children}
    </div>
  );
}

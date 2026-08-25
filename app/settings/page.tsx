"use client";

import * as React from "react";
import { CalendarRange, ChevronRight, RotateCcw, Settings } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResetLeaderboardCache } from "@/hooks/use-cache";
import { RequireRole } from "@/hooks/use-rbac";

export default function SettingsPage() {
  const { getToken } = useAuth();
  const resetCache = useResetLeaderboardCache(getToken);

  const handleResetCache = async () => {
    try {
      await resetCache.mutateAsync();
      toast.success("Leaderboard cache reset successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset leaderboard cache");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage application settings and maintenance tasks
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            Cache Management
          </CardTitle>
          <CardDescription>
            Reset the leaderboard app&apos;s data cache to force it to fetch fresh data from the backend
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Reset leaderboard cache</p>
              <p className="text-sm text-muted-foreground">
                Clears all cached data on the leaderboard app, causing it to re-fetch from the backend
              </p>
            </div>
            <Button
              onClick={handleResetCache}
              disabled={resetCache.isPending}
              variant="destructive"
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${resetCache.isPending ? "animate-spin" : ""}`} />
              {resetCache.isPending ? "Resetting..." : "Reset Cache"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <RequireRole role="super_admin">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CalendarRange className="h-5 w-5 text-primary" />
              </div>
              Semesters
            </CardTitle>
            <CardDescription>
              Set the start and end dates of each semester, add new ones, and pick the default
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Manage semesters</p>
                <p className="text-sm text-muted-foreground">
                  Changes apply immediately to the leaderboard and the events filter
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/settings/semesters">
                  Open
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </RequireRole>
    </div>
  );
}

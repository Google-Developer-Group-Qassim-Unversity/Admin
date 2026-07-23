"use client";

import * as React from "react";
import { RotateCcw, Settings } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResetLeaderboardCache } from "@/hooks/use-cache";

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
    </div>
  );
}

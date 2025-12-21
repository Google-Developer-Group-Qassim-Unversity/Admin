import Link from "next/link";
import { CalendarPlus, Users, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage events, participants, and scores
        </p>
      </div>

      {/* Module Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Create Event Module */}
        <Card className="flex flex-col">
          <CardHeader className="flex-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
              <CalendarPlus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Create Event</CardTitle>
            <CardDescription>
              Create a new event for participants to join and compete
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/create-event">Create Event</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Placeholder for future modules */}
        <Card className="flex flex-col">
          <CardHeader className="flex-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Manage Participants</CardTitle>
            <CardDescription>
              View and manage event participants and registrations
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Score Management</CardTitle>
            <CardDescription>
              Update and manage participant scores and rankings
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
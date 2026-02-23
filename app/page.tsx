"use client";

import Link from "next/link";
import { CalendarPlus, Trophy, ShieldCheck, Award } from "lucide-react";

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
        {/* Manage Events Module */}
        <Card className="flex flex-col">
          <CardHeader className="flex-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
              <CalendarPlus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Manage Events</CardTitle>
            <CardDescription>
              Create and manage events for participants to join and compete
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/events">Manage Events</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Manage Points Module */}
        <Card className="flex flex-col">
          <CardHeader className="flex-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Manage Points</CardTitle>
            <CardDescription>
              Create and manage custom point events for departments
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/points">Manage Points</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Manage Admins Module */}
        <Card className="flex flex-col">
          <CardHeader className="flex-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Manage Admins</CardTitle>
            <CardDescription>
              Add, view, and manage administrator roles and permissions
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/manage-admins">Manage Admins</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Send Certificates Module */}
        <Card className="flex flex-col">
          <CardHeader className="flex-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-3">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Send Certificates</CardTitle>
            <CardDescription>
              Send certificates to custom recipients for events
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/certificates">Send Certificates</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
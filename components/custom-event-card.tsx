"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseLocalDateTime } from "@/lib/utils";
import type { Event } from "@/lib/api-types";
import { Calendar, Trophy } from "lucide-react";

interface CustomEventCardProps {
  event: Event;
}

export function CustomEventCard({ event }: CustomEventCardProps) {
  const formatDate = (dateString: string) => {
    const date = parseLocalDateTime(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusVariant = (status: Event["status"]) => {
    switch (status) {
      case "draft":
        return "default";
      case "open":
        return "secondary";
      case "active":
        return "default";
      case "closed":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      {/* Icon Header */}
      <div className="relative w-full aspect-video bg-muted flex items-center justify-center">
        <Trophy className="h-12 w-12 text-muted-foreground/40" />
      </div>

      {/* Event Details */}
      <CardHeader className="flex-1 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Button
            asChild
            variant="link"
            className="font-semibold text-lg h-auto p-0 flex-1 justify-start text-left whitespace-normal text-foreground hover:text-foreground"
          >
            <Link href={`/points/${event.id}`} className="line-clamp-2">
              {event.name}
            </Link>
          </Button>
          <Badge variant={getStatusVariant(event.status)}>
            {event.status}
          </Badge>
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {event.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pb-3 space-y-2">
        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>{formatDate(event.start_datetime)}</span>
        </div>
      </CardContent>

      {/* Actions */}
      <CardFooter className="pt-3">
        <Button asChild className="flex-1">
          <Link href={`/points/${event.id}`}>Edit Points</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

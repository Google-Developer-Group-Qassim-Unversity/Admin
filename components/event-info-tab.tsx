"use client";

import * as React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Event } from "@/lib/api-types";
import { MapPin, Globe, Calendar, Clock, Info, Trophy, Users } from "lucide-react";

interface EventInfoTabProps {
  event: Event;
}

export function EventInfoTab({ event }: EventInfoTabProps) {
  // Construct full image URL from environment variable and filename
  const imageSource =
    process.env.NEXT_PUBLIC_DEV_IMAGE_SOURCE ||
    process.env.NEXT_PUBLIC_IMAGE_SOURCE;
  const imageUrl =
    event.image_url && imageSource ? `${imageSource}${event.image_url}` : null;

  // Get location icon based on location type
  const LocationIcon = event.location_type === "online" ? Globe : MapPin;

  // Format date only
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time only
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const startDate = formatDate(event.start_datetime);
  const endDate = formatDate(event.end_datetime);
  const dailyStartTime = formatTime(event.start_datetime);
  const dailyEndTime = formatTime(event.end_datetime);

  // Check if start and end are on the same day
  const isSameDay =
    new Date(event.start_datetime).toDateString() ===
    new Date(event.end_datetime).toDateString();

  // Calculate duration in days
  const start = new Date(event.start_datetime);
  const end = new Date(event.end_datetime);
  const startDateOnly = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const endDateOnly = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );
  const diffTime = Math.abs(endDateOnly.getTime() - startDateOnly.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Get status badge variant
  const getStatusVariant = (status: Event["status"]) => {
    switch (status) {
      case "open":
        return "default";
      case "announced":
        return "secondary";
      case "closed":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Get location type label
  const getLocationTypeLabel = () => {
    switch (event.location_type) {
      case "online":
        return "Online Event";
      case "on-site":
        return "On-site Event";
      case "none":
        return "No Location";
      default:
        return event.location_type;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-start">
      {/* Event Image - Left Side */}
      <div className="flex justify-center lg:justify-start">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={event.name}
            width={600}
            height={200}
            className="rounded-xl max-w-full lg:max-w-md xl:max-w-lg h-auto max-h-150 object-contain"
          />
        ) : (
          <div className="flex items-center justify-center w-64 h-64 bg-muted rounded-xl text-muted-foreground">
            <div className="text-center">
              <Calendar className="h-16 w-16 mx-auto mb-2 opacity-50" />
              <span className="text-sm">No event image</span>
            </div>
          </div>
        )}
      </div>

      {/* Event Info - Right Side */}
      <div className="space-y-6 min-w-0">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
          {event.name}
        </h1>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant={getStatusVariant(event.status)}
            className="text-sm px-3 py-1"
          >
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </Badge>
          {event.is_official ? (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Trophy className="h-3.5 w-3.5 mr-1" />
              Official Event
            </Badge>
          ) : (
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Users className="h-3.5 w-3.5 mr-1" />
              Unoffical Event
            </Badge>
          )}
        </div>

        {/* Date & Time */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <div>
              {isSameDay ? (
                <span className="font-medium text-foreground">
                  {startDate}
                </span>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {startDate}
                  </span>
                  <span className="mx-2">—</span>
                  <span className="font-medium text-foreground">
                    {endDate}
                  </span>
                  {diffDays > 1 && (
                    <span className="ml-2 text-sm text-muted-foreground font-normal">
                      ({diffDays} Days)
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <span className="font-medium text-foreground">
              {dailyStartTime} - {dailyEndTime}
            </span>
            {!isSameDay && (
              <span className="text-sm text-muted-foreground">(daily)</span>
            )}
          </div>
        </div>

        {/* Location */}
        {event.location_type !== "none" && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <LocationIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="text-sm">{getLocationTypeLabel()}</span>
              <p className="font-medium text-foreground">{event.location}</p>
            </div>
          </div>
        )}

        <Separator />

        {/* Description Section */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 py-4">
            <Info className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-xl font-semibold">Description</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            {event.description ? (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            ) : (
              <p className="text-muted-foreground italic">
                No description provided for this event.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

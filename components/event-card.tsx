import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@/lib/api-types";
import { MapPin, Globe } from "lucide-react";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  // Format the start date to "MMM DD" format
  const formatStartDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Get location icon based on location type
  const LocationIcon = event.location_type === "online" ? Globe : MapPin;

  // Construct full image URL from environment variable and filename
  const imageSource =
    process.env.NEXT_PUBLIC_DEV_IMAGE_SOURCE ||
    process.env.NEXT_PUBLIC_IMAGE_SOURCE;
  const imageUrl = event.image_url && imageSource
    ? `${imageSource}${event.image_url}`
    : null;

  // Get status badge variant
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
      {/* Event Image */}
      <div className="relative w-full aspect-3/4 bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={event.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            priority={false}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <span className="text-sm">No image</span>
          </div>
        )}
      </div>

      {/* Event Details */}
      <CardHeader className="flex-1 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lg line-clamp-2 flex-1">
            {event.name}
          </h3>
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
        {/* Location */}
        {event.location_type !== "none" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LocationIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* Start Date */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Starts:</span>
          <span className="text-muted-foreground">
            {formatStartDate(event.start_datetime)}
          </span>
        </div>
      </CardContent>

      {/* Actions */}
      <CardFooter className="pt-3 gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/events/${event.id}`}>Edit</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href={`/events/${event.id}`}>Manage</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

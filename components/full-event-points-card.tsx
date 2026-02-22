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
import { parseLocalDateTime } from "@/lib/utils";
import type { Event } from "@/lib/api-types";
import { MapPin, Globe, Trophy } from "lucide-react";

interface FullEventPointsCardProps {
  event: Event;
}

export function FullEventPointsCard({ event }: FullEventPointsCardProps) {
  const formatStartDate = (dateString: string) => {
    const date = parseLocalDateTime(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const LocationIcon = event.location_type === "online" ? Globe : MapPin;

  const imageSource =
    process.env.NEXT_PUBLIC_DEV_IMAGE_SOURCE ||
    process.env.NEXT_PUBLIC_IMAGE_SOURCE;
  const imageUrl = event.image_url && imageSource
    ? `${imageSource}${event.image_url}`
    : null;

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
      <div className="relative w-full aspect-video bg-muted flex items-center justify-center">
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
            <Trophy className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
      </div>

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
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LocationIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">Starts:</span>
          <span>{formatStartDate(event.start_datetime)}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-3 gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/events/${event.id}?from=points`}>View Event</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href={`/points/${event.id}`}>Edit Points</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

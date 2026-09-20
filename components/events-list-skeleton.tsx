import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export function EventsListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filters Skeleton */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <Skeleton className="h-9 w-64" />
        {/* Location Type Toggle */}
        <Skeleton className="h-9 w-[180px]" />
        {/* Location Filter */}
        <Skeleton className="h-9 w-[200px]" />
      </div>

      {/* Events Grid Skeleton */}
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
        {Array.from({ length: 8 }).map((_, index) => (
          <EventCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col h-full">
      {/* Event Image Skeleton */}
      <Skeleton className="w-full h-60" />

      {/* Event Details Skeleton */}
      <CardHeader className="flex-1 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Title */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
          {/* Status Badge */}
          <Skeleton className="h-5 w-14" />
        </div>

        {/* Description */}
        <Skeleton className="h-4 w-full" />
      </CardHeader>

      <CardContent className="pb-3 space-y-2">
        {/* Location */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Date */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        {/* Edit Button */}
        <Skeleton className="h-8 flex-1" />
        {/* Manage Button */}
        <Skeleton className="h-8 flex-1" />
      </CardFooter>
    </Card>
  );
}

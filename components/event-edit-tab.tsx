import type { Event } from "@/lib/api-types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface EventEditTabProps {
  event: Event;
}

export function EventEditTab({ event }: EventEditTabProps) {
  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Event: {event.name}</CardTitle>
        <CardDescription>
          Update the event details and configuration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p>Event editing form will be implemented here</p>
        </div>
      </CardContent>
    </Card>
  );
}

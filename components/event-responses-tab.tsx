import type { Event } from "@/lib/api-types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface EventResponsesTabProps {
  event: Event;
}

export function EventResponsesTab({ event }: EventResponsesTabProps) {
  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Manage Responses: {event.name}</CardTitle>
        <CardDescription>
          View and manage responses for this event.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p>Response management features will be implemented here</p>
        </div>
      </CardContent>
    </Card>
  );
}

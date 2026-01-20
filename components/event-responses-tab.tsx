import type { Event } from "@/lib/api-types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useSubmissions } from "@/hooks/use-submissions";
import { useAuth } from "@clerk/nextjs";

interface EventResponsesTabProps {
  event: Event;
}

export function EventResponsesTab({ event }: EventResponsesTabProps) {
  const { getToken } = useAuth();
  const { data: submissions, isLoading, error } = useSubmissions(event.id, getToken);

  const total = submissions?.length ?? 0;
  const accepted = submissions?.filter((s) => s.is_accepted).length ?? 0;
  const pending = total - accepted;
  const noneType = submissions?.filter((s) => s.submission_type === "none").length ?? 0;
  const googleType = submissions?.filter((s) => s.submission_type === "google").length ?? 0;
  const partialType = submissions?.filter((s) => s.submission_type === "partial").length ?? 0;

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Manage Responses: {event.name}</CardTitle>
        <CardDescription>
          View and manage responses for this event.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <p>Loading submissions…</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <p>Failed to load submissions.</p>
            <p className="mt-2 text-xs">{String((error as Error).message ?? error)}</p>
          </div>
        ) : (
          <div className="rounded-lg border p-6">
            <div className="text-sm text-muted-foreground">Summary</div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div>Total: {total}</div>
              <div>Accepted: {accepted}</div>
              <div>Pending: {pending}</div>
              <div>None: {noneType}</div>
              <div>Google: {googleType}</div>
              <div>Partial (ignored for now): {partialType}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

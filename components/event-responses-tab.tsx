import type { Event } from "@/lib/api-types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useSubmissions } from "@/hooks/use-submissions";
import { useFormData, useFormSchema } from "@/hooks/use-form-data";
import { FormResponse, mapSchemaToTitleAnswers } from "@/lib/googl-parser";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";

interface EventResponsesTabProps {
  event: Event;
}

export function EventResponsesTab({ event }: EventResponsesTabProps) {
  const { getToken } = useAuth();
  const { data: submissions, isLoading, error } = useSubmissions(event.id, getToken);
  const { data: formData } = useFormData(event.id);
  const { data: formSchema, isLoading: isLoadingSchema } = useFormSchema(formData?.googleFormId || null);

  const total = submissions?.length ?? 0;
  const accepted = submissions?.filter((s) => s.is_accepted).length ?? 0;
  const pending = total - accepted;
  const noneType = submissions?.filter((s) => s.submission_type === "none").length ?? 0;
  const googleType = submissions?.filter((s) => s.submission_type === "google").length ?? 0;
  const partialType = submissions?.filter((s) => s.submission_type === "partial").length ?? 0;

  // Parse Google submissions
  const parsedGoogleSubmissions = useMemo(() => {
    if (!submissions || !formSchema) return [];
    
    const googleSubmissions = submissions.filter(
      (s) => s.submission_type === "google"
    );
    
    return googleSubmissions.map((submission) => {
      try {
        // google_submission_value is already an object, use it directly
        const response = {
          answers: submission.google_submission_value as unknown as FormResponse
        }
        const parsed = mapSchemaToTitleAnswers(formSchema, [response]);
        return {
          submission,
          parsedAnswers: parsed[0] || {},
        };
      } catch (err) {
        console.error("Error parsing submission:", err);
        console.error("Submission data:", submission);
        return {
          submission,
          parsedAnswers: null,
          error: err instanceof Error ? err.message : "Failed to parse",
        };
      }
    });
  }, [submissions, formSchema]);

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
          <>
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
            {parsedGoogleSubmissions.length > 0 && (
              <div className="mt-4 rounded-lg border p-4">
                <div className="text-sm font-medium mb-3">Google Submissions ({parsedGoogleSubmissions.length})</div>
                <div className="space-y-2">
                  {parsedGoogleSubmissions.map((item, idx) => (
                    <div key={idx} className="text-xs border-l-2 border-l-muted pl-2 py-1">
                      {item.error ? (
                        <div className="text-destructive">Error: {item.error}</div>
                      ) : item.parsedAnswers ? (
                        <div className="space-y-1">
                          {Object.entries(item.parsedAnswers).map(([title, answer]) => (
                            <div key={title} className="flex gap-2">
                              <span className="text-muted-foreground min-w-[100px]">{title}:</span>
                              <span>{Array.isArray(answer) ? answer.join(", ") : answer ?? "—"}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">No answers</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

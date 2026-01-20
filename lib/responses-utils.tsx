import type { Submission } from "@/lib/api-types";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Check, Clock } from "lucide-react";

// Type for transformed table row data
// Using Record<string, unknown> to allow dynamic question keys
export type TableRowData = Record<string, unknown> & {
  // Submission metadata
  submission_id: number;
  submitted_at: string;
  is_accepted: boolean;
  submission_type: string;
  // Member data (flattened)
  member_id: number;
  name: string;
  email: string;
  phone_number: string;
  uni_id: string;
  gender: string;
  uni_level: number;
  uni_college: string;
};

// Transform submissions to table rows
export function transformSubmissionsToRows(
  submissions: Submission[],
  parsedGoogleSubmissions: Array<{
    submission: Submission;
    parsedAnswers: Record<string, string | string[] | null> | null;
    error?: string;
  }>
): TableRowData[] {
  // Create a map for quick lookup of parsed answers
  const parsedMap = new Map(
    parsedGoogleSubmissions.map((p) => [p.submission.submission_id, p])
  );

  return submissions.map((submission) => {
    const parsed = parsedMap.get(submission.submission_id);

    // Base row with member data
    const row: TableRowData = {
      submission_id: submission.submission_id,
      submitted_at: submission.submitted_at,
      is_accepted: submission.is_accepted,
      submission_type: submission.submission_type,
      member_id: submission.member.id,
      name: submission.member.name,
      email: submission.member.email,
      phone_number: submission.member.phone_number,
      uni_id: submission.member.uni_id,
      gender: submission.member.gender,
      uni_level: submission.member.uni_level,
      uni_college: submission.member.uni_college,
    };

    // Add parsed answers if available
    if (parsed?.parsedAnswers) {
      Object.entries(parsed.parsedAnswers).forEach(([title, answer]) => {
        // Convert arrays to comma-separated strings
        if (Array.isArray(answer)) {
          row[title] = answer.join(", ");
        } else {
          row[title] = answer;
        }
      });
    }

    return row;
  });
}

// Get dynamic question column keys from parsed submissions
export function getQuestionKeys(
  parsedGoogleSubmissions: Array<{
    submission: Submission;
    parsedAnswers: Record<string, string | string[] | null> | null;
  }>
): string[] {
  // Get keys from first valid parsed submission
  const firstValid = parsedGoogleSubmissions.find((p) => p.parsedAnswers);
  if (!firstValid?.parsedAnswers) return [];
  return Object.keys(firstValid.parsedAnswers);
}

// Create column definitions
export function createColumns(
  questionKeys: string[],
  onToggleAccepted: (submissionId: number, currentValue: boolean) => void
): ColumnDef<TableRowData>[] {
  // Base member columns
  const baseColumns: ColumnDef<TableRowData>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-2"
        >
          Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone_number",
      header: "Phone",
    },
    {
      accessorKey: "uni_id",
      header: "Uni ID",
    },
    {
      accessorKey: "gender",
      header: "Gender",
    },
    {
      accessorKey: "uni_level",
      header: "Level",
    },
    {
      accessorKey: "uni_college",
      header: "College",
    },
    {
      accessorKey: "submitted_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-2"
        >
          Submitted At
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("submitted_at"));
        return (
          <span className="text-muted-foreground">
            {date.toLocaleDateString()}{" "}
            {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
      },
    },
  ];

  // Dynamic question columns
  const questionColumns: ColumnDef<TableRowData>[] = questionKeys.map(
    (key) => ({
      accessorKey: key,
      header: key,
      cell: ({ row }) => {
        const value = row.getValue(key);
        if (value === null || value === undefined || value === "") {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span className="max-w-[200px] truncate block">{String(value)}</span>
        );
      },
    })
  );

  // Actions column
  const actionsColumn: ColumnDef<TableRowData> = {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const isAccepted = row.original.is_accepted;
      const submissionId = row.original.submission_id;
      return (
        <Button
          variant={isAccepted ? "secondary" : "outline"}
          size="sm"
          onClick={() => onToggleAccepted(submissionId, isAccepted)}
          className="gap-1"
        >
          {isAccepted ? (
            <>
              <Check className="h-3 w-3" />
              Accepted
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              Pending
            </>
          )}
        </Button>
      );
    },
  };

  return [...baseColumns, ...questionColumns, actionsColumn];
}

// Helper to get column ID from column definition
function getColumnId(col: ColumnDef<TableRowData>): string | null {
  if (col.id) return col.id;
  if ("accessorKey" in col && typeof col.accessorKey === "string") {
    return col.accessorKey;
  }
  return null;
}

// Generate TSV content from table data
export function generateTSV(
  rows: TableRowData[],
  columns: ColumnDef<TableRowData>[],
  columnVisibility: Record<string, boolean>
): string {
  // Filter visible columns (excluding actions column)
  const visibleColumns = columns.filter((col) => {
    const columnId = getColumnId(col);
    if (!columnId || columnId === "actions") return false;
    // Check visibility (default to true if not specified)
    return columnVisibility[columnId] !== false;
  });

  // Build header row
  const headers = visibleColumns.map((col) => {
    const header = col.header;
    const columnId = getColumnId(col) || "";

    // If header is a string, use it directly
    if (typeof header === "string") {
      return header;
    }

    // For function headers (like sortable columns), use known mappings or format the id
    const headerMap: Record<string, string> = {
      name: "Name",
      submitted_at: "Submitted At",
    };
    if (headerMap[columnId]) {
      return headerMap[columnId];
    }

    // Fallback: format the column id nicely
    return String(columnId)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  });

  // Build data rows
  const dataRows = rows.map((row) => {
    return visibleColumns.map((col) => {
      const columnId = getColumnId(col);
      if (!columnId) return "";

      // Get value from row
      const value = row[columnId];

      // Handle null/undefined values
      if (value === null || value === undefined) {
        return "";
      }

      // Convert to string and escape tabs/newlines
      const stringValue = String(value);
      // Replace tabs with spaces, newlines with spaces
      return stringValue.replace(/\t/g, " ").replace(/\n/g, " ").replace(/\r/g, "");
    });
  });

  // Combine header and rows
  return [headers, ...dataRows]
    .map((row) => row.join("\t"))
    .join("\n");
}

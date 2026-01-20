import type { Submission } from "@/lib/api-types";
import type { ColumnDef, HeaderContext } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";

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

// Helper function to create a header with dropdown menu for sorting and hiding
function createHeaderWithDropdown(title: string, sortable: boolean = false) {
  function HeaderDropdown({ column }: HeaderContext<TableRowData, unknown>) {
    const sortDirection = sortable ? column.getIsSorted() : false;
    const isVisible = column.getIsVisible();
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
          >
            {title}
            {sortable && <ArrowUpDown className="ml-1 h-3 w-3" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {sortable && (
            <>
              <DropdownMenuItem
                onClick={() => column.toggleSorting(false)}
                disabled={sortDirection === "asc"}
              >
                <ArrowUp className="mr-2 h-4 w-4" />
                Sort Ascending
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => column.toggleSorting(true)}
                disabled={sortDirection === "desc"}
              >
                <ArrowDown className="mr-2 h-4 w-4" />
                Sort Descending
              </DropdownMenuItem>
              {sortDirection && (
                <DropdownMenuItem onClick={() => column.clearSorting()}>
                  Clear Sort
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuCheckboxItem
            checked={isVisible}
            onCheckedChange={(value) => column.toggleVisibility(!!value)}
          >
            {isVisible ? (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Hide Column
              </>
            ) : (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Show Column
              </>
            )}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  HeaderDropdown.displayName = `HeaderDropdown(${title})`;
  
  return HeaderDropdown;
}

// Create column definitions
export function createColumns(
  questionKeys: string[]
): ColumnDef<TableRowData>[] {
  // Select column for row selection
  const selectColumn: ColumnDef<TableRowData> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };

  // Base member columns
  const baseColumns: ColumnDef<TableRowData>[] = [
    {
      accessorKey: "name",
      header: createHeaderWithDropdown("Name", false),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "email",
      header: createHeaderWithDropdown("Email", false),
      enableSorting: false,
    },
    {
      accessorKey: "phone_number",
      header: createHeaderWithDropdown("Phone", false),
      enableSorting: false,
    },
    {
      accessorKey: "uni_id",
      header: createHeaderWithDropdown("Uni ID", false),
      enableSorting: false,
    },
    {
      accessorKey: "gender",
      header: createHeaderWithDropdown("Gender", false),
      enableSorting: false,
    },
    {
      accessorKey: "uni_level",
      header: createHeaderWithDropdown("Level", false),
      enableSorting: false,
    },
    {
      accessorKey: "uni_college",
      header: createHeaderWithDropdown("College", false),
      enableSorting: false,
    },
    {
      accessorKey: "submitted_at",
      header: createHeaderWithDropdown("Submitted At", true),
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
      header: createHeaderWithDropdown(key, false),
      enableSorting: false,
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

  return [selectColumn, ...baseColumns, ...questionColumns];
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
  // Filter visible columns (excluding select and actions columns)
  const visibleColumns = columns.filter((col) => {
    const columnId = getColumnId(col);
    if (!columnId || columnId === "actions" || columnId === "select") return false;
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

// =============================================================================
// Status Filter Utilities
// =============================================================================

export type StatusFilter = "all" | "accepted" | "not_accepted";

/**
 * Filter table data by acceptance status
 */
export function filterTableDataByStatus(
  data: TableRowData[],
  filter: StatusFilter
): TableRowData[] {
  if (filter === "all") return data;
  if (filter === "accepted") return data.filter((row) => row.is_accepted);
  if (filter === "not_accepted") return data.filter((row) => !row.is_accepted);
  return data;
}

/**
 * Get updated accepted state for "Accept All" action
 * Sets all provided rows to accepted (true)
 */
export function getAcceptAllUpdates(
  rows: TableRowData[],
  currentState: Record<number, boolean>
): Record<number, boolean> {
  const updates = { ...currentState };
  for (const row of rows) {
    updates[row.submission_id] = true;
  }
  return updates;
}

/**
 * Get updated accepted state for "Accept Selected" action
 * Sets all selected rows to accepted (true)
 */
export function getAcceptSelectedUpdates(
  selectedRows: TableRowData[],
  currentState: Record<number, boolean>
): Record<number, boolean> {
  const updates = { ...currentState };
  for (const row of selectedRows) {
    updates[row.submission_id] = true;
  }
  return updates;
}

/**
 * Toggle acceptance state for selected rows
 * If all selected rows are accepted, unaccepts them
 * Otherwise, accepts all selected rows
 */
export function getToggleSelectedUpdates(
  selectedRows: TableRowData[],
  currentState: Record<number, boolean>
): { updates: Record<number, boolean>; allAccepted: boolean } {
  const updates = { ...currentState };
  // Check if all selected rows are currently accepted
  const allAccepted = selectedRows.every(
    (row) => currentState[row.submission_id] ?? row.is_accepted
  );
  
  // Toggle: if all accepted, unaccept; otherwise accept
  const newValue = !allAccepted;
  for (const row of selectedRows) {
    updates[row.submission_id] = newValue;
  }
  
  return { updates, allAccepted };
}

/**
 * Get updated accepted state for "Accept Bulk" action
 * Accepts all submissions matching the provided Uni IDs
 * Returns the updated state and count of accepted submissions
 */
export function getBulkAcceptUpdates(
  allRows: TableRowData[],
  uniIds: string[],
  currentState: Record<number, boolean>
): { updates: Record<number, boolean>; acceptedCount: number } {
  const updates = { ...currentState };
  const uniIdSet = new Set(uniIds.map((id) => id.trim().toLowerCase()));
  let acceptedCount = 0;

  for (const row of allRows) {
    const rowUniId = String(row.uni_id || "").trim().toLowerCase();
    if (uniIdSet.has(rowUniId)) {
      updates[row.submission_id] = true;
      acceptedCount++;
    }
  }

  return { updates, acceptedCount };
}

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

// Type for transformed table row data
// Using Record<string, unknown> to allow dynamic question keys
export type TableRowData = Record<string, unknown> & {
  // Submission metadata
  submission_id: number;
  submitted_at: string;
  is_accepted: boolean;
  is_invited: boolean;
  submission_type: string;
  // Member data (flattened)
  member_id: number;
  name: string;
  email: string;
  phone_number: string;
  uni_id: string | null;
  gender: string;
  uni_level: number | null;
  uni_college: string | null;
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
      is_invited: submission.is_invited,
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

// Member fields a Google Form question column commonly re-asks
const DUPLICATE_CANDIDATE_FIELDS = ["name", "email", "uni_id", "gender"] as const;

function normalizeForComparison(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, " ");
  return normalized === "" ? null : normalized;
}

// Detect Google question columns whose answers just repeat a member field
// (e.g. a "what's your name" question when we already have submission.member.name),
// so the responses table can hide them by default without hardcoding per-form
// question text - titles are the form's own (often Arabic) wording and vary per form.
export function getDuplicateQuestionKeys(
  rows: TableRowData[],
  questionKeys: string[]
): string[] {
  const MIN_SAMPLES = 3;
  const MATCH_THRESHOLD = 0.8;

  return questionKeys.filter((key) =>
    DUPLICATE_CANDIDATE_FIELDS.some((field) => {
      let compared = 0;
      let matched = 0;

      for (const row of rows) {
        const fieldValue = normalizeForComparison(row[field]);
        const questionValue = normalizeForComparison(row[key]);
        if (fieldValue === null || questionValue === null) continue;
        compared += 1;
        if (fieldValue === questionValue) matched += 1;
      }

      return compared >= MIN_SAMPLES && matched / compared >= MATCH_THRESHOLD;
    })
  );
}

// Helper function to create a header with dropdown menu for sorting and hiding.
// `titleKey` looks up responsesTable.{titleKey} unless `isLiteral` is set, which
// is used for dynamic Google Form question columns - their titles are the
// form's own question text and must not be run through the app's translations.
function createHeaderWithDropdown(titleKey: string, sortable: boolean = false, isLiteral: boolean = false) {
  function HeaderDropdown({ column }: HeaderContext<TableRowData, unknown>) {
    const t = useTranslations("responsesTable");
    const title = isLiteral ? titleKey : t(titleKey as never);
    const sortDirection = sortable ? column.getIsSorted() : false;
    const isVisible = column.getIsVisible();
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ms-2 h-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
          >
            {title}
            {sortable && <ArrowUpDown className="ms-1 h-3 w-3" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {sortable && (
            <>
              <DropdownMenuItem
                onClick={() => column.toggleSorting(false)}
                disabled={sortDirection === "asc"}
              >
                <ArrowUp className="me-2 h-4 w-4" />
                {t("sortAscending")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => column.toggleSorting(true)}
                disabled={sortDirection === "desc"}
              >
                <ArrowDown className="me-2 h-4 w-4" />
                {t("sortDescending")}
              </DropdownMenuItem>
              {sortDirection && (
                <DropdownMenuItem onClick={() => column.clearSorting()}>
                  {t("clearSort")}
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
                <Eye className="me-2 h-4 w-4" />
                {t("hideColumn")}
              </>
            ) : (
              <>
                <EyeOff className="me-2 h-4 w-4" />
                {t("showColumn")}
              </>
            )}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  HeaderDropdown.displayName = `HeaderDropdown(${titleKey})`;
  
  return HeaderDropdown;
}

// Create column definitions
export function createColumns(
  questionKeys: string[]
): ColumnDef<TableRowData>[] {
  // Select column for row selection
  function AcceptedHeader() {
    const t = useTranslations("responsesTable");
    return t("accepted");
  }

  function EmailedHeader() {
    const t = useTranslations("responsesTable");
    return t("emailed");
  }

  const SelectAllHeader = ({ table }: HeaderContext<TableRowData, unknown>) => {
    const t = useTranslations("responsesTable");
    return (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={t("selectAll")}
      />
    );
  };

  const SelectRowCell = ({ row }: { row: { getIsSelected: () => boolean; toggleSelected: (value: boolean) => void } }) => {
    const t = useTranslations("responsesTable");
    return (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={t("selectRow")}
      />
    );
  };

  const selectColumn: ColumnDef<TableRowData> = {
    id: "select",
    header: SelectAllHeader,
    cell: ({ row }) => <SelectRowCell row={row} />,
    enableSorting: false,
    enableHiding: false,
  };

  // Status columns
  const statusColumns: ColumnDef<TableRowData>[] = [
    {
      accessorKey: "is_accepted",
      header: AcceptedHeader,
      enableSorting: false,
      size: 70,
      minSize: 70,
      maxSize: 70,
      cell: ({ row }) => {
        const isAccepted = row.original.is_accepted;
        return isAccepted ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        );
      },
    },
    {
      accessorKey: "is_invited",
      header: EmailedHeader,
      enableSorting: false,
      size: 70,
      minSize: 70,
      maxSize: 70,
      cell: ({ row }) => {
        const isInvited = row.original.is_invited;
        return isInvited ? (
          <Check className="h-4 w-4 text-blue-600" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        );
      },
    },
  ];

  // Base member columns
  const baseColumns: ColumnDef<TableRowData>[] = [
    {
      accessorKey: "name",
      header: createHeaderWithDropdown("name", false),
      enableSorting: false,
      cell: ({ row }) => {
        const name = String(row.getValue("name"));
        if (name.length > 25) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium">{name}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{name}</p>
              </TooltipContent>
            </Tooltip>
          );
        }
        return <span className="font-medium">{name}</span>;
      },
    },
    {
      accessorKey: "email",
      header: createHeaderWithDropdown("email", false),
      enableSorting: false,
      cell: ({ row }) => {
        const email = String(row.getValue("email"));
        if (email.length > 25) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{email}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{email}</p>
              </TooltipContent>
            </Tooltip>
          );
        }
        return <span>{email}</span>;
      },
    },
    {
      accessorKey: "phone_number",
      header: createHeaderWithDropdown("phone", false),
      enableSorting: false,
    },
    {
      accessorKey: "uni_id",
      header: createHeaderWithDropdown("uniId", false),
      enableSorting: false,
    },
    {
      accessorKey: "gender",
      header: createHeaderWithDropdown("gender", false),
      enableSorting: false,
    },
    {
      accessorKey: "uni_level",
      header: createHeaderWithDropdown("level", false),
      enableSorting: false,
    },
    {
      accessorKey: "uni_college",
      header: createHeaderWithDropdown("college", false),
      enableSorting: false,
      cell: ({ row }) => {
        const value = row.getValue("uni_college");
        const college = value ? String(value) : "—";
        if (college.length > 25) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{college}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{college}</p>
              </TooltipContent>
            </Tooltip>
          );
        }
        return <span>{college}</span>;
      },
    },
    {
      accessorKey: "submitted_at",
      header: createHeaderWithDropdown("submittedAt", true),
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
      header: createHeaderWithDropdown(key, false, true),
      enableSorting: false,
      cell: ({ row }) => {
        const value = row.getValue(key);
        if (value === null || value === undefined || value === "") {
          return <span className="text-muted-foreground">—</span>;
        }
        const stringValue = String(value);
        // Show tooltip only if content is long enough to be truncated
        if (stringValue.length > 30) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="max-w-[200px] truncate block">
                  {stringValue}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <p className="whitespace-pre-wrap break-words">{stringValue}</p>
              </TooltipContent>
            </Tooltip>
          );
        }
        return (
          <span className="max-w-[200px] truncate block">{stringValue}</span>
        );
      },
    })
  );

  return [selectColumn, ...statusColumns, ...baseColumns, ...questionColumns];
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

export type StatusFilter = "all" | "accepted" | "not_accepted" | "accepted_invited" | "accepted_not_invited";

/**
 * Filter table data by acceptance/invited status
 */
export function filterTableDataByStatus(
  data: TableRowData[],
  filter: StatusFilter
): TableRowData[] {
  if (filter === "all") return data;
  if (filter === "accepted") return data.filter((row) => row.is_accepted);
  if (filter === "not_accepted") return data.filter((row) => !row.is_accepted);
  if (filter === "accepted_invited") return data.filter((row) => row.is_accepted && row.is_invited);
  if (filter === "accepted_not_invited") return data.filter((row) => row.is_accepted && !row.is_invited);
  return data;
}

/**
 * Get API payload for "Accept All" action
 * Returns array of payload objects to accept all provided rows
 */
export function getAcceptAllPayload(
  rows: TableRowData[]
): Array<{ submission_id: number; is_accepted: boolean }> {
  return rows.map((row) => ({
    submission_id: row.submission_id,
    is_accepted: true,
  }));
}

/**
 * Get API payload for "Accept Selected" action
 * Returns array of payload objects to accept all selected rows
 */
export function getAcceptSelectedPayload(
  selectedRows: TableRowData[]
): Array<{ submission_id: number; is_accepted: boolean }> {
  return selectedRows.map((row) => ({
    submission_id: row.submission_id,
    is_accepted: true,
  }));
}

/**
 * Get API payload for "Toggle Selected" action
 * If all selected rows are accepted, unaccepts them
 * Otherwise, accepts all selected rows
 */
export function getToggleSelectedPayload(
  selectedRows: TableRowData[]
): { payload: Array<{ submission_id: number; is_accepted: boolean }>; allAccepted: boolean } {
  // Check if all selected rows are currently accepted
  const allAccepted = selectedRows.every((row) => row.is_accepted);
  
  // Toggle: if all accepted, unaccept; otherwise accept
  const newValue = !allAccepted;
  
  return {
    payload: selectedRows.map((row) => ({
      submission_id: row.submission_id,
      is_accepted: newValue,
    })),
    allAccepted,
  };
}

/**
 * Get API payload for "Accept Bulk" action
 * Accepts all submissions matching the provided Uni IDs
 * Returns the payload array and count of matched submissions
 */
export function getBulkAcceptPayload(
  allRows: TableRowData[],
  uniIds: string[]
): { payload: Array<{ submission_id: number; is_accepted: boolean }>; acceptedCount: number } {
  const uniIdSet = new Set(uniIds.map((id) => id.trim().toLowerCase()));
  const payload: Array<{ submission_id: number; is_accepted: boolean }> = [];

  for (const row of allRows) {
    const rowUniId = String(row.uni_id || "").trim().toLowerCase();
    if (uniIdSet.has(rowUniId)) {
      payload.push({
        submission_id: row.submission_id,
        is_accepted: true,
      });
    }
  }

  return { payload, acceptedCount: payload.length };
}

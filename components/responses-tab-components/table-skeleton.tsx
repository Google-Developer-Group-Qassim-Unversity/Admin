"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Table skeleton component matching the table structure
export function TableSkeleton() {
  return (
    <>
      {/* Summary Statistics Skeleton */}
      <div className="rounded-lg border p-6 mb-6">
        <div className="text-sm text-muted-foreground">Summary</div>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-2 rounded bg-muted/50">
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Table Controls Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Base columns: Name, Email, Phone, Uni ID, Gender, Level, College, Submitted At, Actions */}
              {/* Plus 2-3 placeholder question columns */}
              {Array.from({ length: 11 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-5 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: 11 }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <Skeleton className="h-5 w-48" />
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-9" />
          ))}
        </div>
      </div>
    </>
  );
}

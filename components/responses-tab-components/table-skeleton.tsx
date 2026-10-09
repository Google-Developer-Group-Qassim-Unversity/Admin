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
      <div className="bg-mortar mb-5 grid grid-cols-2 gap-1 rounded-lg p-1 sm:mb-6 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`bg-card rounded-sm px-3.5 py-3 ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="mt-2 h-6 w-10" />
          </div>
        ))}
      </div>

      {/* Table Controls Skeleton */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Skeleton className="h-10 w-full sm:max-w-sm" />
        <Skeleton className="h-10 w-full sm:h-9 sm:w-24" />
      </div>

      {/* Card list skeleton (phones) */}
      <div className="flex flex-col md:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-rule flex items-center gap-3 border-b px-1 py-3">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-card ring-rule hidden overflow-hidden rounded-xl ring-1 md:block">
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

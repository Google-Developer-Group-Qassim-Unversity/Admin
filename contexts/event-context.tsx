"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Event } from "@/lib/api-types";

interface EventContextValue {
  event: Event | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const EventContext = createContext<EventContextValue | null>(null);

export function EventProvider({
  children,
  event,
  isLoading,
  error,
  refetch,
}: {
  children: ReactNode;
  event: Event | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}) {
  return (
    <EventContext.Provider value={{ event, isLoading, error, refetch }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEventContext must be used within an EventProvider");
  }
  return context;
}

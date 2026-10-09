"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Autosave for a draft request's three forms (event details, Design brief,
 * Logistics brief).
 *
 * Each form keeps its own local copy and saves it on its own, a moment after
 * the last keystroke. The provider knows every form's state so the page can
 * show one "Saving… / Saved" line, and so "Finish later" can flush them all
 * before leaving the page.
 */

type SaveState = "saved" | "dirty" | "saving" | "error";

type DraftSaveContextValue = {
  register: (key: string, flush: () => Promise<void>) => () => void;
  report: (key: string, state: SaveState) => void;
  flushAll: () => Promise<boolean>;
  state: SaveState;
};

const DraftSaveContext = React.createContext<DraftSaveContextValue | null>(null);

const AUTOSAVE_DELAY_MS = 1200;

export function DraftSaveProvider({ children }: { children: React.ReactNode }) {
  const flushers = React.useRef(new Map<string, () => Promise<void>>());
  const [states, setStates] = React.useState<Record<string, SaveState>>({});
  // The same states, readable right after an await in flushAll (state would lag a render).
  const statesRef = React.useRef<Record<string, SaveState>>({});

  const register = React.useCallback((key: string, flush: () => Promise<void>) => {
    flushers.current.set(key, flush);
    return () => {
      flushers.current.delete(key);
    };
  }, []);

  const report = React.useCallback((key: string, state: SaveState) => {
    statesRef.current = { ...statesRef.current, [key]: state };
    setStates((current) => (current[key] === state ? current : { ...current, [key]: state }));
  }, []);

  const flushAll = React.useCallback(async () => {
    await Promise.all([...flushers.current.values()].map((flush) => flush()));
    return !Object.values(statesRef.current).some((s) => s === "error" || s === "dirty");
  }, []);

  const values = Object.values(states);
  const state: SaveState = values.includes("saving")
    ? "saving"
    : values.includes("error")
      ? "error"
      : values.includes("dirty")
        ? "dirty"
        : "saved";

  // Closing the tab with unsaved typing asks first.
  React.useEffect(() => {
    if (state !== "dirty" && state !== "saving") return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state]);

  const value = React.useMemo(() => ({ register, report, flushAll, state }), [register, report, flushAll, state]);
  return <DraftSaveContext.Provider value={value}>{children}</DraftSaveContext.Provider>;
}

export function useDraftSave() {
  const context = React.useContext(DraftSaveContext);
  if (!context) throw new Error("useDraftSave must be used inside DraftSaveProvider");
  return context;
}

/**
 * Local state for one draft form that saves itself.
 *
 * `server` is what the backend last returned. It replaces the local copy only
 * while nothing typed is waiting to be saved, so a save of another form (which
 * refreshes the whole request) never wipes this one.
 */
export function useAutosavedDraft<T>({
  key,
  server,
  save,
  enabled,
}: {
  key: string;
  server: T;
  save: (value: T) => Promise<unknown>;
  enabled: boolean;
}) {
  const t = useTranslations("pipeline.autosave");
  const { register, report } = useDraftSave();
  const [value, setValue] = React.useState<T>(server);
  const valueRef = React.useRef(value);
  const dirty = React.useRef(false);
  const inFlight = React.useRef<Promise<void> | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = React.useRef(save);
  React.useLayoutEffect(() => {
    saveRef.current = save;
  });

  const serverKey = JSON.stringify(server);
  React.useEffect(() => {
    if (dirty.current) return;
    valueRef.current = server;
    setValue(server);
    // `serverKey` stands in for `server`, whose identity changes on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  const flush = React.useCallback(async (): Promise<void> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    // One save at a time; whatever was typed during it goes in the next one.
    if (inFlight.current) await inFlight.current;
    if (!dirty.current) return;

    const snapshot = valueRef.current;
    dirty.current = false;
    report(key, "saving");
    let failed = false;
    const run = (async () => {
      try {
        await saveRef.current(snapshot);
        report(key, dirty.current ? "dirty" : "saved");
      } catch (error) {
        // Stays unsaved; the next edit, "Finish later" or submit tries again. No retry loop.
        failed = true;
        dirty.current = true;
        report(key, "error");
        toast.error(error instanceof Error ? error.message : t("failed"));
      }
    })();
    inFlight.current = run;
    await run;
    inFlight.current = null;
    if (!failed && dirty.current && !timer.current) {
      // Typing continued during the save: save that too, after the usual pause.
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    }
  }, [key, report, t]);

  React.useEffect(() => register(key, flush), [key, register, flush]);

  // Leaving the page (not just the tab) saves what is left. Only on unmount, hence the ref.
  const flushRef = React.useRef(flush);
  React.useLayoutEffect(() => {
    flushRef.current = flush;
  });
  React.useEffect(
    () => () => {
      if (dirty.current) void flushRef.current();
    },
    [],
  );

  const update = React.useCallback(
    (next: T | ((current: T) => T)) => {
      if (!enabled) return;
      const resolved = typeof next === "function" ? (next as (current: T) => T)(valueRef.current) : next;
      valueRef.current = resolved;
      setValue(resolved);
      dirty.current = true;
      report(key, "dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    },
    [enabled, key, report, flush],
  );

  return { value, update };
}

/** One line under the page header: where the draft's saving stands. */
export function DraftSaveStatus() {
  const t = useTranslations("pipeline.autosave");
  const { state } = useDraftSave();
  if (state === "saving" || state === "dirty") {
    return (
      <span className="text-ink-2 flex items-center gap-1.5 text-xs font-medium">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t("saving")}
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="text-door-madder-ink flex items-center gap-1.5 text-xs font-bold">
        <AlertCircle className="h-3.5 w-3.5" />
        {t("error")}
      </span>
    );
  }
  return (
    <span className="text-door-green-ink flex items-center gap-1.5 text-xs font-medium">
      <Check className="h-3.5 w-3.5" />
      {t("saved")}
    </span>
  );
}

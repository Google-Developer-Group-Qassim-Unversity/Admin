"use client";

import { Info } from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Touch and keyboard help, kept beside the label rather than inside it. */
export function FieldHelp({ label, children }: { label: string; children: React.ReactNode }) {
  const locale = useLocale();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={label} className="text-ink-3 size-11 shrink-0 p-3">
          <Info className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent dir={locale === "ar" ? "rtl" : "ltr"} align="start" className="max-w-[calc(100vw-2rem)] gap-0 text-start leading-relaxed">
        {children}
      </PopoverContent>
    </Popover>
  );
}

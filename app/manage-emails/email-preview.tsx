"use client";

import * as React from "react";
import { Maximize2, Monitor, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";

import { ScaledEmailFrame } from "./scaled-email-frame";

type Screen = "phone" | "desktop";

/** The viewport each screen renders the email at, before it is scaled down to fit. */
const SCREEN: Record<Screen, { width: number; height: number }> = {
  phone: { width: 390, height: 720 },
  desktop: { width: 1024, height: 768 },
};

/**
 * A sent email as it looks on a phone or a desktop, scaled to fit the drawer,
 * with a near-full-screen dialog to see the desktop one at real size. The
 * screen choice is shared by both and lives only as long as the drawer.
 */
export function EmailPreview({ html, title }: { html: string; title: string }) {
  const t = useTranslations("manageEmails.details");
  const tc = useTranslations("common.actions");
  const [screen, setScreen] = React.useState<Screen>("phone");
  const [full, setFull] = React.useState(false);

  const toggle = (
    <SegmentedControl
      label={t("previewOn")}
      value={screen}
      onValueChange={(v) => setScreen(v as Screen)}
      options={[
        { value: "phone", label: t("phone"), icon: Smartphone },
        { value: "desktop", label: t("desktop"), icon: Monitor },
      ]}
      className="w-auto"
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {toggle}
        <Button variant="outline" size="sm" onClick={() => setFull(true)}>
          <Maximize2 />
          {t("fullSize")}
        </Button>
      </div>
      <ScaledEmailFrame
        srcDoc={html}
        title={title}
        {...SCREEN[screen]}
        className="ring-rule mx-auto overflow-hidden rounded-lg ring-1"
      />
      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent
          closeLabel={tc("close")}
          aria-describedby={undefined}
          className="flex h-[92dvh] flex-col sm:h-[calc(100dvh-2rem)] sm:max-w-[min(1104px,calc(100vw-2rem))]"
        >
          <DialogHeader className="sm:pe-10">
            <DialogTitle className="truncate">
              <bdi>{title}</bdi>
            </DialogTitle>
          </DialogHeader>
          <div className="self-start">{toggle}</div>
          <div className="min-h-0 flex-1">
            <ScaledEmailFrame
              srcDoc={html}
              title={title}
              width={SCREEN[screen].width}
              fillHeight
              className="ring-rule mx-auto overflow-hidden rounded-lg ring-1"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

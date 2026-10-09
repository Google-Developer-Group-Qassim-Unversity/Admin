"use client";

import * as React from "react";
import { Download, ExternalLink, Eye, FileCode, FileText, Palette, type LucideIcon } from "lucide-react";

import { Plate } from "@/components/najdi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

interface AssetItem {
  key: string;
  type: "svg" | "html" | "figma";
  src?: string;
  iframeSrc?: string;
  icon: LucideIcon;
}

const assets: AssetItem[] = [
  { key: "officialAr", type: "svg", src: "/assets/emails/official-ar.svg", icon: Palette },
  { key: "officialEn", type: "svg", src: "/assets/emails/official-en.svg", icon: Palette },
  { key: "unofficialAr", type: "svg", src: "/assets/emails/unofficial-ar.svg", icon: Palette },
  { key: "unofficialEn", type: "svg", src: "/assets/emails/unofficial-en.svg", icon: Palette },
  { key: "certTemplate", type: "html", src: "/assets/emails/email_template.html", icon: FileCode },
  { key: "acceptanceTemplate", type: "html", src: "/acceptance-template.html", icon: FileCode },
  {
    key: "figma",
    type: "figma",
    iframeSrc:
      "https://embed.figma.com/design/ZkqcV5rTmycXTYU7uF2dc1/%D8%B4%D9%87%D8%A7%D8%AF%D8%A9?embed-host=share",
    icon: FileText,
  },
];

function PreviewDialog({
  open,
  onOpenChange,
  asset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetItem;
}) {
  const t = useTranslations("manageEmails.assets.items");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden p-0 sm:max-h-[85vh] sm:max-w-4xl">
        <DialogHeader className="px-5 pt-7 pb-3 sm:px-6 sm:pt-6">
          <DialogTitle>{t(`${asset.key}.name`)}</DialogTitle>
          <DialogDescription>{t(`${asset.key}.description`)}</DialogDescription>
        </DialogHeader>
        <div className="border-rule min-h-0 flex-1 border-t">
          {asset.type === "svg" && asset.src && (
            <div className="w-full h-full min-h-[50dvh] sm:min-h-[400px] bg-sunk flex items-center justify-center p-4 overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.src} alt={t(`${asset.key}.name`)} className="max-w-full max-h-full object-contain" />
            </div>
          )}
          {asset.type === "html" && asset.src && (
            <iframe src={asset.src} className="w-full h-full min-h-[60dvh] sm:min-h-[400px] border-0 bg-white" title={t(`${asset.key}.name`)} />
          )}
          {asset.type === "figma" && asset.iframeSrc && (
            <iframe
              src={asset.iframeSrc}
              className="w-full h-full min-h-[60dvh] sm:min-h-[400px] border-0"
                            title={t(`${asset.key}.name`)}
              allowFullScreen
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AssetsPanel() {
  const t = useTranslations("manageEmails.assets");
  const [previewAsset, setPreviewAsset] = React.useState<AssetItem | null>(null);

  const handleDownload = (asset: AssetItem) => {
    if (asset.type === "figma") {
      window.open(
        "https://www.figma.com/design/ZkqcV5rTmycXTYU7uF2dc1/%D8%B4%D9%87%D8%A7%D8%AF%D8%A9?m=auto&t=n8l7jamQplqs17Fk-1",
        "_blank",
      );
      return;
    }
    if (asset.src) {
      const link = document.createElement("a");
      link.href = asset.src;
      link.download = asset.src.split("/").pop() ?? asset.key;
      link.click();
    }
  };

  return (
    <>
      <section className="bg-card ring-rule flex flex-col gap-1 rounded-xl px-4 pt-3 pb-2 ring-1" aria-labelledby="email-assets-title">
        <h2 id="email-assets-title" className="border-foreground border-b pb-2 text-base font-bold">
          {t("title")}
        </h2>
        <ul className="flex flex-col">
          {assets.map((asset) => (
            <li key={asset.key} className="border-rule flex min-h-14 items-center gap-3 border-b py-2 last:border-b-0">
              <Plate tone="umber" size="sm" icon={asset.icon} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{t(`items.${asset.key}.name`)}</p>
                <p className="text-ink-2 truncate text-xs">{t(`items.${asset.key}.description`)}</p>
              </div>
              <div className="flex shrink-0 items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={t("preview")} onClick={() => setPreviewAsset(asset)}>
                      <Eye />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("preview")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={asset.type === "figma" ? t("openInFigma") : t("download")}
                      onClick={() => handleDownload(asset)}
                    >
                      {asset.type === "figma" ? <ExternalLink /> : <Download />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{asset.type === "figma" ? t("openInFigma") : t("download")}</TooltipContent>
                </Tooltip>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {previewAsset && (
        <PreviewDialog
          open={!!previewAsset}
          onOpenChange={(open) => {
            if (!open) setPreviewAsset(null);
          }}
          asset={previewAsset}
        />
      )}
    </>
  );
}

"use client";

import * as React from "react";
import { Download, Eye, FileCode, FileText, Palette } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

interface AssetItem {
  key: string;
  type: "svg" | "html" | "figma";
  src?: string;
  iframeSrc?: string;
  icon: React.ElementType;
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
      <DialogContent className="max-w-4xl! max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{t(`${asset.key}.name`)}</DialogTitle>
          <DialogDescription>{t(`${asset.key}.description`)}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 border-t">
          {asset.type === "svg" && asset.src && (
            <div className="w-full h-full min-h-[400px] bg-muted/30 flex items-center justify-center p-4 overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.src} alt={t(`${asset.key}.name`)} className="max-w-full max-h-full object-contain" />
            </div>
          )}
          {asset.type === "html" && asset.src && (
            <iframe src={asset.src} className="w-full h-full min-h-[400px] border-0" title={t(`${asset.key}.name`)} />
          )}
          {asset.type === "figma" && asset.iframeSrc && (
            <iframe
              src={asset.iframeSrc}
              className="w-full h-full min-h-[400px] border-0"
              style={{ border: "1px solid rgba(0, 0, 0, 0.1)" }}
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
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 p-2!">
          {assets.map((asset) => (
            <div
              key={asset.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <asset.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{t(`items.${asset.key}.name`)}</p>
                <p className="text-[10px] text-muted-foreground truncate">{t(`items.${asset.key}.description`)}</p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6"
                      onClick={() => setPreviewAsset(asset)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("preview")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6"
                      onClick={() => handleDownload(asset)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{asset.type === "figma" ? t("openInFigma") : t("download")}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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

'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

interface EventQrCodeDialogProps {
  url: string;
  eventName: string;
  trigger: React.ReactNode;
}

const DISPLAY_SIZE = 240;
// Rasterized well above display size so the exported PNG stays crisp
// when printed or viewed zoomed in, rather than just matching the screen.
const EXPORT_SIZE = 1024;

export function EventQrCodeDialog({ url, eventName, trigger }: EventQrCodeDialogProps) {
  const t = useTranslations('publishItem');
  const svgRef = useRef<SVGSVGElement>(null);

  // Rasterizing the SVG (rather than rendering straight to a canvas) avoids
  // the anti-aliased/blurry edges canvas fills get at arbitrary sizes -
  // the SVG path uses shapeRendering="crispEdges".
  const getExportBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const svg = svgRef.current;
      if (!svg) {
        resolve(null);
        return;
      }

      const svgString = new XMLSerializer().serializeToString(svg);
      const svgUrl = URL.createObjectURL(
        new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      );

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = EXPORT_SIZE;
        canvas.height = EXPORT_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(svgUrl);
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
        ctx.drawImage(image, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
        URL.revokeObjectURL(svgUrl);
        canvas.toBlob(resolve, 'image/png');
      };
      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        resolve(null);
      };
      image.src = svgUrl;
    });
  };

  const handleDownload = async () => {
    try {
      const blob = await getExportBlob();
      if (!blob) throw new Error('No QR code to export');

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${eventName || 'event'}-qr-code.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      toast.error(t('qrDownloadFailed'));
    }
  };

  const handleCopy = async () => {
    try {
      const blob = await getExportBlob();
      if (!blob) throw new Error('No QR code to export');

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      toast.success(t('qrCopied'));
    } catch {
      toast.error(t('qrCopyFailed'));
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('qrCodeTitle')}</DialogTitle>
          <DialogDescription>{t('qrCodeDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 bg-white rounded-xl">
          <QRCodeSVG ref={svgRef} value={url} size={DISPLAY_SIZE} level="M" marginSize={4} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
            {t('copyQrCode')}
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            {t('downloadQrCode')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { QRCodeCanvas } from 'qrcode.react';
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

export function EventQrCodeDialog({ url, eventName, trigger }: EventQrCodeDialogProps) {
  const t = useTranslations('publishItem');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getCanvasBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        resolve(null);
        return;
      }
      canvas.toBlob(resolve, 'image/png');
    });
  };

  const handleDownload = async () => {
    try {
      const blob = await getCanvasBlob();
      if (!blob) throw new Error('No canvas');

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
      const blob = await getCanvasBlob();
      if (!blob) throw new Error('No canvas');

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
          <QRCodeCanvas ref={canvasRef} value={url} size={240} level="M" includeMargin />
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

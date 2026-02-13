'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, Copy, QrCode, RefreshCw, Check, Timer, DoorClosed, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CloseEventModal } from '@/components/close-event-modal';
import type { Event } from '@/lib/api-types';

interface EventAttendanceTabProps {
  event: Event;
  onEventChange?: () => void;
}

interface TokenResponse {
  token: string;
  expiresAt: string;
  attendanceUrl: string;
}

const EXPIRATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
];

export function EventAttendanceTab({ event, onEventChange }: EventAttendanceTabProps) {
  const { getToken } = useAuth();
  const [expirationMinutes, setExpirationMinutes] = useState('30');
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // Calculate time remaining
  const updateTimeRemaining = useCallback(() => {
    if (!tokenData?.expiresAt) {
      setTimeRemaining(null);
      return;
    }

    const expiresAt = new Date(tokenData.expiresAt).getTime();
    const now = Date.now();
    const diff = expiresAt - now;

    if (diff <= 0) {
      setTimeRemaining('Expired');
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    } else if (minutes > 0) {
      setTimeRemaining(`${minutes}m ${seconds}s`);
    } else {
      setTimeRemaining(`${seconds}s`);
    }
  }, [tokenData?.expiresAt]);

  // Update countdown every second
  useEffect(() => {
    if (!tokenData) return;

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [tokenData, updateTimeRemaining]);

  const handleGenerateToken = async () => {
    setIsGenerating(true);

    try {
      const token = await getToken();
      const response = await fetch('/api/attendance/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          eventId: event.id,
          expirationMinutes: parseInt(expirationMinutes, 10),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate token');
      }

      const data: TokenResponse = await response.json();
      setTokenData(data);
      toast.success('Attendance link generated successfully');
      
      // Open fullscreen QR code in new tab
      const qrDisplayUrl = `/qr-display?url=${encodeURIComponent(data.attendanceUrl)}`;
      window.open(qrDisplayUrl, '_blank');
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error('Failed to generate attendance link', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!tokenData?.attendanceUrl) return;

    try {
      await navigator.clipboard.writeText(tokenData.attendanceUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');

      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleOpenFullscreen = () => {
    if (!tokenData?.attendanceUrl) return;

    const qrDisplayUrl = `/qr-display?url=${encodeURIComponent(tokenData.attendanceUrl)}`;
    window.open(qrDisplayUrl, '_blank');
  };

  const isExpired = timeRemaining === 'Expired';

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Attendance QR Code</CardTitle>
        <CardDescription>
          Generate a time-limited QR code for members to mark their attendance at this event.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* QR Code Display */}
          <div className="flex flex-col items-center justify-center">
            {tokenData && !isExpired ? (
              <div className="p-4 bg-white rounded-xl shadow-sm">
                <QRCodeSVG
                  value={tokenData.attendanceUrl}
                  size={240}
                  level="H"
                  includeMargin
                  imageSettings={{
                    src: "/gdg.ico",
                    height: 48,
                    width: 48,
                    excavate: true,
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-64 h-64 border-2 border-dashed border-muted-foreground/25 rounded-xl text-muted-foreground">
                <QrCode className="h-16 w-16 mb-3 opacity-40" />
                <p className="text-sm text-center px-4">
                  {isExpired
                    ? 'QR code has expired. Generate a new one.'
                    : 'Generate a QR code to start accepting attendance'}
                </p>
              </div>
            )}

            {/* Expiration countdown */}
            {tokenData && !isExpired && timeRemaining && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Expires in:</span>
                <span className="font-medium tabular-nums">{timeRemaining}</span>
              </div>
            )}

            {isExpired && (
              <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
                <Clock className="h-4 w-4" />
                <span>This QR code has expired</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-6">
            {/* Expiration Time Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Expiration Time</label>
              <Select
                value={expirationMinutes}
                onValueChange={setExpirationMinutes}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select expiration time" />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The QR code will expire after the selected duration.
              </p>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateToken}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : tokenData ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate QR Code
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4" />
                  Generate QR Code
                </>
              )}
            </Button>

            {/* Copy Link and Fullscreen Buttons */}
            {tokenData && !isExpired && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleOpenFullscreen}
                  className="flex-1"
                >
                  <Maximize2 className="h-4 w-4" />
                  Fullscreen
                </Button>
              </div>
            )}

            {/* Link Preview */}
            {tokenData && !isExpired && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Attendance Link</label>
                <div className="p-3 bg-muted rounded-lg text-xs font-mono break-all text-muted-foreground">
                  {tokenData.attendanceUrl}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Close Event Section - Only show for active events */}
        <div className="mt-8 pt-8 border-t">
          <Item variant="outline">
            <ItemMedia variant="image">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-muted">
                <DoorClosed className="w-6 h-6 text-muted-foreground" />
              </div>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Close Event</ItemTitle>
              <ItemDescription>
                When attendance is complete, close the event to finalize and optionally send certificates.
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                variant="outline"
                onClick={() => setIsCloseModalOpen(true)}
              >
                <DoorClosed className="h-4 w-4" />
                Close Event
              </Button>
            </ItemActions>
          </Item>
        </div>

        {/* Close Event Modal */}
        <CloseEventModal
          event={event}
          open={isCloseModalOpen}
          onOpenChange={setIsCloseModalOpen}
          onSuccess={onEventChange}
        />
      </CardContent>
    </Card>
  );
}

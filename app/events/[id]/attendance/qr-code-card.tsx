'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { QRCodeSVG } from 'qrcode.react';
import {
  Clock,
  Copy,
  QrCode,
  RefreshCw,
  Check,
  Timer,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  SlidersHorizontal,
  CalendarClock,
  ClipboardCheck,
  CopyX,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TokenResponse {
  token: string;
  expiresAt: string;
  attendanceUrl: string;
}

const EXPIRATION_OPTIONS = ['15', '30', '60', '120', '720', '1440'] as const;

function getTokenStorageKey(eventId: number): string {
  return `attendance-token-${eventId}`;
}

function getStoredToken(eventId: number): TokenResponse | null {
  try {
    const key = getTokenStorageKey(eventId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const data = JSON.parse(stored) as TokenResponse;
    if (!data.token || !data.expiresAt || !data.attendanceUrl) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error loading stored token:', error);
    return null;
  }
}

function saveToken(eventId: number, tokenData: TokenResponse): void {
  try {
    const key = getTokenStorageKey(eventId);
    localStorage.setItem(key, JSON.stringify(tokenData));
  } catch (error) {
    console.error('Error saving token to localStorage:', error);
  }
}

interface QRCodeCardProps {
  eventId: number;
  children?: React.ReactNode;
}

interface GuardToggleRowProps {
  id: string;
  icon: LucideIcon;
  label: string;
  helpText: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function GuardToggleRow({ id, icon: Icon, label, helpText, checked, onCheckedChange }: GuardToggleRowProps) {
  const t = useTranslations("attendance.qrCode");
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Label htmlFor={id} className="text-sm font-normal">
          {label}
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="sr-only">{t('whatDoesThisDo')}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{helpText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function QRCodeCard({ eventId, children }: QRCodeCardProps) {
  const t = useTranslations("attendance.qrCode");
  const { getToken } = useAuth();
  const [expirationMinutes, setExpirationMinutes] = useState('15');
  const [requireAttendanceTimeWindow, setRequireAttendanceTimeWindow] = useState(true);
  const [requireAttendanceRegistration, setRequireAttendanceRegistration] = useState(true);
  const [preventDuplicateDailyAttendance, setPreventDuplicateDailyAttendance] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = getStoredToken(eventId);
    if (storedToken) {
      setTokenData(storedToken);
    }
  }, [eventId]);

  const updateTimeRemaining = useCallback(() => {
    if (!tokenData?.expiresAt) {
      setTimeRemaining(null);
      return;
    }

    const expiresAt = new Date(tokenData.expiresAt).getTime();
    const now = Date.now();
    const diff = expiresAt - now;

    if (diff <= 0) {
      setTimeRemaining(t('expired'));
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      setTimeRemaining(t('timeParts.hms', { h: hours, m: minutes, s: seconds }));
    } else if (minutes > 0) {
      setTimeRemaining(t('timeParts.ms', { m: minutes, s: seconds }));
    } else {
      setTimeRemaining(t('timeParts.s', { s: seconds }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenData?.expiresAt]);

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
          eventId,
          expirationMinutes: parseInt(expirationMinutes, 10),
          requireAttendanceTimeWindow,
          requireAttendanceRegistration,
          preventDuplicateDailyAttendance,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('generateFailedGeneric'));
      }

      const data: TokenResponse = await response.json();
      setTokenData(data);
      saveToken(eventId, data);
      toast.success(t('tokenGenerated'));

      const qrDisplayUrl = `/qr-display?url=${encodeURIComponent(data.attendanceUrl)}`;
      window.open(qrDisplayUrl, '_blank');
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error(t('generateFailed'), {
        description: error instanceof Error ? error.message : t('unknownError'),
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
      toast.success(t('linkCopied'));

      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  const handleOpenFullscreen = () => {
    if (!tokenData?.attendanceUrl) return;

    const qrDisplayUrl = `/qr-display?url=${encodeURIComponent(tokenData.attendanceUrl)}`;
    window.open(qrDisplayUrl, '_blank');
  };

  const isExpired = timeRemaining === t('expired');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col items-center justify-center">
            {tokenData && !isExpired ? (
              <div className="p-4 bg-white rounded-xl shadow-sm">
                <QRCodeSVG
                  value={tokenData.attendanceUrl}
                  size={240}
                  level="H"
                  includeMargin
                  imageSettings={{
                    src: '/gdg.ico',
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
                    ? t('qrExpiredHint')
                    : t('generateHint')}
                </p>
              </div>
            )}

            {tokenData && !isExpired && timeRemaining && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('expiresIn')}</span>
                <span className="font-medium tabular-nums">{timeRemaining}</span>
              </div>
            )}

            {isExpired && (
              <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
                <Clock className="h-4 w-4" />
                <span>{t('expiredNotice')}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('expirationTime')}</label>
              <Select value={expirationMinutes} onValueChange={setExpirationMinutes}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectExpirationTime')} />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`expirationOptions.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('expirationHint')}
              </p>
            </div>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    {t('advancedRules')}
                  </span>
                  {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                <GuardToggleRow
                  id="require-time-window"
                  icon={CalendarClock}
                  label={t('timeWindow.label')}
                  helpText={t('timeWindow.help')}
                  checked={requireAttendanceTimeWindow}
                  onCheckedChange={setRequireAttendanceTimeWindow}
                />
                <GuardToggleRow
                  id="require-registration"
                  icon={ClipboardCheck}
                  label={t('registration.label')}
                  helpText={t('registration.help')}
                  checked={requireAttendanceRegistration}
                  onCheckedChange={setRequireAttendanceRegistration}
                />
                <GuardToggleRow
                  id="prevent-duplicate"
                  icon={CopyX}
                  label={t('duplicate.label')}
                  helpText={t('duplicate.help')}
                  checked={preventDuplicateDailyAttendance}
                  onCheckedChange={setPreventDuplicateDailyAttendance}
                />
              </CollapsibleContent>
            </Collapsible>

            <Button onClick={handleGenerateToken} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t('generating')}
                </>
              ) : tokenData ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {t('regenerate')}
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4" />
                  {t('generate')}
                </>
              )}
            </Button>

            {tokenData && !isExpired && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopyLink} className="flex-1">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      {t('copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      {t('copyLink')}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleOpenFullscreen} className="flex-1">
                  <ExternalLink className="h-4 w-4" />
                  {t('openInTab')}
                </Button>
              </div>
            )}

            {tokenData && !isExpired && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('attendanceLink')}</label>
                <div className="p-3 bg-muted rounded-lg text-xs font-mono break-all text-muted-foreground">
                  {tokenData.attendanceUrl}
                </div>
              </div>
            )}
          </div>
        </div>

        {children && <div className="mt-8 pt-8 border-t">{children}</div>}
      </CardContent>
    </Card>
  );
}

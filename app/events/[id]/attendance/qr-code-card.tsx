'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { QRCodeSVG } from 'qrcode.react';
import {
  Clock,
  Copy,
  QrCode,
  Camera,
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
import { SectionHead } from '@/components/najdi';
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
import { SegmentedControl } from '@/components/ui/segmented-control';

import { CameraScanPanel } from './camera-scan-panel';

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
  isMultiDay: boolean;
  dayCount: number;
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
    <div className="border-rule flex min-h-12 items-center justify-between gap-4 border-b py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-start gap-2 pointer-fine:items-center">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-2 pointer-fine:mt-0" />
        <div className="min-w-0">
          <Label htmlFor={id} className="text-sm font-bold">
            {label}
          </Label>
          {/* Tooltips need a hover; on touch the explanation is simply shown. */}
          <p className="mt-1 hidden text-[13px] text-ink-2 pointer-coarse:block">{helpText}</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-ink-2 hover:text-foreground pointer-coarse:hidden">
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

export function QRCodeCard({ eventId, isMultiDay, dayCount, children }: QRCodeCardProps) {
  const t = useTranslations("attendance.qrCode");
  const { getToken } = useAuth();
  const [mode, setMode] = useState<'qr' | 'camera'>('qr');
  const [scanDay, setScanDay] = useState('1');
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

  const modeToggle = (
    <SegmentedControl
      label={t('modeLabel')}
      value={mode}
      onValueChange={(value) => setMode(value as 'qr' | 'camera')}
      options={[
        { value: 'qr', label: <span className="whitespace-nowrap">{t('modeQr')}</span>, icon: QrCode },
        { value: 'camera', label: <span className="whitespace-nowrap">{t('modeCamera')}</span>, icon: Camera },
      ]}
      className="sm:w-auto"
    />
  );

  return (
    <section aria-labelledby="attendance-take" className="flex flex-col gap-4">
      <SectionHead id="attendance-take" title={t('title')} action={<div className="hidden sm:block">{modeToggle}</div>} />
      <p className="text-ink-2 -mt-2 text-[13.5px]">{t('description')}</p>
      <div>
        <div className="mb-5 sm:hidden">{modeToggle}</div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {mode === 'camera' ? (
            <CameraScanPanel
              eventId={eventId}
              isMultiDay={isMultiDay}
              selectedDay={scanDay}
              onDayChange={setScanDay}
              dayCount={dayCount}
            />
          ) : (
          <>
          <div className="flex flex-col items-center justify-center">
            {tokenData && !isExpired ? (
              // The QR sits on white in both themes: scanners need the contrast.
              <div className="w-full max-w-[20rem] rounded-xl bg-white p-3 ring-1 ring-rule sm:p-4 md:max-w-[17rem]">
                <QRCodeSVG
                  value={tokenData.attendanceUrl}
                  size={240}
                  className="block h-auto w-full"
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
              <div className="flex aspect-square w-full max-w-[20rem] flex-col items-center justify-center rounded-xl border border-dashed border-adobe text-ink-2 md:max-w-64">
                <QrCode className="mb-3 size-14" strokeWidth={1.25} />
                <p className="text-sm text-center px-4">
                  {isExpired
                    ? t('qrExpiredHint')
                    : t('generateHint')}
                </p>
              </div>
            )}

            {tokenData && !isExpired && timeRemaining && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Timer className="h-4 w-4 text-ink-2" />
                <span className="text-ink-2">{t('expiresIn')}</span>
                <span className="tabular font-bold text-door-ochre-ink">{timeRemaining}</span>
              </div>
            )}

            {isExpired && (
              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-door-madder-ink">
                <Clock className="h-4 w-4" />
                <span>{t('expiredNotice')}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5 md:gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold">{t('expirationTime')}</label>
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
              <p className="text-xs text-ink-2">
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

            <Button variant="ochre" size="lg" onClick={handleGenerateToken} disabled={isGenerating} className="h-12 w-full text-base">
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
                <label className="text-sm font-bold">{t('attendanceLink')}</label>
                {/* Click-to-copy, and `select-none` on purpose: hand-selecting this
                    wrapped URL is how truncated links get shared, and a link that
                    loses even one character no longer validates. */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  aria-label={t('copyLink')}
                  className="block w-full select-none rounded-lg bg-sunk p-3 text-start font-mono text-xs break-all text-ink-2 transition-colors hover:bg-rule/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {tokenData.attendanceUrl}
                  <span className="mt-2 flex items-center gap-1.5 font-sans text-xs text-ink-2">
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        {t('linkCopied')}
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        {t('clickToCopy')}
                      </>
                    )}
                  </span>
                </button>
              </div>
            )}
          </div>
          </>
          )}
        </div>

        {children && <div className="border-rule mt-6 border-t pt-6 md:mt-8 md:pt-8">{children}</div>}
      </div>
    </section>
  );
}

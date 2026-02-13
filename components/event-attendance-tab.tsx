'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { QRCodeSVG } from 'qrcode.react';
import {
  Clock,
  Copy,
  QrCode,
  RefreshCw,
  Check,
  Timer,
  DoorClosed,
  DoorOpen,
  Maximize2,
  Search,
  Users,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
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
import { useEventAttendance, useOpenEvent } from '@/hooks/use-event';
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

/**
 * Calculate the number of days an event spans.
 */
function getEventDayCount(event: Event): number {
  const start = new Date(event.start_datetime);
  const end = new Date(event.end_datetime);
  // Normalize to date-only (ignore time)
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Given a date string from the attendance API and the event start date,
 * compute which day number (1-based) this corresponds to.
 */
function getDayNumber(dateStr: string, eventStart: Date): number {
  const date = new Date(dateStr);
  const startDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = dateOnly.getTime() - startDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function EventAttendanceTab({ event, onEventChange }: EventAttendanceTabProps) {
  const { getToken } = useAuth();
  const [expirationMinutes, setExpirationMinutes] = useState('30');
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // Attendance state
  const [selectedDay, setSelectedDay] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isEventClosed = event.status === 'closed';
  const showAttendance = event.status === 'active' || event.status === 'closed';
  const dayCount = getEventDayCount(event);
  const isMultiDay = dayCount > 1;
  const eventStart = useMemo(() => new Date(event.start_datetime), [event.start_datetime]);

  // Attendance data
  const {
    data: attendanceData,
    isLoading: isLoadingAttendance,
    isFetching: isFetchingAttendance,
    refetch: refetchAttendance,
  } = useEventAttendance(event.id, selectedDay, getToken, showAttendance);

  // Open event mutation
  const openEventMutation = useOpenEvent(getToken);

  // Filtered attendance list (client-side name search)
  // Uses word-based matching: all words in the query must exist in the name
  const filteredAttendance = useMemo(() => {
    if (!attendanceData?.attendance) return [];
    if (!searchQuery.trim()) return attendanceData.attendance;

    const queryWords = searchQuery.trim().toLowerCase().split(/\s+/);
    return attendanceData.attendance.filter((record) => {
      const name = record.Members.name.toLowerCase();
      // All query words must be present in the name (in any order)
      return queryWords.every((word) => name.includes(word));
    });
  }, [attendanceData?.attendance, searchQuery]);

  // Build day selector options
  const dayOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    if (isMultiDay) {
      for (let i = 1; i <= dayCount; i++) {
        options.push({ value: String(i), label: `Day ${i}` });
      }
    }
    options.push({ value: 'all', label: 'All Days' });
    if (isMultiDay) {
      options.push({ value: 'exclusive_all', label: 'Attended All Days' });
    }
    return options;
  }, [dayCount, isMultiDay]);

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

  const handleOpenEvent = async () => {
    try {
      await openEventMutation.mutateAsync(event.id);
      toast.success('Event re-opened successfully');
      onEventChange?.();
    } catch (error) {
      toast.error('Failed to open event', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const isExpired = timeRemaining === 'Expired';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* QR Code Card */}
      <Card>
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

          {/* Close / Open Event Section */}
          <div className="mt-8 pt-8 border-t">
            <Item variant="outline">
              <ItemContent>
                <ItemTitle>
                  {isEventClosed ? 'Re-open Event' : 'Close Event'}
                </ItemTitle>
                <ItemDescription>
                  {isEventClosed
                    ? 'Re-open the event to resume accepting attendance.'
                    : 'When attendance is complete, close the event to finalize and optionally send certificates.'}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                {isEventClosed ? (
                  <Button
                    variant="outline"
                    onClick={handleOpenEvent}
                    disabled={openEventMutation.isPending}
                  >
                    {openEventMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <DoorOpen className="h-4 w-4" />
                        Open Event
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsCloseModalOpen(true)}
                  >
                    <DoorClosed className="h-4 w-4" />
                    Close Event
                  </Button>
                )}
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

      {/* Attendance List Card */}
      {showAttendance && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendance
                </CardTitle>
                <CardDescription>
                  Members who scanned the QR code and marked their attendance.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm h-7 px-3">
                {attendanceData?.attendance_count ?? 0} attendees
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* Day Selector */}
              {(isMultiDay || dayOptions.length > 1) && (
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Refresh */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetchAttendance()}
                disabled={isFetchingAttendance}
                title="Refresh attendance"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isFetchingAttendance ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>

            {/* Attendance List */}
            {isLoadingAttendance ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm">Loading attendance...</p>
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">
                  {searchQuery.trim()
                    ? 'No members match your search.'
                    : 'No attendance records yet.'}
                </p>
              </div>
            ) : (
              <>
                {/* Filtered count hint */}
                {searchQuery.trim() && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Showing {filteredAttendance.length} of{' '}
                    {attendanceData?.attendance_count ?? 0} attendees
                  </p>
                )}

                <ItemGroup>
                  {filteredAttendance.map((record) => {
                    const member = record.Members;
                    // Compute day numbers from dates
                    const dayNumbers = record.dates
                      .map((d) => getDayNumber(d, eventStart))
                      .sort((a, b) => a - b);

                    return (
                      <Item key={member.id} variant="outline" size="sm">
                        <ItemContent>
                          <ItemTitle>{member.name}</ItemTitle>
                          <ItemDescription>
                            {member.uni_id}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {/* Day badges - square shaped */}
                            {isMultiDay &&
                              dayNumbers.map((dayNum) => (
                                <Badge
                                  key={dayNum}
                                  variant="default"
                                  className="tabular-nums text-xs font-semibold px-2 h-7 w-7 flex items-center justify-center rounded-sm"
                                >
                                  {dayNum}
                                </Badge>
                              ))}
                          </div>
                        </ItemActions>
                      </Item>
                    );
                  })}
                </ItemGroup>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

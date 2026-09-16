"use client";

import * as React from "react";
import QrScanner from "qr-scanner";
import { toast } from "sonner";
import { Camera, CameraOff, CheckCircle2, Loader2, Volume2, VolumeX, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

import { useScanAttendance } from "@/hooks/use-event";
import { ApiRequestError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

/**
 * A card sitting in front of the camera gets decoded many times a second; ignore repeat decodes
 * of the same code within this window so we don't hammer the API. Kept just past FLASH_VISIBLE_MS
 * so a card held in view re-triggers (green, then yellow on every presentation after) rather than
 * going silent for seconds.
 */
const RESCAN_COOLDOWN_MS = 1200;
/** How long the pass/fail flash stays on screen before the camera is ready to read the next card. */
const FLASH_VISIBLE_MS = 700;
const MAX_LOG_ENTRIES = 8;

interface CameraScanPanelProps {
  eventId: number;
  isMultiDay: boolean;
  selectedDay: string;
  onDayChange: (day: string) => void;
  dayCount: number;
}

type ScanStatus = "marked" | "already_marked" | "error";

interface ScanEntry {
  id: string;
  status: ScanStatus;
  label: string;
}

type Flash = { status: ScanStatus; label: string } | null;

/** Wallet QR codes encode `https://.../p/{32-char hex uuid}`; pull the uuid out of whatever got decoded. */
function extractWalletUuid(raw: string): string | null {
  const match = raw.match(/[0-9a-f]{32}/i);
  return match ? match[0].toLowerCase() : null;
}

function playBeep(kind: "success" | "warning" | "error") {
  try {
    const AudioContextCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = kind === "success" ? 880 : kind === "warning" ? 600 : 300;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.22);
    oscillator.onended = () => void ctx.close();
  } catch {
    // Audio feedback is a nicety; scanning must keep working without it.
  }
}

/** Two grid cells (camera box + controls) meant to sit directly inside QRCodeCard's two-column grid. */
export function CameraScanPanel({ eventId, isMultiDay, selectedDay, onDayChange, dayCount }: CameraScanPanelProps) {
  const t = useTranslations("attendance.scan");

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const scannerRef = React.useRef<QrScanner | null>(null);
  const busyRef = React.useRef(false);
  const lastScanRef = React.useRef<{ code: string; at: number } | null>(null);
  const mutedRef = React.useRef(false);
  const flashTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isCameraOn, setIsCameraOn] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [entries, setEntries] = React.useState<ScanEntry[]>([]);
  const [flash, setFlash] = React.useState<Flash>(null);

  const scanMutation = useScanAttendance();

  React.useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const showFlash = React.useCallback((next: NonNullable<Flash>) => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlash(next);
    flashTimeoutRef.current = setTimeout(() => setFlash(null), FLASH_VISIBLE_MS);
  }, []);

  const addEntry = React.useCallback((entry: Omit<ScanEntry, "id">) => {
    setEntries((prev) => [{ ...entry, id: `${Date.now()}-${Math.random()}` }, ...prev].slice(0, MAX_LOG_ENTRIES));
  }, []);

  const handleDecoded = React.useCallback(
    async (decodedText: string) => {
      const uuid = extractWalletUuid(decodedText);
      if (!uuid) return;

      const now = Date.now();
      if (lastScanRef.current?.code === uuid && now - lastScanRef.current.at < RESCAN_COOLDOWN_MS) {
        return;
      }
      if (busyRef.current) return;

      busyRef.current = true;
      lastScanRef.current = { code: uuid, at: now };

      try {
        const day = isMultiDay ? parseInt(selectedDay, 10) : undefined;
        const result = await scanMutation.mutateAsync({ eventId, uuid, day });
        const status: ScanStatus = result.status === "marked" ? "marked" : "already_marked";
        if (!mutedRef.current) playBeep(status === "marked" ? "success" : "warning");
        showFlash({ status, label: result.member_name });
        addEntry({ status, label: result.member_name });
      } catch (error) {
        if (!mutedRef.current) playBeep("error");
        const label =
          error instanceof ApiRequestError && error.isNotFound
            ? t("notFound")
            : error instanceof Error
              ? error.message
              : t("notFound");
        showFlash({ status: "error", label });
        addEntry({ status: "error", label });
      } finally {
        busyRef.current = false;
      }
    },
    [addEntry, eventId, isMultiDay, scanMutation, selectedDay, showFlash, t]
  );

  const handleDecodedRef = React.useRef(handleDecoded);
  React.useEffect(() => {
    handleDecodedRef.current = handleDecoded;
  }, [handleDecoded]);

  const stopCamera = React.useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setIsCameraOn(false);
  }, []);

  const startCamera = React.useCallback(async () => {
    if (!videoRef.current) return;
    setIsStarting(true);
    try {
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          void handleDecodedRef.current(result.data);
        },
        {
          preferredCamera: "environment",
          maxScansPerSecond: 10,
          highlightScanRegion: false,
          highlightCodeOutline: false,
          returnDetailedScanResult: true,
        }
      );
      scannerRef.current = scanner;
      await scanner.start();

      // Best-effort continuous autofocus (Chrome/Android exposes this; iOS Safari does not
      // expose any focus control to the web, so this silently no-ops there).
      try {
        const track = (videoRef.current.srcObject as MediaStream | null)?.getVideoTracks()[0];
        await track?.applyConstraints({
          advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
        });
      } catch {
        // Not supported on this browser/device.
      }

      setIsCameraOn(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t("cameraStartFailed", { error: message }));
      scannerRef.current?.destroy();
      scannerRef.current = null;
    } finally {
      setIsStarting(false);
    }
  }, [t]);

  const toggleCamera = () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      void startCamera();
    }
  };

  React.useEffect(() => {
    return () => {
      stopCamera();
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex flex-col items-center justify-center">
        <div className="relative w-64 h-64 rounded-xl overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/25">
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />

          {!isCameraOn && !isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
              <Camera className="h-16 w-16 mb-3 opacity-40" />
              <p className="text-sm text-center px-4">{t("hint")}</p>
            </div>
          )}

          <div
            className={cn(
              "absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-4 text-center transition-opacity duration-100",
              flash ? "opacity-100" : "opacity-0 pointer-events-none",
              flash?.status === "marked" && "bg-primary/95 text-primary-foreground",
              flash?.status === "already_marked" && "bg-amber-500/95 text-white",
              flash?.status === "error" && "bg-destructive/95 text-white"
            )}
          >
            {flash?.status === "error" ? (
              <XCircle className="h-12 w-12" />
            ) : (
              <CheckCircle2 className="h-12 w-12" />
            )}
            <p className="font-semibold leading-tight break-words">{flash?.label}</p>
            {flash?.status === "already_marked" && (
              <p className="text-xs opacity-90">{t("alreadyMarkedLabel")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {isMultiDay && (
          <Select value={selectedDay} onValueChange={onDayChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {t("day", { number: day })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button onClick={toggleCamera} disabled={isStarting} className="w-full">
          {isStarting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isCameraOn ? (
            <CameraOff className="h-4 w-4" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {isCameraOn ? t("stopCamera") : t("startCamera")}
        </Button>

        <Button variant="outline" onClick={() => setMuted((prev) => !prev)} className="w-full">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {muted ? t("unmute") : t("mute")}
        </Button>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("scanCount", { count: entries.length })}</p>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noScansYet")}</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  {entry.status === "marked" && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  {entry.status === "already_marked" && (
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  {entry.status === "error" && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                  <span className="truncate">{entry.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

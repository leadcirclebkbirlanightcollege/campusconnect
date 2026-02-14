import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { toast } from "sonner";
import { CameraOff, Loader2, CheckCircle2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToken: (token: string) => void;
};

type ScanState = "warming" | "ready" | "scanning" | "success" | "error";

function extractToken(text: string) {
  try {
    const u = new URL(text);
    const t = u.searchParams.get("token");
    return t ?? text;
  } catch {
    return text;
  }
}

function pickCameraDeviceId(
  devices: MediaDeviceInfo[],
  preference: "auto" | "front" | "back" | string,
) {
  if (!devices.length) return undefined;

  if (preference && preference !== "auto" && preference !== "front" && preference !== "back") {
    const exact = devices.find((d) => d.deviceId === preference);
    return (exact ?? devices[0]).deviceId;
  }

  const wantFront = preference === "front";
  const wantBack = preference === "back";

  const back = devices.find((d) => /back|rear|environment/i.test(d.label));
  const front = devices.find((d) => /front|user|face/i.test(d.label));

  if (wantBack) return (back ?? devices[0]).deviceId;
  if (wantFront) return (front ?? devices[0]).deviceId;

  return (back ?? devices[0]).deviceId;
}

export default function QrScannerDialog({ open, onOpenChange, onToken }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanLockRef = useRef(false);
  const lastScanTimeRef = useRef(0);
  const controlsRef = useRef<IScannerControls | null>(null);
  
  const [scanState, setScanState] = useState<ScanState>("warming");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraChoice, setCameraChoice] = useState<"auto" | "front" | "back" | string>("auto");
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [manualToken, setManualToken] = useState("");
  const [showDebug, setShowDebug] = useState(false);

  const cameraSupport = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const isSecure = typeof window !== "undefined" && (window.isSecureContext || window.location.protocol === "https:");
  const isInIframe = typeof window !== "undefined" && window.top !== window.self;

  const canAttemptCamera = cameraSupport && isSecure;

  const deviceLabelSupport = useMemo(() => {
    return devices.some((d) => (d.label ?? "").trim().length > 0);
  }, [devices]);

  // Full stream cleanup helper
  const stopAllStreams = useCallback(() => {
    try { controlsRef.current?.stop(); } catch { /* ignore */ }
    controlsRef.current = null;
    // Also stop any tracks on the video element directly
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleScanResult = useCallback((token: string) => {
    // 5-second duplicate scan lock
    const now = Date.now();
    if (now - lastScanTimeRef.current < 5000) return;
    if (scanLockRef.current) return;
    
    scanLockRef.current = true;
    lastScanTimeRef.current = now;
    
    setScanState("success");
    stopAllStreams();
    
    setTimeout(() => {
      onOpenChange(false);
      onToken(token);
    }, 300);
  }, [onOpenChange, onToken, stopAllStreams]);

  const handleUseToken = useCallback(() => {
    const token = extractToken(manualToken).trim();
    if (token.length < 10) {
      toast.error("Please paste a valid token");
      return;
    }
    handleScanResult(token);
  }, [manualToken, handleScanResult]);

  useEffect(() => {
    if (open) {
      scanLockRef.current = false;
      setScanState("warming");
      setCameraError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!canAttemptCamera) {
      setPermissionState("unknown");
      return;
    }

    let cancelled = false;

    async function check() {
      const perms: any = (navigator as any).permissions;
      if (!perms?.query) {
        setPermissionState("unknown");
        return;
      }

      try {
        const status = await perms.query({ name: "camera" as any });
        if (cancelled) return;
        setPermissionState(status.state ?? "unknown");
        status.onchange = () => {
          setPermissionState((status.state ?? "unknown") as any);
        };
      } catch {
        setPermissionState("unknown");
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [open, canAttemptCamera]);

  useEffect(() => {
    if (!open) return;
    if (!cameraSupport || !isSecure) {
      setScanState("error");
      setCameraError(!isSecure ? "Camera requires HTTPS." : "Camera not supported on this device/browser.");
      return;
    }

    setCameraError(null);
    setScanState("warming");

    const codeReader = new BrowserMultiFormatReader();
    let stopped = false;
    let startTimer: number | null = null;

    async function start() {
      try {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
          stream.getTracks().forEach((t) => t.stop());
        } catch (e: any) {
          if (e?.name === "NotAllowedError") {
            setPermissionState("denied");
            setCameraError("Camera permission denied. Please allow camera access and try again.");
            setScanState("error");
            return;
          }
        }

        const list = await BrowserMultiFormatReader.listVideoInputDevices();
        setDevices(list);

        if (!list.length) {
          setCameraError("No camera devices found.");
          setScanState("error");
          return;
        }

        const deviceId = pickCameraDeviceId(list, cameraChoice);

        if (!videoRef.current) throw new Error("Video element not ready");

        startTimer = window.setTimeout(() => {
          if (!stopped) {
            setCameraError(
              "Camera is taking too long to start. Try switching cameras or use the token fallback.",
            );
          }
        }, 4500);

        setScanState("ready");

        controlsRef.current = await codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
          if (stopped || scanLockRef.current) return;

          if (result) {
            const raw = result.getText();
            const token = extractToken(raw).trim();
            if (token.length < 10) {
              toast.error("QR did not contain a valid token");
              return;
            }

            handleScanResult(token);
          }
        });

        setScanState("scanning");
      } catch (e: any) {
        console.error("QR scanner start failed", e);
        setScanState("error");
        setCameraError(
          e?.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access and try again."
            : "Camera unavailable. Please allow camera permission and try switching camera or using token fallback.",
        );
        toast.error("Camera unavailable. Use the token/OTP fallback if needed.");
      }
    }

    start();

    return () => {
      stopped = true;
      if (startTimer) window.clearTimeout(startTimer);
      stopAllStreams();
      setScanState("warming");
    };
  }, [open, cameraChoice, cameraSupport, isSecure, handleScanResult]);

  const isActive = scanState === "scanning" || scanState === "ready";
  const isSuccess = scanState === "success";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>
            Point your camera at the lecture QR code. We'll capture the token automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isSuccess && (
            <div className="rounded-xl border border-success/30 bg-success/10 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <div>
                <div className="font-semibold text-success">QR Scanned!</div>
                <div className="text-sm text-muted-foreground">Processing your attendance...</div>
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <label className="text-sm font-medium">Paste token (fallback)</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste token from QR / link"
                autoComplete="off"
                disabled={isSuccess}
              />
              <Button type="button" onClick={handleUseToken} className="shrink-0" disabled={isSuccess}>
                Use token
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this when the camera is blocked or when scanning fails.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDebug((v) => !v)}
            className="text-left text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            {showDebug ? "Hide" : "Show"} camera debug
          </button>

          {showDebug ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              <div className="grid gap-1">
                <div>
                  <span className="font-medium">Secure context:</span> {String(isSecure)}
                </div>
                <div>
                  <span className="font-medium">In iframe:</span> {String(isInIframe)}
                </div>
                <div>
                  <span className="font-medium">getUserMedia support:</span> {String(cameraSupport)}
                </div>
                <div>
                  <span className="font-medium">Permission:</span> {permissionState}
                </div>
                <div>
                  <span className="font-medium">Camera choice:</span> {cameraChoice}
                </div>
                <div>
                  <span className="font-medium">Scan state:</span> {scanState}
                </div>
                <div>
                  <span className="font-medium">Devices:</span> {devices.length}
                  {!deviceLabelSupport ? " (labels hidden until permission granted)" : null}
                </div>
              </div>
              {devices.length ? (
                <div className="mt-2 space-y-1">
                  {devices.map((d, idx) => (
                    <div key={d.deviceId} className="truncate">
                      {idx + 1}. {(d.label ?? "").trim() || "(no label)"} — {d.deviceId}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {devices.length > 1 ? (
            <div className="space-y-1">
              <label className="text-sm font-medium">Camera</label>
              <select
                value={cameraChoice}
                onChange={(e) => setCameraChoice(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isSuccess}
              >
                <option value="auto">Auto (recommended)</option>
                <option value="back">Back camera</option>
                <option value="front">Front camera</option>
                <optgroup label="Devices">
                  {devices.map((d, idx) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label?.trim() ? d.label : `Camera ${idx + 1}`}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-xs text-muted-foreground">
                If scanning fails, switch between back/front (or pick a specific device).
              </p>
            </div>
          ) : null}

          <div className="relative overflow-hidden rounded-lg border border-border/60 bg-muted/20">
            <video
              ref={videoRef}
              className="h-[320px] w-full object-cover"
              muted
              playsInline
              autoPlay
            />
            {!isActive && !isSuccess ? (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground bg-muted/80">
                <div className="flex flex-col items-center gap-2 text-center p-4">
                  {scanState === "warming" ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-sm font-medium">Starting camera...</span>
                      <span className="text-xs">This may take a moment on first use</span>
                    </>
                  ) : (
                    <>
                      <CameraOff className="h-6 w-6" />
                      <span className="text-sm">Camera unavailable</span>
                      {cameraError ? (
                        <span className="max-w-[28rem] text-xs text-muted-foreground">{cameraError}</span>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          stopAllStreams();
                          setScanState("warming");
                          setCameraError(null);
                          setCameraChoice((c) => c === "auto" ? "back" : "auto");
                        }}
                      >
                        Retry Camera
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : null}
            {isActive && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <div className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  Scanning...
                </div>
              </div>
            )}
            {isSuccess && (
              <div className="absolute inset-0 grid place-items-center bg-success/20">
                <div className="flex flex-col items-center gap-2 text-center">
                  <CheckCircle2 className="h-12 w-12 text-success" />
                  <span className="text-lg font-semibold text-success">Success!</span>
                </div>
              </div>
            )}
          </div>

          {!cameraSupport || !isSecure ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
              Camera scanning requires HTTPS and camera permission on your device.
            </div>
          ) : isInIframe ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
              If the camera doesn't open in the preview, try the published app in a new tab (some previews block camera).
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {isSuccess ? "Close" : "Cancel"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

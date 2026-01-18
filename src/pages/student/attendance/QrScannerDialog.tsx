import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { toast } from "sonner";
import { CameraOff } from "lucide-react";

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

function extractToken(text: string) {
  // Accept either raw token or URL with ?token=
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

  // Explicit device id
  if (preference && preference !== "auto" && preference !== "front" && preference !== "back") {
    const exact = devices.find((d) => d.deviceId === preference);
    return (exact ?? devices[0]).deviceId;
  }

  const wantFront = preference === "front";
  const wantBack = preference === "back";

  // Prefer back/rear camera when labels are available (after permission)
  const back = devices.find((d) => /back|rear|environment/i.test(d.label));
  const front = devices.find((d) => /front|user|face/i.test(d.label));

  if (wantBack) return (back ?? devices[0]).deviceId;
  if (wantFront) return (front ?? devices[0]).deviceId;

  // auto
  return (back ?? devices[0]).deviceId;
}

export default function QrScannerDialog({ open, onOpenChange, onToken }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [active, setActive] = useState(false);
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
    // labels are usually empty until permission is granted
    return devices.some((d) => (d.label ?? "").trim().length > 0);
  }, [devices]);

  const handleUseToken = () => {
    const token = extractToken(manualToken).trim();
    if (token.length < 10) {
      toast.error("Please paste a valid token");
      return;
    }
    onOpenChange(false);
    onToken(token);
  };

  useEffect(() => {
    if (!open) return;
    if (!canAttemptCamera) {
      setPermissionState("unknown");
      return;
    }

    let cancelled = false;

    async function check() {
      // Permissions API isn't supported everywhere (notably iOS Safari).
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
      setActive(false);
      setCameraError(!isSecure ? "Camera requires HTTPS." : "Camera not supported on this device/browser.");
      return;
    }

    setCameraError(null);

    const codeReader = new BrowserMultiFormatReader();
    let stopped = false;
    let controls: IScannerControls | null = null;
    let startTimer: number | null = null;

    async function start() {
      try {
        setActive(true);

        // Permission warm-up so labels become available.
        // Important: stop tracks immediately so we don't block ZXing from opening the camera.
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
            setActive(false);
            return;
          }
          // otherwise continue; ZXing may still succeed
        }

        const list = await BrowserMultiFormatReader.listVideoInputDevices();
        setDevices(list);

        if (!list.length) {
          setCameraError("No camera devices found.");
          setActive(false);
          return;
        }

        const deviceId = pickCameraDeviceId(list, cameraChoice);

        if (!videoRef.current) throw new Error("Video element not ready");

        // If camera doesn't start quickly, show fallback help.
        startTimer = window.setTimeout(() => {
          if (!stopped) {
            setCameraError(
              "Camera is taking too long to start. Try switching cameras, allowing permission, or use the token fallback.",
            );
          }
        }, 4500);

        controls = await codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
          if (stopped) return;

          if (result) {
            const raw = result.getText();
            const token = extractToken(raw).trim();
            if (token.length < 10) {
              toast.error("QR did not contain a valid token");
              return;
            }

            stopped = true;
            try {
              controls?.stop();
            } catch {
              // ignore
            }
            setActive(false);
            onOpenChange(false);
            onToken(token);
          }
        });
      } catch (e: any) {
        console.error("QR scanner start failed", e);
        setActive(false);
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
      try {
        controls?.stop();
      } catch {
        // ignore
      }
      setActive(false);
    };
  }, [open, cameraChoice, onOpenChange, onToken, cameraSupport, isSecure, setPermissionState]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>
            Point your camera at the lecture QR code. We’ll capture the token automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <label className="text-sm font-medium">Paste token (fallback)</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste token from QR / link"
                autoComplete="off"
              />
              <Button type="button" onClick={handleUseToken} className="shrink-0">
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
              className="h-[360px] w-full object-cover"
              muted
              playsInline
              autoPlay
            />
            {!active ? (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2 text-center">
                  <CameraOff className="h-6 w-6" />
                  <span className="text-sm">Starting camera…</span>
                  {cameraError ? (
                    <span className="max-w-[28rem] text-xs text-muted-foreground">{cameraError}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {!cameraSupport || !isSecure ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
              Camera scanning requires HTTPS and camera permission on your device.
            </div>
          ) : isInIframe ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
              If the camera doesn’t open in the preview, try the published app in a new tab (some previews block camera).
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

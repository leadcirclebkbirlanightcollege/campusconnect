import { useEffect, useRef, useState } from "react";
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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraChoice, setCameraChoice] = useState<"auto" | "front" | "back" | string>("auto");

  const cameraSupport = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const isSecure = typeof window !== "undefined" && (window.isSecureContext || window.location.protocol === "https:");
  const isInIframe = typeof window !== "undefined" && window.top !== window.self;

  useEffect(() => {
    if (!open) return;
    if (!cameraSupport || !isSecure) {
      setActive(false);
      return;
    }

    const codeReader = new BrowserMultiFormatReader();
    let stopped = false;
    let controls: IScannerControls | null = null;

    async function start() {
      try {
        setActive(true);

        // Ask for permission first so device labels become available on many browsers.
        // This also helps avoid "camera not starting" situations on mobile.
        try {
          await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
        } catch {
          // We'll still try to start via ZXing; if it fails we show a toast below.
        }

        const list = await BrowserMultiFormatReader.listVideoInputDevices();
        setDevices(list);
        const deviceId = pickCameraDeviceId(list, cameraChoice);

        if (!videoRef.current) throw new Error("Video element not ready");

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
      } catch (_e) {
        setActive(false);
        toast.error(
          "Camera unavailable. Please allow camera permission and use HTTPS (or try the token/OTP fallback).",
        );
      }
    }

    start();

    return () => {
      stopped = true;
      try {
        controls?.stop();
      } catch {
        // ignore
      }
      setActive(false);
    };
  }, [open, cameraChoice, onOpenChange, onToken]);

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
                <div className="flex flex-col items-center gap-2">
                  <CameraOff className="h-6 w-6" />
                  <span className="text-sm">Starting camera…</span>
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

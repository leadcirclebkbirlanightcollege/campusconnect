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

export default function QrScannerDialog({ open, onOpenChange, onToken }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!open) return;

    const codeReader = new BrowserMultiFormatReader();
    let stopped = false;
    let controls: IScannerControls | null = null;

    async function start() {
      try {
        setActive(true);

        controls = await codeReader.decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
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
            return;
          }

          // Most scan cycles produce errors while searching frames; ignore them.
          if (err) {
            // keep quiet unless debugging
          }
        });
      } catch (_e) {
        setActive(false);
        toast.error("Camera permission denied or unavailable");
      }
    }

    // Start scanner
    if (videoRef.current) start();

    return () => {
      stopped = true;
      try {
        controls?.stop();
      } catch {
        // ignore
      }
      setActive(false);
    };
  }, [open, onOpenChange, onToken]);

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
          <div className="relative overflow-hidden rounded-lg border border-border/60 bg-muted/20">
            <video ref={videoRef} className="h-[360px] w-full object-cover" muted playsInline />
            {!active ? (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <CameraOff className="h-6 w-6" />
                  <span className="text-sm">Starting camera…</span>
                </div>
              </div>
            ) : null}
          </div>

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

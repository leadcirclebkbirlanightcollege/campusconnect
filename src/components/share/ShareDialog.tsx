import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Share2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Calendar,
  FileText,
  ClipboardList,
  Megaphone,
  Award,
  Users,
  Sparkles,
} from "@/components/icons";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export type ShareEntityType =
  | "event"
  | "note"
  | "assignment"
  | "exam"
  | "announcement"
  | "club"
  | "result"
  | "general";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | null;
  url: string;
  entityType?: ShareEntityType;
  imageUrl?: string | null;
}

const TYPE_CONFIG: Record<
  ShareEntityType,
  { label: string; icon: any; colorClass: string }
> = {
  event: {
    label: "Event",
    icon: Calendar,
    colorClass: "bg-primary/10 text-primary border-primary/20",
  },
  note: {
    label: "Study Material",
    icon: FileText,
    colorClass: "bg-info/10 text-info border-info/20",
  },
  assignment: {
    label: "Assignment",
    icon: ClipboardList,
    colorClass: "bg-warning/10 text-warning border-warning/20",
  },
  exam: {
    label: "Exam",
    icon: Award,
    colorClass: "bg-danger/10 text-danger border-danger/20",
  },
  announcement: {
    label: "Announcement",
    icon: Megaphone,
    colorClass: "bg-primary/10 text-primary border-primary/20",
  },
  club: {
    label: "Community",
    icon: Users,
    colorClass: "bg-success/10 text-success border-success/20",
  },
  result: {
    label: "Academic Result",
    icon: Sparkles,
    colorClass: "bg-premium/10 text-premium border-premium/20",
  },
  general: {
    label: "Campus Connect",
    icon: Share2,
    colorClass: "bg-surface-3 text-foreground border-border-subtle",
  },
};

export default function ShareDialog({
  open,
  onOpenChange,
  title,
  description,
  url,
  entityType = "general",
  imageUrl,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Guarantee canonical absolute URL
  const canonicalUrl = useMemo(() => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://campusconnect.indevs.in";
    return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
  }, [url]);

  const config = TYPE_CONFIG[entityType] || TYPE_CONFIG.general;
  const TypeIcon = config.icon;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(canonicalUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = canonicalUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = canonicalUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        toast.success("Link copied");
        setTimeout(() => setCopied(false), 2500);
      } catch {
        toast.error("Failed to copy link");
      }
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url: canonicalUrl,
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          toast.error("Sharing failed");
        }
      }
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const encodedUrl = encodeURIComponent(canonicalUrl);
  const encodedTitle = encodeURIComponent(title);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md p-0 gap-0 overflow-hidden bg-card border-border-subtle rounded-3xl shadow-xl">
        <DialogHeader className="p-5 pb-4 border-b border-border-subtle bg-surface-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Share2 className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Share {config.label}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Send this direct link to classmates & colleagues
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className={cn("text-[11px] font-medium capitalize", config.colorClass)}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Entity preview card */}
          <div className="flex items-start gap-3 rounded-2xl border border-border-subtle bg-surface-2/60 p-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="h-14 w-14 rounded-xl object-cover shrink-0 border border-border-subtle"
                loading="lazy"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-3 text-muted-foreground shrink-0 border border-border-subtle">
                <TypeIcon className="h-6 w-6 opacity-70" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground line-clamp-1">{title}</p>
              {description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
              )}
            </div>
          </div>

          {/* Copyable URL input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Canonical Link</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={canonicalUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="h-11 pr-3 text-xs bg-surface-1 rounded-xl font-mono truncate"
                />
              </div>
              <Button
                onClick={handleCopy}
                className={cn(
                  "h-11 px-4 gap-1.5 rounded-xl font-semibold transition-all shrink-0",
                  copied ? "bg-success text-success-foreground hover:bg-success" : ""
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Social quick share links */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Quick Share</p>
            <div className="grid grid-cols-4 gap-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl border border-border-subtle bg-surface-1 hover:bg-surface-2 transition-colors group text-center"
              >
                <div className="h-8 w-8 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center">
                  <ExternalLink className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-medium text-foreground">WhatsApp</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl border border-border-subtle bg-surface-1 hover:bg-surface-2 transition-colors group text-center"
              >
                <div className="h-8 w-8 rounded-full bg-[#1DA1F2]/15 text-[#1DA1F2] flex items-center justify-center">
                  <ExternalLink className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-medium text-foreground">X (Twitter)</span>
              </a>

              <a
                href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl border border-border-subtle bg-surface-1 hover:bg-surface-2 transition-colors group text-center"
              >
                <div className="h-8 w-8 rounded-full bg-[#0088cc]/15 text-[#0088cc] flex items-center justify-center">
                  <ExternalLink className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-medium text-foreground">Telegram</span>
              </a>

              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl border transition-colors group text-center",
                  showQr
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border-subtle bg-surface-1 hover:bg-surface-2 text-foreground"
                )}
              >
                <div className="h-8 w-8 rounded-full bg-surface-3 flex items-center justify-center text-foreground">
                  <QrCode className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-medium">QR Code</span>
              </button>
            </div>
          </div>

          {/* QR Code view */}
          {showQr && (
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-neutral-900 border border-border-subtle rounded-2xl space-y-2">
              <QRCodeSVG
                value={canonicalUrl}
                size={180}
                level="H"
                includeMargin={false}
                className="rounded-lg p-1 bg-white"
              />
              <p className="text-[11px] text-muted-foreground text-center">
                Scan with any camera to open directly
              </p>
            </div>
          )}

          {/* Native Web Share action button (on mobile / supported desktop) */}
          {hasNativeShare && (
            <Button
              variant="outline"
              onClick={handleNativeShare}
              className="w-full h-11 rounded-xl gap-2 font-medium"
            >
              <Share2 className="h-4 w-4 text-primary" />
              More sharing options...
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

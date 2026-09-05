import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "@/components/icons";
import ShareDialog, { ShareEntityType } from "./ShareDialog";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  description?: string | null;
  url: string;
  entityType?: ShareEntityType;
  imageUrl?: string | null;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
  showText?: boolean;
  text?: string;
  preferDialog?: boolean;
}

export default function ShareButton({
  title,
  description,
  url,
  entityType = "general",
  imageUrl,
  variant = "outline",
  size = "sm",
  className,
  children,
  showText = true,
  text = "Share",
  preferDialog = false,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  // Absolute canonical link
  const canonicalUrl = (() => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://campusconnect.indevs.in";
    return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
  })();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!preferDialog && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url: canonicalUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === "AbortError") {
          return; // User canceled native share, don't open dialog
        }
        // If native share threw an error, fallback to custom ShareDialog
      }
    }

    setOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        className={cn("gap-1.5 transition-colors", className)}
        aria-label={`Share ${title}`}
      >
        {children ? (
          children
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5" />
            {showText && <span>{text}</span>}
          </>
        )}
      </Button>

      <ShareDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        url={canonicalUrl}
        entityType={entityType}
        imageUrl={imageUrl}
      />
    </>
  );
}

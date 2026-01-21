import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export default function LiveBadge({ className }: Props) {
  return (
    <Badge variant="destructive" className={cn("gap-1.5", className)}>
      <span className="h-2 w-2 rounded-full bg-destructive-foreground pulse" aria-hidden="true" />
      LIVE
    </Badge>
  );
}

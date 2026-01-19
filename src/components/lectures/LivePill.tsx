import { Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type Props = {
  className?: string;
};

export default function LivePill({ className }: Props) {
  return (
    <Badge variant="destructive" className={`gap-1 animate-pulse ${className ?? ""}`.trim()}>
      <Radio className="h-3.5 w-3.5" />
      LIVE
    </Badge>
  );
}

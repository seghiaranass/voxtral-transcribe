import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Status badge for a transcription: processing | done | error.
export function StatusBadge({ status }: { status: string }) {
  if (status === "done") {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Done
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="outline" className="gap-1 border-destructive/30 text-destructive">
        <AlertCircle className="h-3.5 w-3.5" />
        Error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("gap-1 text-muted-foreground")}>
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Processing
    </Badge>
  );
}

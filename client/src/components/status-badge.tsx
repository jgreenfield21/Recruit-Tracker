import { Badge } from "@/components/ui/badge";
import type { CoachStatus } from "@shared/schema";

const statusConfig: Record<CoachStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_contacted: { label: "Not Contacted", variant: "outline" },
  contacted: { label: "Contacted", variant: "default" },
  awaiting_response: { label: "Awaiting Response", variant: "secondary" },
  follow_up_needed: { label: "Follow-up Needed", variant: "destructive" },
  responded: { label: "Responded", variant: "default" },
};

interface StatusBadgeProps {
  status: CoachStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.not_contacted;
  
  return (
    <Badge variant={config.variant} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}

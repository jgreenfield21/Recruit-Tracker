import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12" data-testid="loading-state">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-4" data-testid="loading-skeleton">
      <div className="h-8 bg-muted rounded-md animate-pulse w-1/3" />
      <div className="h-32 bg-muted rounded-md animate-pulse" />
      <div className="h-32 bg-muted rounded-md animate-pulse" />
    </div>
  );
}

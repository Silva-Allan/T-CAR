import { cn } from '@/lib/utils';

interface RepIndicatorProps {
  currentRep: number;
  totalReps: number;
  phase: 'idle' | 'going' | 'returning';
}

export function RepIndicator({ currentRep, totalReps, phase }: RepIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Rep dots */}
      <div className="flex gap-2">
        {Array.from({ length: totalReps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              i < currentRep - 1 && "bg-primary",
              i === currentRep - 1 && phase !== 'idle' && "bg-primary animate-pulse scale-125",
              i >= currentRep && "bg-secondary"
            )}
          />
        ))}
      </div>
      
      {/* Direction indicator */}
      <div className="flex items-center gap-4 text-sm">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all",
          phase === 'going' ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            phase === 'going' ? "bg-primary animate-pulse" : "bg-muted-foreground/50"
          )} />
          <span className="font-medium">IDA</span>
        </div>
        
        <div className="w-8 h-0.5 bg-border" />
        
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all",
          phase === 'returning' ? "bg-accent/20 text-accent" : "bg-secondary text-muted-foreground"
        )}>
          <span className="font-medium">VOLTA</span>
          <div className={cn(
            "w-2 h-2 rounded-full",
            phase === 'returning' ? "bg-accent animate-pulse" : "bg-muted-foreground/50"
          )} />
        </div>
      </div>
    </div>
  );
}

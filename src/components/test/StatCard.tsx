import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  variant?: 'default' | 'primary' | 'accent' | 'large';
  className?: string;
}

export function StatCard({ 
  label, 
  value, 
  unit, 
  icon,
  variant = 'default',
  className 
}: StatCardProps) {
  return (
    <div 
      className={cn(
        "glass-card p-4 rounded-xl animate-fade-in",
        variant === 'primary' && "border-primary/30 bg-primary/5",
        variant === 'accent' && "border-accent/30 bg-accent/5",
        variant === 'large' && "p-6",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <span className={cn(
            "text-muted-foreground",
            variant === 'primary' && "text-primary",
            variant === 'accent' && "text-accent"
          )}>
            {icon}
          </span>
        )}
        <span className="stat-label">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn(
          "font-mono font-bold tracking-tight",
          variant === 'large' ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl",
          variant === 'primary' && "text-primary",
          variant === 'accent' && "text-accent"
        )}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground ml-1">{unit}</span>
        )}
      </div>
    </div>
  );
}

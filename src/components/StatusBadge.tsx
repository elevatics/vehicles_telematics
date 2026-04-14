import { VehicleStatus } from '@/types/vehicle';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: VehicleStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge = ({ status, showLabel = true, size = 'md' }: StatusBadgeProps) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const statusConfig = {
    online: {
      color: 'bg-[hsl(var(--status-online))]',
      label: 'Online',
      ring: 'ring-[hsl(var(--status-online)/0.2)]',
    },
    idle: {
      color: 'bg-[hsl(var(--status-idle))]',
      label: 'Idle',
      ring: 'ring-[hsl(var(--status-idle)/0.2)]',
    },
    offline: {
      color: 'bg-[hsl(var(--status-offline))]',
      label: 'Offline',
      ring: 'ring-[hsl(var(--status-offline)/0.2)]',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'rounded-full ring-4 animate-pulse',
        sizeClasses[size],
        config.color,
        config.ring
      )} />
      {showLabel && (
        <span className="text-sm font-medium text-foreground">
          {config.label}
        </span>
      )}
    </div>
  );
};

export default StatusBadge;

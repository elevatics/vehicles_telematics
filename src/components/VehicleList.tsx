import { Vehicle, VehicleStatus } from '@/types/vehicle';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown } from 'lucide-react';

interface VehicleListProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle) => void;
  filterStatus: VehicleStatus | 'all';
  onFilterChange: (status: VehicleStatus | 'all') => void;
}

const VehicleList = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  filterStatus,
  onFilterChange,
}: VehicleListProps) => {
  const filteredVehicles =
    filterStatus === 'all'
      ? vehicles
      : vehicles.filter((v) => v.status === filterStatus);

  const statusCounts = {
    all: vehicles.length,
    online: vehicles.filter((v) => v.status === 'online').length,
    idle: vehicles.filter((v) => v.status === 'idle').length,
    offline: vehicles.filter((v) => v.status === 'offline').length,
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      <div className="p-4 border-b border-border bg-card">
        <h2 className="text-xl font-bold text-card-foreground mb-4">Fleet Overview</h2>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => onFilterChange('all')}
          >
            <span className="font-semibold">All</span>
            <span className="ml-auto text-xs">{statusCounts.all}</span>
          </Button>
          <Button
            variant={filterStatus === 'online' ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => onFilterChange('online')}
          >
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-online))] mr-2" />
            <span>Online</span>
            <span className="ml-auto text-xs">{statusCounts.online}</span>
          </Button>
          <Button
            variant={filterStatus === 'idle' ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => onFilterChange('idle')}
          >
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-idle))] mr-2" />
            <span>Idle</span>
            <span className="ml-auto text-xs">{statusCounts.idle}</span>
          </Button>
          <Button
            variant={filterStatus === 'offline' ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => onFilterChange('offline')}
          >
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-offline))] mr-2" />
            <span>Offline</span>
            <span className="ml-auto text-xs">{statusCounts.offline}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredVehicles.map((vehicle) => (
          <Collapsible key={vehicle.id}>
            <Card
              className={cn(
                'transition-all border',
                selectedVehicle?.id === vehicle.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <StatusBadge status={vehicle.status} showLabel={false} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-card-foreground truncate">{vehicle.name}</p>
                      <p className="text-xs text-muted-foreground">{vehicle.plateNumber}</p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div 
                  className="px-3 pb-3 pt-1 space-y-2 border-t border-border/50 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => onSelectVehicle(vehicle)}
                >
                  <div className="text-xs space-y-1.5">
                    <p className="text-muted-foreground">
                      Driver: <span className="text-card-foreground font-medium">{vehicle.driver}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Speed: <span className="text-card-foreground font-medium">{vehicle.speed} mph</span>
                    </p>
                    <p className="text-muted-foreground">
                      Updated: <span className="text-card-foreground font-medium">
                        {formatDistanceToNow(new Date(vehicle.lastUpdate), { addSuffix: true })}
                      </span>
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full mt-2"
                    variant={selectedVehicle?.id === vehicle.id ? "default" : "outline"}
                  >
                    View on Map
                  </Button>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};

export default VehicleList;

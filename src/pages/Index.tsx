import { useState, useEffect } from 'react';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import { mockVehicles } from '@/data/mockVehicles';
import VehicleList from '@/components/VehicleList';
import FleetMap from '@/components/FleetMap';
import { useVehicles } from '@/hooks/useVehicles';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

const Index = () => {
  const { data: liveVehicles, isLoading, isError } = useVehicles();
  const vehicles: Vehicle[] = liveVehicles ?? mockVehicles;
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | 'all'>('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1024px)').matches : false
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    if (isMobile) setSheetOpen(false);
  };

  if (isMobile) {
    return (
      <div className="h-full flex flex-col overflow-hidden relative">
        {/* Map takes remaining space above the bottom sheet */}
        <div className="flex-1 min-w-0 relative">
          <FleetMap
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={handleSelectVehicle}
            onClearSelection={() => setSelectedVehicle(null)}
            apiToken={MAPBOX_TOKEN}
          />
        </div>

        {/* Mobile bottom sheet */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-40",
            "flex flex-col",
            "bg-card border-t border-border",
            "transition-[height] duration-300 ease-in-out",
            sheetOpen ? "h-[60vh]" : "h-14"
          )}
        >
          {/* Sheet handle / toggle bar */}
          <button
            onClick={() => setSheetOpen(!sheetOpen)}
            className="w-full h-14 flex items-center justify-between px-4 flex-shrink-0 focus:outline-none"
            aria-label={sheetOpen ? 'Collapse Fleet Overview' : 'Expand Fleet Overview'}
          >
            <div className="flex items-center gap-2">
              <LayoutList className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Fleet Overview</span>
              <span className="text-xs text-muted-foreground">({vehicles.length} vehicles)</span>
            </div>
            {sheetOpen ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {/* Scrollable list content */}
          <div className={cn(
            "flex-1 overflow-hidden",
            sheetOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <VehicleList
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={handleSelectVehicle}
              filterStatus={filterStatus}
              onFilterChange={setFilterStatus}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Map fills all available space */}
      <div className="flex-1 min-w-0 relative">
        <FleetMap
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          onSelectVehicle={setSelectedVehicle}
          onClearSelection={() => setSelectedVehicle(null)}
          apiToken={MAPBOX_TOKEN}
        />
      </div>

      {/* Right sidebar with edge toggle */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -left-5 z-10",
            "w-5 h-14 flex items-center justify-center",
            "bg-card border border-border border-r-0 rounded-l-md",
            "hover:bg-accent transition-colors cursor-pointer",
            "shadow-md"
          )}
          aria-label={sidebarOpen ? 'Collapse Fleet Overview' : 'Expand Fleet Overview'}
        >
          {sidebarOpen ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <div
          className={cn(
            "h-full transition-[width] duration-300 ease-in-out overflow-hidden border-l border-border",
            sidebarOpen ? "w-80" : "w-0 border-l-0"
          )}
        >
          <div className="w-80 h-full">
            <VehicleList
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
              filterStatus={filterStatus}
              onFilterChange={setFilterStatus}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

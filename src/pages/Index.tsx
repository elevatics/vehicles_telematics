import { useState } from 'react';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import { mockVehicles } from '@/data/mockVehicles';
import VehicleList from '@/components/VehicleList';
import FleetMap from '@/components/FleetMap';
// import DashboardStats from '@/components/DashboardStats';
import { useVehicles } from '@/hooks/useVehicles';
import { Loader2, WifiOff } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

const Index = () => {
  const { data: liveVehicles, isLoading, isError } = useVehicles();
  const vehicles: Vehicle[] = liveVehicles ?? mockVehicles;
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | 'all'>('all');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {isLoading && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading live vehicle data...
        </div>
      )}
      {isError && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs">
          <WifiOff className="h-3 w-3" />
          Backend unavailable — showing mock data
        </div>
      )}
      {/* <DashboardStats vehicles={vehicles} /> */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <FleetMap
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onClearSelection={() => setSelectedVehicle(null)}
            apiToken={MAPBOX_TOKEN}
          />
        </div>
        <div className="w-80 flex-shrink-0">
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
  );
};

export default Index;

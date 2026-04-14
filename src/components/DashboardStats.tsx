import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vehicle } from '@/types/vehicle';
import { 
  TrendingUp, 
  TrendingDown,
  Fuel, 
  DollarSign, 
  Route,
} from 'lucide-react';

interface DashboardStatsProps {
  vehicles: Vehicle[];
}

const DashboardStats = ({ vehicles }: DashboardStatsProps) => {
  // Calculate stats
  const totalVehicles = vehicles.length;
  const onlineVehicles = vehicles.filter(v => v.status === 'online').length;
  
  // Mock data for other stats
  const activeTrips = 12;
  
  const fuelCostToday = 1248.50;
  const revenueToday = 5432.00;

  return (
    <div className="bg-background border-b border-border p-4 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Real-time Fleet Overview</h2>
        <p className="text-sm text-muted-foreground">Monitor your fleet performance and activity</p>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Trips */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Trips</p>
              <p className="text-3xl font-bold text-foreground mt-1">{activeTrips}</p>
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3" />
                <span>8% from yesterday</span>
              </p>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Route className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        {/* Total Vehicles */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Vehicles</p>
              <p className="text-3xl font-bold text-foreground mt-1">{totalVehicles}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs bg-status-online/10 text-status-online border-status-online/20">
                  {onlineVehicles} online
                </Badge>
              </div>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Route className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Fuel Costs */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Fuel Costs Today</p>
              <p className="text-3xl font-bold text-foreground mt-1">${fuelCostToday.toFixed(2)}</p>
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-2">
                <TrendingDown className="h-3 w-3" />
                <span>12% savings</span>
              </p>
            </div>
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Fuel className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        {/* Revenue */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Revenue Today</p>
              <p className="text-3xl font-bold text-foreground mt-1">${revenueToday.toFixed(2)}</p>
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3" />
                <span>15% increase</span>
              </p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardStats;

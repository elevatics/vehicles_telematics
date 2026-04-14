import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Map, 
  Car, 
  AlertTriangle, 
  MapPin, 
  Bell, 
  MessageSquare, 
  Navigation,
  Eye,
  MonitorPlay
} from 'lucide-react';
import FleetMap from '@/components/FleetMap';
import Vehicle360View from '@/components/Vehicle360View';
import VehicleList from '@/components/VehicleList';
import { mockVehicles } from '@/data/mockVehicles';
import { Vehicle } from '@/types/vehicle';
import { useVehicles } from '@/hooks/useVehicles';
import { useAlerts } from '@/hooks/useAlerts';
import { useMarkAlertRead, useMarkAllAlertsRead } from '@/hooks/useAlerts';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export default function Fleet() {
  const { data: liveVehicles, isLoading, isError, refetch } = useVehicles();
  const vehicles: Vehicle[] = liveVehicles ?? mockVehicles;
  const { data: alerts = [] } = useAlerts();
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [liveView, setLiveView] = useState(false);
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);

  const toggleVehicleSelection = (vehicle: Vehicle) => {
    setSelectedVehicles(prev => {
      const exists = prev.find(v => v.id === vehicle.id);
      if (exists) {
        return prev.filter(v => v.id !== vehicle.id);
      }
      return [...prev, vehicle];
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b bg-background">
        <h2 className="text-2xl font-bold mb-4">Fleet - Live Map & Status</h2>
        
        <Tabs defaultValue="live-map" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="live-map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Live Map</span>
            </TabsTrigger>
            <TabsTrigger value="vehicle-status" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Vehicle Status</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="geofences" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Geofences</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live-map" className="mt-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Real-time Vehicle Locations</CardTitle>
                  <CardDescription>GPS tracking and live positioning</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => vehicles[0] && setSelectedVehicle(vehicles[0])}>
                        <Eye className="h-4 w-4 mr-2" />
                        View on Map
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                      <Button variant="outline" size="sm">
                        <Navigation className="h-4 w-4 mr-2" />
                        Track Live Trip
                      </Button>
                      <Button 
                        variant={liveView ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setLiveView(!liveView)}
                      >
                        <MonitorPlay className="h-4 w-4 mr-2" />
                        Live View
                      </Button>
                    </div>

                    {/* Live data status bar */}
                    {isLoading && (
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Fetching live positions...
                      </div>
                    )}
                    {isError && (
                      <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                        <WifiOff className="h-3 w-3" />
                        Backend unavailable — showing mock data
                        <Button variant="ghost" size="sm" className="h-5 px-1" onClick={() => refetch()}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Map + 360 View Layout */}
                    <div className={liveView ? "grid grid-cols-3 gap-4 h-[600px]" : "h-[600px]"}>
                      {liveView ? (
                        <>
                          {/* Map takes 2/3 */}
                          <div className="col-span-2 border rounded-lg overflow-hidden">
                            <FleetMap 
                              vehicles={vehicles} 
                              selectedVehicle={selectedVehicle}
                              onClearSelection={() => setSelectedVehicle(null)}
                              apiToken={MAPBOX_TOKEN}
                            />
                          </div>
                          {/* 360 View takes 1/3 */}
                          <div className="col-span-1">
                            <Vehicle360View vehicle={selectedVehicle || vehicles[0] || mockVehicles[0]} />
                          </div>
                        </>
                      ) : (
                        <FleetMap 
                          vehicles={vehicles} 
                          selectedVehicle={selectedVehicle}
                          onClearSelection={() => setSelectedVehicle(null)}
                          apiToken={MAPBOX_TOKEN}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vehicle-status" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Vehicles Status</CardTitle>
                <CardDescription>Current status of all fleet vehicles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {liveView && (
                    <div className="text-sm text-muted-foreground mb-2">
                      Click on vehicles to add/remove from live view tracking
                    </div>
                  )}
                  {vehicles.map((vehicle) => (
                    <div 
                      key={vehicle.id} 
                      className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                        liveView && selectedVehicles.find(v => v.id === vehicle.id) 
                          ? 'border-primary bg-primary/5' 
                          : ''
                      }`}
                      onClick={() => liveView && toggleVehicleSelection(vehicle)}
                      style={{ cursor: liveView ? 'pointer' : 'default' }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{vehicle.name}</h4>
                          <p className="text-sm text-muted-foreground">{vehicle.driver}</p>
                          <p className="text-xs text-muted-foreground">{vehicle.plateNumber}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          vehicle.status === 'online' ? 'bg-green-100 text-green-700' :
                          vehicle.status === 'idle' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {vehicle.status}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div>Speed: {vehicle.speed} km/h</div>
                        <div>Fuel: {vehicle.fuelLevel}%</div>
                        <div>Odometer: {vehicle.odometer} km</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Active Alerts & Notifications</CardTitle>
                  <CardDescription>Current warnings and critical notifications</CardDescription>
                </div>
                {alerts.some(a => !a.read) && (
                  <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
                    Mark all read
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No alerts</p>
                  )}
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 border-l-4 rounded flex items-start justify-between gap-3 ${
                        alert.severity === 'high'
                          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                          : alert.severity === 'medium'
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                          : 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      } ${alert.read ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                          alert.severity === 'high' ? 'text-red-500' :
                          alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {!alert.read && (
                        <Button
                          variant="ghost" size="sm" className="h-6 px-2 text-xs flex-shrink-0"
                          onClick={() => markRead.mutate(alert.id)}
                        >
                          Dismiss
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geofences" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Geofence Management</CardTitle>
                <CardDescription>Manage zones and boundaries for fleet monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button>
                    <MapPin className="h-4 w-4 mr-2" />
                    Create New Geofence
                  </Button>
                  <div className="space-y-2">
                    <div className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">Downtown Delivery Zone</h4>
                          <p className="text-sm text-muted-foreground">Radius: 5 km</p>
                        </div>
                        <div className="text-sm text-muted-foreground">3 vehicles inside</div>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">Warehouse Area</h4>
                          <p className="text-sm text-muted-foreground">Radius: 2 km</p>
                        </div>
                        <div className="text-sm text-muted-foreground">1 vehicle inside</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Alert History & Rules</CardTitle>
                <CardDescription>Configure and view notification history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline">
                    <Bell className="h-4 w-4 mr-2" />
                    Configure Alert Rules
                  </Button>
                  <div className="space-y-2">
                    <div className="p-3 border rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Speed limit violation - Truck Alpha</span>
                        <span className="text-muted-foreground">2m ago</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Low fuel alert - Van Delta</span>
                        <span className="text-muted-foreground">15m ago</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Maintenance due - Truck Gamma</span>
                        <span className="text-muted-foreground">1h ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

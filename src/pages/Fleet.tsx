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
  MonitorPlay,
  Send
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { commandsApi } from '@/services/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import GeofenceManager from '@/components/GeofenceManager';

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
  const [activeTab, setActiveTab] = useState('live-map');
  const [sendMsgOpen, setSendMsgOpen] = useState(false);
  const [msgVehicleId, setMsgVehicleId] = useState<string>('');
  const [msgText, setMsgText] = useState('');
  const [msgSending, setMsgSending] = useState(false);

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
      <div className="px-6 pt-6 pb-0 border-b bg-background">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Fleet Operations</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Live map, vehicle status & zone management</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {vehicles.filter(v => v.status === 'online').length} online
            </div>
            <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              {vehicles.filter(v => v.status === 'idle').length} idle
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              {vehicles.filter(v => v.status === 'offline').length} offline
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-10">
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
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Real-time Vehicle Locations</CardTitle>
                  <CardDescription>GPS tracking and live positioning</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('vehicle-status')}>
                        <Eye className="h-4 w-4 mr-2" />
                        All Vehicles
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSendMsgOpen(true)}>
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
                              onSelectVehicle={setSelectedVehicle}
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
                          onSelectVehicle={setSelectedVehicle}
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
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">All Vehicles Status</CardTitle>
                <CardDescription>Current status of all fleet vehicles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {liveView && (
                    <p className="text-xs text-muted-foreground bg-muted/50 border border-border px-3 py-2 rounded-md">
                      Click on vehicles to add/remove from live view tracking
                    </p>
                  )}
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className={`p-4 border rounded-xl hover:shadow-sm transition-all duration-150 ${
                        liveView && selectedVehicles.find(v => v.id === vehicle.id)
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'hover:bg-muted/30'
                      }`}
                      onClick={() => liveView && toggleVehicleSelection(vehicle)}
                      style={{ cursor: liveView ? 'pointer' : 'default' }}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            vehicle.status === 'online' ? 'bg-green-500' :
                            vehicle.status === 'idle' ? 'bg-yellow-500' : 'bg-muted-foreground/40'
                          } ${vehicle.status === 'online' ? 'shadow-[0_0_6px_2px_rgba(34,197,94,0.4)]' : ''}`} />
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm truncate">{vehicle.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">{vehicle.driver}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                            vehicle.status === 'online' ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' :
                            vehicle.status === 'idle' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {vehicle.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
                          <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Speed</div>
                          <div className="text-sm font-bold mt-0.5">{vehicle.speed} <span className="text-xs font-normal text-muted-foreground">mph</span></div>
                        </div>
                        <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
                          <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Fuel</div>
                          <div className={`text-sm font-bold mt-0.5 ${
                            vehicle.fuelLevel < 20 ? 'text-destructive' :
                            vehicle.fuelLevel < 40 ? 'text-yellow-600' : ''
                          }`}>{vehicle.fuelLevel}<span className="text-xs font-normal text-muted-foreground">%</span></div>
                        </div>
                        <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
                          <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Odometer</div>
                          <div className="text-sm font-bold mt-0.5">{vehicle.odometer.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">km</span></div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground font-mono">{vehicle.plateNumber}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVehicle(vehicle);
                            setActiveTab('live-map');
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1.5" />
                          View on Map
                        </Button>
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
                <CardDescription>Create and manage zones and boundaries for fleet monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <GeofenceManager />
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

      {/* Send Message Dialog */}
      <Dialog open={sendMsgOpen} onOpenChange={(open) => {
        setSendMsgOpen(open);
        if (!open) { setMsgText(''); setMsgVehicleId(''); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Command to Device</DialogTitle>
            <DialogDescription>
              Send a message or command directly to the vehicle via Traccar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select value={msgVehicleId} onValueChange={setMsgVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.name} — {v.plateNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Message / Command</Label>
              <Textarea
                placeholder="Type your message or command text..."
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Sent as a <code>custom</code> command via Traccar <code>POST /api/commands/send</code>.
                The device must support receiving text commands via its protocol.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendMsgOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!msgVehicleId || !msgText.trim() || msgSending}
              onClick={async () => {
                setMsgSending(true);
                try {
                  await commandsApi.send({
                    deviceId: Number(msgVehicleId),
                    type: 'custom',
                    attributes: { data: msgText.trim() },
                  });
                  toast.success('Command sent successfully');
                  setSendMsgOpen(false);
                  setMsgText('');
                  setMsgVehicleId('');
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Failed to send command';
                  toast.error(msg);
                } finally {
                  setMsgSending(false);
                }
              }}
            >
              {msgSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

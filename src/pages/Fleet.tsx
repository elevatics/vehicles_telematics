import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
import { formatDistanceToNow, subHours, subDays } from 'date-fns';
import GeofenceManager from '@/components/GeofenceManager';
import { usePositionHistory } from '@/hooks/usePositionHistory';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Radio } from 'lucide-react';

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

  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [trackingVehicle, setTrackingVehicle] = useState<Vehicle | null>(null);
  const [trackWindow, setTrackWindow] = useState('1h');
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1024px)').matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsTabletOrMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const location = useLocation();
  useEffect(() => {
    const state = location.state as { trackVehicleId?: number } | null;
    if (state?.trackVehicleId && vehicles.length > 0) {
      const v = vehicles.find(v => v.id === state.trackVehicleId);
      if (v) {
        setTrackingVehicle(v);
        setActiveTab('live-map');
        window.history.replaceState({}, '');
      }
    }
  }, [location.state, vehicles]);

  const getTrackRange = () => {
    const now = new Date();
    const map: Record<string, Date> = {
      '1h':  subHours(now, 1),
      '3h':  subHours(now, 3),
      '6h':  subHours(now, 6),
      '12h': subHours(now, 12),
      '24h': subHours(now, 24),
      '3d':  subDays(now, 3),
      '7d':  subDays(now, 7),
      '30d': subDays(now, 30),
    };
    return { from: (map[trackWindow] ?? subHours(now, 1)).toISOString(), to: now.toISOString() };
  };

  const { from: trackFrom, to: trackTo } = useMemo(getTrackRange, [trackWindow, trackingVehicle?.id]);

  const { data: positionHistory = [], isLoading: trailLoading } = usePositionHistory(
    trackingVehicle?.id ?? null,
    trackFrom,
    trackTo
  );

  const trailCoordinates = useMemo(
    () => positionHistory.map(p => [p.longitude, p.latitude] as [number, number]),
    [positionHistory]
  );

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
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-3 sm:px-6 pt-4 sm:pt-6 pb-0 border-b bg-background flex-shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4 sm:mb-5">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Fleet Operations</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Live map, vehicle status & zone management</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {vehicles.filter(v => v.status === 'online').length} <span className="hidden sm:inline">online</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              {vehicles.filter(v => v.status === 'idle').length} <span className="hidden sm:inline">idle</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted border border-border px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              {vehicles.filter(v => v.status === 'offline').length} <span className="hidden sm:inline">offline</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-10">
            <TabsTrigger value="live-map" className="flex items-center gap-1.5 px-2">
              <Map className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline text-xs">Live Map</span>
            </TabsTrigger>
            <TabsTrigger value="vehicle-status" className="flex items-center gap-1.5 px-2">
              <Car className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline text-xs">Status</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-1.5 px-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline text-xs">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="geofences" className="flex items-center gap-1.5 px-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline text-xs">Geofences</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1.5 px-2">
              <Bell className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline text-xs">Alerts History</span>
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
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('vehicle-status')} title="All Vehicles">
                        <Eye className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">All Vehicles</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSendMsgOpen(true)} title="Send Message">
                        <MessageSquare className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">Send Message</span>
                      </Button>
                      <Button
                        variant={trackingVehicle ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => trackingVehicle ? setTrackingVehicle(null) : setTrackDialogOpen(true)}
                        title={trackingVehicle ? `Stop tracking ${trackingVehicle.name}` : 'Track Live Trip'}
                      >
                        <Navigation className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">{trackingVehicle ? `Tracking: ${trackingVehicle.name}` : 'Track Live Trip'}</span>
                      </Button>
                      <Button 
                        variant={liveView ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setLiveView(!liveView)}
                        title="Live View"
                      >
                        <MonitorPlay className="h-4 w-4 lg:mr-2" />
                        <span className="hidden lg:inline">Live View</span>
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

                    {/* Trip Tracking Panel */}
                    {trackingVehicle && (
                      <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Radio className="h-4 w-4 text-primary animate-pulse" />
                            <span className="text-sm font-semibold text-primary">Live Tracking — {trackingVehicle.name}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setTrackingVehicle(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-sm">
                          <div className="bg-background/60 rounded px-2 py-1.5"><span className="text-muted-foreground text-[10px] uppercase tracking-wide block">Speed</span><span className="font-medium">{(trackingVehicle.speed * 1.852).toFixed(0)} km/h</span></div>
                          <div className="bg-background/60 rounded px-2 py-1.5"><span className="text-muted-foreground text-[10px] uppercase tracking-wide block">Status</span>
                            <Badge variant={(trackingVehicle.motion || trackingVehicle.status === 'online') ? 'default' : 'secondary'} className="text-xs h-5">
                              {trackingVehicle.motion ? 'Active' : trackingVehicle.status}
                            </Badge>
                          </div>
                          <div className="bg-background/60 rounded px-2 py-1.5"><span className="text-muted-foreground text-[10px] uppercase tracking-wide block">Trip Dist.</span><span className="font-medium">{trackingVehicle.tripOdometer?.toFixed(1) ?? '—'} km</span></div>
                          <div className="bg-background/60 rounded px-2 py-1.5"><span className="text-muted-foreground text-[10px] uppercase tracking-wide block">Trail Pts</span><span className="font-medium">{trailLoading ? '…' : positionHistory.length}</span></div>
                          <div className="bg-background/60 rounded px-2 py-1.5"><span className="text-muted-foreground text-[10px] uppercase tracking-wide block">Window</span><span className="font-medium">{trackWindow}</span></div>
                          <div className="bg-background/60 rounded px-2 py-1.5"><span className="text-muted-foreground text-[10px] uppercase tracking-wide block">Fuel</span><span className="font-medium">{trackingVehicle.fuelLevel}%</span></div>
                          <div className="bg-background/60 rounded px-2 py-1.5 col-span-2 lg:col-span-2"><span className="text-muted-foreground text-[10px] uppercase tracking-wide block">Driver</span><span className="font-medium truncate block">{trackingVehicle.driver}</span></div>
                        </div>
                      </div>
                    )}

                    {/* Map + 360 View Layout */}
                    {liveView ? (
                      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
                        {/* Map takes full width on mobile, 2/3 on desktop */}
                        <div className="lg:col-span-2 border rounded-lg overflow-hidden h-[50vw] min-h-[260px] max-h-[500px] lg:h-[600px] lg:max-h-none">
                          <FleetMap 
                            vehicles={vehicles} 
                            selectedVehicle={selectedVehicle}
                            onSelectVehicle={setSelectedVehicle}
                            onClearSelection={() => setSelectedVehicle(null)}
                            apiToken={MAPBOX_TOKEN}
                            trailCoordinates={trailCoordinates}
                            trackedVehicle={trackingVehicle ? vehicles.find(v => v.id === trackingVehicle.id) ?? trackingVehicle : null}
                            showDetailCard={!isTabletOrMobile}
                          />
                        </div>
                        {/* 360 View takes full width on mobile, 1/3 on desktop */}
                        <div className="lg:col-span-1">
                          <Vehicle360View vehicle={selectedVehicle || vehicles[0] || mockVehicles[0]} />
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden h-[50vw] min-h-[260px] max-h-[500px] lg:h-[600px] lg:max-h-none">
                        <FleetMap 
                          vehicles={vehicles} 
                          selectedVehicle={selectedVehicle}
                          onSelectVehicle={setSelectedVehicle}
                          onClearSelection={() => setSelectedVehicle(null)}
                          apiToken={MAPBOX_TOKEN}
                          trailCoordinates={trailCoordinates}
                          trackedVehicle={trackingVehicle ? vehicles.find(v => v.id === trackingVehicle.id) ?? trackingVehicle : null}
                          showDetailCard={!isTabletOrMobile}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vehicle-status" className="mt-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 px-3 sm:px-6">
                <CardTitle className="text-base">All Vehicles Status</CardTitle>
                <CardDescription>Current status of all fleet vehicles</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="space-y-2 sm:space-y-3">
                  {liveView && (
                    <p className="text-xs text-muted-foreground bg-muted/50 border border-border px-3 py-2 rounded-md">
                      Click on vehicles to add/remove from live view tracking
                    </p>
                  )}
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className={`p-3 sm:p-4 border rounded-xl hover:shadow-sm transition-all duration-150 ${
                        liveView && selectedVehicles.find(v => v.id === vehicle.id)
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'hover:bg-muted/30'
                      }`}
                      onClick={() => liveView && toggleVehicleSelection(vehicle)}
                      style={{ cursor: liveView ? 'pointer' : 'default' }}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
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
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            vehicle.status === 'online' ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' :
                            vehicle.status === 'idle' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {vehicle.status}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicle(vehicle);
                              setActiveTab('live-map');
                            }}
                            title="View on Map"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2.5 grid grid-cols-3 gap-2">
                        <div className="bg-muted/50 rounded-lg px-2 py-1.5 text-center">
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Speed</div>
                          <div className="text-sm font-bold mt-0.5">{vehicle.speed} <span className="text-[10px] font-normal text-muted-foreground">mph</span></div>
                        </div>
                        <div className="bg-muted/50 rounded-lg px-2 py-1.5 text-center">
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Fuel</div>
                          <div className={`text-sm font-bold mt-0.5 ${
                            vehicle.fuelLevel < 20 ? 'text-destructive' :
                            vehicle.fuelLevel < 40 ? 'text-yellow-600' : ''
                          }`}>{vehicle.fuelLevel}<span className="text-[10px] font-normal text-muted-foreground">%</span></div>
                        </div>
                        <div className="bg-muted/50 rounded-lg px-2 py-1.5 text-center">
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Odo</div>
                          <div className="text-sm font-bold mt-0.5">{vehicle.odometer.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">km</span></div>
                        </div>
                      </div>

                      <p className="mt-2 text-[10px] text-muted-foreground font-mono">{vehicle.plateNumber}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <Card>
              <CardHeader className="flex flex-wrap items-start justify-between gap-3 px-3 sm:px-6">
                <div>
                  <CardTitle className="text-base">Active Alerts & Notifications</CardTitle>
                  <CardDescription>Current warnings and critical notifications</CardDescription>
                </div>
                {alerts.some(a => !a.read) && (
                  <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} className="flex-shrink-0">
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

      {/* Track Live Trip Dialog */}
      <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Track Live Trip</DialogTitle>
            <DialogDescription>
              Select a vehicle to track live on the map with a breadcrumb trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select
                value={msgVehicleId}
                onValueChange={setMsgVehicleId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          v.status === 'online' ? 'bg-green-500' :
                          v.status === 'idle' ? 'bg-yellow-500' : 'bg-muted-foreground/40'
                        }`} />
                        {v.name} — {v.plateNumber}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trail History Window</Label>
              <Select value={trackWindow} onValueChange={setTrackWindow}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last 1 hour</SelectItem>
                  <SelectItem value="3h">Last 3 hours</SelectItem>
                  <SelectItem value="6h">Last 6 hours</SelectItem>
                  <SelectItem value="12h">Last 12 hours</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="3d">Last 3 days</SelectItem>
                  <SelectItem value="7d">Last 7 days (1 week)</SelectItem>
                  <SelectItem value="30d">Last 30 days (1 month)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Position history drawn as a trail on the map. Longer windows may take more time to load.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTrackDialogOpen(false); setMsgVehicleId(''); }}>
              Cancel
            </Button>
            <Button
              disabled={!msgVehicleId}
              onClick={() => {
                const v = vehicles.find(v => String(v.id) === msgVehicleId);
                if (v) {
                  setTrackingVehicle(v);
                  setSelectedVehicle(v);
                  setActiveTab('live-map');
                  toast.success(`Now tracking ${v.name}`);
                }
                setTrackDialogOpen(false);
                setMsgVehicleId('');
              }}
            >
              <Navigation className="h-4 w-4 mr-2" />
              Start Tracking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

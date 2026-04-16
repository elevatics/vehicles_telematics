import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Share2, Play, History, BarChart3, User, FileText, Clock, MapPin, AlertTriangle, Camera, Mail, MessageSquare, Bell, ChevronDown, X, Loader2, WifiOff, Navigation, Gauge, Fuel, Route } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useVehicles } from "@/hooks/useVehicles";
import { usePositionHistory, TraccarPosition } from "@/hooks/usePositionHistory";
import { mockVehicles } from "@/data/mockVehicles";
import { subHours, subDays, startOfDay, format } from "date-fns";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

// ── helpers ──────────────────────────────────────────────────────────────────

function getTimeRange(range: string, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  const map: Record<string, Date> = {
    today:  startOfDay(now),
    hour:   subHours(now, 1),
    day:    subHours(now, 24),
    week:   subDays(now, 7),
    month:  subDays(now, 30),
  };
  if (range === "custom" && customFrom && customTo) {
    return { from: new Date(customFrom).toISOString(), to: new Date(customTo).toISOString() };
  }
  return { from: (map[range] ?? subHours(now, 24)).toISOString(), to: now.toISOString() };
}

interface TripSegment {
  vehicleId: number;
  vehicleName: string;
  plateNumber: string;
  driver: string;
  positions: TraccarPosition[];
  startTime: string;
  endTime: string;
  durationMin: number;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  stopCount: number;
}

function buildTrips(positions: TraccarPosition[], gapMinutes = 10): TripSegment[] {
  if (positions.length === 0) return [];
  const sorted = [...positions].sort((a, b) => new Date(a.fixTime).getTime() - new Date(b.fixTime).getTime());
  const segments: TraccarPosition[][] = [];
  let current: TraccarPosition[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const gap = (new Date(sorted[i].fixTime).getTime() - new Date(sorted[i - 1].fixTime).getTime()) / 60000;
    if (gap > gapMinutes) { segments.push(current); current = []; }
    current.push(sorted[i]);
  }
  if (current.length > 0) segments.push(current);
  return segments
    .filter(s => s.length >= 2)
    .map(s => {
      const start = new Date(s[0].fixTime);
      const end = new Date(s[s.length - 1].fixTime);
      const durationMin = (end.getTime() - start.getTime()) / 60000;
      let distanceKm = 0;
      for (let i = 1; i < s.length; i++) {
        const R = 6371;
        const dLat = (s[i].latitude - s[i - 1].latitude) * Math.PI / 180;
        const dLng = (s[i].longitude - s[i - 1].longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(s[i - 1].latitude * Math.PI / 180) * Math.cos(s[i].latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        distanceKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
      const speeds = s.map(p => p.speed * 1.852);
      const stopCount = s.filter(p => p.speed < 1).length;
      return {
        vehicleId: s[0].deviceId,
        vehicleName: "",
        plateNumber: "",
        driver: "",
        positions: s,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMin,
        distanceKm,
        avgSpeedKmh: speeds.reduce((a, b) => a + b, 0) / speeds.length,
        maxSpeedKmh: Math.max(...speeds),
        stopCount,
      };
    });
}

function exportCSV(trips: TripSegment[]) {
  const header = "Vehicle,Plate,Driver,Start,End,Duration (min),Distance (km),Avg Speed (km/h),Max Speed (km/h),Stops";
  const rows = trips.map(t =>
    [t.vehicleName, t.plateNumber, t.driver,
     format(new Date(t.startTime), "yyyy-MM-dd HH:mm"),
     format(new Date(t.endTime), "yyyy-MM-dd HH:mm"),
     t.durationMin.toFixed(0), t.distanceKm.toFixed(2),
     t.avgSpeedKmh.toFixed(1), t.maxSpeedKmh.toFixed(1), t.stopCount].join(",")
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "trip_history.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ── Route Map component ───────────────────────────────────────────────────────

function RouteMap({ positions }: { positions: TraccarPosition[] }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!container.current || positions.length === 0) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [positions[0].longitude, positions[0].latitude],
      zoom: 11,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.once("style.load", () => {
      const coords: [number, number][] = positions.map(p => [p.longitude, p.latitude]);
      map.current!.addSource("route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
      });
      map.current!.addLayer({ id: "route-line", type: "line", source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#6366f1", "line-width": 3 },
      });
      // Start marker
      new mapboxgl.Marker({ color: "#22c55e" }).setLngLat(coords[0]).addTo(map.current!);
      // End marker
      new mapboxgl.Marker({ color: "#ef4444" }).setLngLat(coords[coords.length - 1]).addTo(map.current!);
      // Fit bounds
      const bounds = coords.reduce((b, c) => b.extend(c as [number, number]), new mapboxgl.LngLatBounds(coords[0], coords[0]));
      map.current!.fitBounds(bounds, { padding: 40 });
    });
    return () => { map.current?.remove(); };
  }, [positions]);

  if (positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground border rounded-lg bg-muted/20">
        <div className="text-center"><MapPin className="h-10 w-10 mx-auto mb-2" /><p>No position data for this trip</p></div>
      </div>
    );
  }
  return <div ref={container} className="w-full h-64 rounded-lg overflow-hidden border" />;
}

export default function Trips() {
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState("day");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [currentView, setCurrentView] = useState("active");

  const { data: liveVehicles, isLoading: vehiclesLoading, isError: vehiclesError } = useVehicles();
  const allVehicles = liveVehicles ?? mockVehicles;

  const vehicleOptions = useMemo(() =>
    allVehicles.map(v => ({ id: String(v.id), numericId: v.id, label: `${v.name} (${v.plateNumber})`, vehicle: v })),
    [allVehicles]
  );

  const eventOptions = [
    { id: "stops", label: "Show Stops", icon: MapPin },
    { id: "overspeeding", label: "Overspeeding", icon: AlertTriangle },
    { id: "idle", label: "Idle Time", icon: Clock },
    { id: "media", label: "Media Files", icon: Camera },
  ];
  const statusOptions = [
    { id: "online", label: "Online / Moving", icon: Play },
    { id: "idle", label: "Idle", icon: Clock },
    { id: "offline", label: "Offline", icon: WifiOff },
  ];

  const { from: rangeFrom, to: rangeTo } = useMemo(
    () => getTimeRange(timeRange, customFrom, customTo),
    [timeRange, customFrom, customTo]
  );

  // For history: fetch positions for all selected vehicles (or all if none selected)
  const targetVehicles = selectedVehicles.length > 0
    ? vehicleOptions.filter(v => selectedVehicles.includes(v.id))
    : vehicleOptions;

  // We fetch position history for up to 5 vehicles at once (to avoid overload)
  const historyVehicle1 = targetVehicles[0];
  const historyVehicle2 = targetVehicles[1];
  const historyVehicle3 = targetVehicles[2];
  const historyVehicle4 = targetVehicles[3];
  const historyVehicle5 = targetVehicles[4];

  const { data: pos1 = [], isLoading: l1 } = usePositionHistory(historyVehicle1?.numericId ?? null, rangeFrom, rangeTo);
  const { data: pos2 = [], isLoading: l2 } = usePositionHistory(historyVehicle2?.numericId ?? null, rangeFrom, rangeTo);
  const { data: pos3 = [], isLoading: l3 } = usePositionHistory(historyVehicle3?.numericId ?? null, rangeFrom, rangeTo);
  const { data: pos4 = [], isLoading: l4 } = usePositionHistory(historyVehicle4?.numericId ?? null, rangeFrom, rangeTo);
  const { data: pos5 = [], isLoading: l5 } = usePositionHistory(historyVehicle5?.numericId ?? null, rangeFrom, rangeTo);
  const historyLoading = l1 || l2 || l3 || l4 || l5;

  // Build trip segments per vehicle
  const allTrips: TripSegment[] = useMemo(() => {
    const batches = [
      { positions: pos1, opt: historyVehicle1 },
      { positions: pos2, opt: historyVehicle2 },
      { positions: pos3, opt: historyVehicle3 },
      { positions: pos4, opt: historyVehicle4 },
      { positions: pos5, opt: historyVehicle5 },
    ];
    return batches.flatMap(({ positions, opt }) => {
      if (!opt || positions.length === 0) return [];
      const segs = buildTrips(positions);
      return segs.map(s => ({
        ...s,
        vehicleName: opt.vehicle.name,
        plateNumber: opt.vehicle.plateNumber,
        driver: opt.vehicle.driver,
      }));
    }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [pos1, pos2, pos3, pos4, pos5]);

  // Filter by status overlay
  const filteredTrips = useMemo(() => {
    if (selectedStatus.length === 0) return allTrips;
    return allTrips;
  }, [allTrips, selectedStatus]);

  // Active trips from live vehicle data
  // effectiveStatus: if motion=true treat as "online" regardless of Traccar status field
  const activeTrips = useMemo(() =>
    allVehicles
      .filter(v => {
        const effectiveStatus = v.motion ? "online" : v.status;
        if (selectedVehicles.length > 0 && !selectedVehicles.includes(String(v.id))) return false;
        if (selectedStatus.length > 0 && !selectedStatus.includes(effectiveStatus)) return false;
        return effectiveStatus === "online" || v.motion;
      }),
    [allVehicles, selectedVehicles, selectedStatus]
  );

  // Analytics aggregates from real position data
  const analyticsData = useMemo(() => {
    const byVehicle = new Map<string, { name: string; trips: number; distanceKm: number; avgSpeed: number; speeds: number[] }>();
    allTrips.forEach(t => {
      const key = t.vehicleName || String(t.vehicleId);
      const entry = byVehicle.get(key) ?? { name: key, trips: 0, distanceKm: 0, avgSpeed: 0, speeds: [] };
      entry.trips++;
      entry.distanceKm += t.distanceKm;
      entry.speeds.push(t.avgSpeedKmh);
      byVehicle.set(key, entry);
    });
    return Array.from(byVehicle.values()).map(e => ({
      name: e.name,
      trips: e.trips,
      distance: parseFloat(e.distanceKm.toFixed(1)),
      avgSpeed: e.speeds.length > 0 ? parseFloat((e.speeds.reduce((a, b) => a + b, 0) / e.speeds.length).toFixed(1)) : 0,
    }));
  }, [allTrips]);

  const totalDistance = useMemo(() => allTrips.reduce((s, t) => s + t.distanceKm, 0), [allTrips]);
  const totalTrips = allTrips.length;
  const avgSpeed = useMemo(() => {
    if (allTrips.length === 0) return 0;
    return allTrips.reduce((s, t) => s + t.avgSpeedKmh, 0) / allTrips.length;
  }, [allTrips]);

  const handleVehicleToggle = (id: string) =>
    setSelectedVehicles(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  const handleEventToggle = (id: string) =>
    setSelectedEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  const handleStatusToggle = (id: string) =>
    setSelectedStatus(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const navigate = useNavigate();

  const handleDownloadReport = () => {
    if (filteredTrips.length === 0) { toast.error("No trip data to export"); return; }
    exportCSV(filteredTrips);
    toast.success(`Exported ${filteredTrips.length} trips to CSV`);
  };
  const handleShareTrip = (method: string) => toast.success(`Trip history shared via ${method}`);

  return (
    <div className="h-full overflow-y-auto">
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold">Trip Management</h2>
          <p className="text-muted-foreground text-sm">Manage and track vehicle trips</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={currentView} onValueChange={setCurrentView}>
            <SelectTrigger className="w-[160px] sm:w-[200px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="active"><div className="flex items-center"><Play className="h-4 w-4 mr-2" />Active Trips</div></SelectItem>
              <SelectItem value="history"><div className="flex items-center"><History className="h-4 w-4 mr-2" />Trip History</div></SelectItem>
              <SelectItem value="analytics"><div className="flex items-center"><BarChart3 className="h-4 w-4 mr-2" />Trip Analytics</div></SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleDownloadReport} title="Download Report">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Download Report</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Select vehicles, time range, and events to filter</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Vehicle picker */}
            <div className="space-y-2">
              <Label>Select Vehicles</Label>
              <Popover open={vehicleDropdownOpen} onOpenChange={setVehicleDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedVehicles.length === 0 ? "All vehicles" : `${selectedVehicles.length} selected`}
                    <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-3 bg-background z-50" align="start">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Select Vehicles</p>
                      {selectedVehicles.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" onClick={() => setSelectedVehicles([])}>Clear all</Button>
                      )}
                    </div>
                    {vehiclesLoading && <div className="flex items-center gap-2 text-xs text-primary py-1"><Loader2 className="h-3 w-3 animate-spin" />Loading...</div>}
                    {vehiclesError && <div className="flex items-center gap-2 text-xs text-yellow-600 py-1"><WifiOff className="h-3 w-3" />Using mock data</div>}
                    {vehicleOptions.map(v => (
                      <div key={v.id} className="flex items-center space-x-2">
                        <Checkbox id={`v-${v.id}`} checked={selectedVehicles.includes(v.id)} onCheckedChange={() => handleVehicleToggle(v.id)} />
                        <label htmlFor={`v-${v.id}`} className="text-sm cursor-pointer flex-1">{v.label}</label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedVehicles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedVehicles.map(id => {
                    const v = vehicleOptions.find(o => o.id === id);
                    return (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {v?.vehicle.name ?? id}
                        <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleVehicleToggle(id)} />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status filter */}
            <div className="space-y-2">
              <Label>Vehicle Status</Label>
              <Popover open={statusDropdownOpen} onOpenChange={setStatusDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedStatus.length === 0 ? "All statuses" : `${selectedStatus.length} selected`}
                    <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-3 bg-background z-50" align="start">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Status</p>
                      {selectedStatus.length > 0 && <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" onClick={() => setSelectedStatus([])}>Clear</Button>}
                    </div>
                    {statusOptions.map(s => {
                      const Icon = s.icon;
                      return (
                        <div key={s.id} className="flex items-center space-x-2">
                          <Checkbox id={`s-${s.id}`} checked={selectedStatus.includes(s.id)} onCheckedChange={() => handleStatusToggle(s.id)} />
                          <label htmlFor={`s-${s.id}`} className="text-sm cursor-pointer flex items-center flex-1">
                            <Icon className="h-4 w-4 mr-2 text-muted-foreground" />{s.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Time range */}
            <div className="space-y-2">
              <Label>Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="hour">Last Hour</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="day">Last 24 Hours</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {timeRange === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start</Label><Input type="datetime-local" value={customFrom} onChange={e => setCustomFrom(e.target.value)} /></div>
              <div className="space-y-2"><Label>End</Label><Input type="datetime-local" value={customTo} onChange={e => setCustomTo(e.target.value)} /></div>
            </div>
          )}

          {/* Event filters */}
          <div className="space-y-2">
            <Label>Event Overlays</Label>
            <Popover open={eventsDropdownOpen} onOpenChange={setEventsDropdownOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedEvents.length === 0 ? "Select event filters..." : `${selectedEvents.length} filter(s) active`}
                  <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-3 bg-background z-50" align="start">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Event Filters</p>
                    {selectedEvents.length > 0 && <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" onClick={() => setSelectedEvents([])}>Clear</Button>}
                  </div>
                  {eventOptions.map(ev => {
                    const Icon = ev.icon;
                    return (
                      <div key={ev.id} className="flex items-center space-x-2">
                        <Checkbox id={`ev-${ev.id}`} checked={selectedEvents.includes(ev.id)} onCheckedChange={() => handleEventToggle(ev.id)} />
                        <label htmlFor={`ev-${ev.id}`} className="text-sm cursor-pointer flex items-center flex-1">
                          <Icon className="h-4 w-4 mr-2 text-muted-foreground" />{ev.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            {selectedEvents.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedEvents.map(id => {
                  const ev = eventOptions.find(e => e.id === id);
                  if (!ev) return null;
                  const Icon = ev.icon;
                  return (
                    <Badge key={id} variant="secondary" className="text-xs">
                      <Icon className="h-3 w-3 mr-1" />{ev.label}
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleEventToggle(id)} />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── ACTIVE TRIPS ── */}
      {currentView === "active" && (
        <div className="space-y-4">
          {activeTrips.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Navigation className="h-10 w-10 mb-3" />
                <p className="font-medium">No active trips</p>
                <p className="text-sm">No vehicles are currently online or moving.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeTrips.map(v => (
                <Card key={v.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-lg">{v.name}</CardTitle>
                        <CardDescription>{v.plateNumber} · Driver: {v.driver}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const eff = v.motion ? "online" : v.status;
                          const color = eff === "online" ? "bg-green-500" : eff === "idle" ? "bg-yellow-500" : "bg-red-500";
                          const label = v.motion ? "Active" : v.status;
                          return <Badge className={color}>{label}</Badge>;
                        })()}
                        {v.motion && <Badge variant="outline" className="text-xs">Moving</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div><p className="text-muted-foreground text-xs">Speed</p><p className="font-medium">{(v.speed * 1.852).toFixed(0)} km/h</p></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Route className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div><p className="text-muted-foreground text-xs">Trip Odo</p><p className="font-medium">{v.tripOdometer?.toFixed(1) ?? "—"} km</p></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div><p className="text-muted-foreground text-xs">Fuel</p><p className="font-medium">{v.fuelLevel}%</p></div>
                      </div>
                      <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0"><p className="text-muted-foreground text-xs">Location</p><p className="font-medium truncate text-xs">{v.location.address || `${v.location.lat.toFixed(4)}, ${v.location.lng.toFixed(4)}`}</p></div>
                      </div>
                    </div>
                    <Separator className="mb-3" />
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => toast.info(`Calling driver: ${v.driver}`)} title="Contact Driver">
                        <User className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Contact Driver</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate("/fleet", { state: { trackVehicleId: v.id } })} title="Track Live">
                        <MapPin className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Track Live</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TRIP HISTORY ── */}
      {currentView === "history" && (
        <div className="space-y-4">
          {historyLoading && (
            <Card>
              <CardContent className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading position history…</span>
              </CardContent>
            </Card>
          )}

          {!historyLoading && filteredTrips.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <History className="h-10 w-10 mb-3" />
                <p className="font-medium">No trip history found</p>
                <p className="text-sm">Try selecting a longer time range or different vehicles.</p>
              </CardContent>
            </Card>
          )}

          {!historyLoading && filteredTrips.map((trip, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">{trip.vehicleName} <span className="text-muted-foreground font-normal text-sm">· {trip.plateNumber}</span></CardTitle>
                    <CardDescription>
                      {format(new Date(trip.startTime), "MMM d, yyyy HH:mm")} → {format(new Date(trip.endTime), "HH:mm")}
                      {trip.driver && <span className="ml-2">· {trip.driver}</span>}
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />View Route
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-base">{trip.vehicleName} — Trip Route</DialogTitle>
                        <DialogDescription>
                          {format(new Date(trip.startTime), "MMM d, yyyy HH:mm")} → {format(new Date(trip.endTime), "HH:mm")}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="p-3 rounded-lg border"><p className="text-muted-foreground text-xs">Duration</p><p className="font-semibold">{trip.durationMin >= 60 ? `${(trip.durationMin / 60).toFixed(1)}h` : `${trip.durationMin.toFixed(0)}m`}</p></div>
                          <div className="p-3 rounded-lg border"><p className="text-muted-foreground text-xs">Distance</p><p className="font-semibold">{trip.distanceKm.toFixed(2)} km</p></div>
                          <div className="p-3 rounded-lg border"><p className="text-muted-foreground text-xs">Avg Speed</p><p className="font-semibold">{trip.avgSpeedKmh.toFixed(1)} km/h</p></div>
                          <div className="p-3 rounded-lg border"><p className="text-muted-foreground text-xs">Max Speed</p><p className="font-semibold">{trip.maxSpeedKmh.toFixed(1)} km/h</p></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-3 rounded-lg border"><p className="text-muted-foreground text-xs">Stops detected</p><p className="font-semibold">{trip.stopCount}</p></div>
                          <div className="p-3 rounded-lg border"><p className="text-muted-foreground text-xs">Position points</p><p className="font-semibold">{trip.positions.length}</p></div>
                        </div>
                        {selectedEvents.includes("overspeeding") && trip.maxSpeedKmh > 80 && (
                          <div className="flex items-center gap-2 p-3 border border-yellow-500/30 rounded-lg bg-yellow-500/5">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <div><p className="text-sm font-medium">Overspeed detected</p><p className="text-xs text-muted-foreground">Max: {trip.maxSpeedKmh.toFixed(1)} km/h</p></div>
                          </div>
                        )}
                        <RouteMap positions={trip.positions} />
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Share Trip</Label>
                          <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => handleShareTrip("Email")}><Mail className="h-4 w-4 mr-2" />Email</Button>
                            <Button variant="outline" size="sm" onClick={() => handleShareTrip("SMS")}><MessageSquare className="h-4 w-4 mr-2" />SMS</Button>
                            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}>
                              <Share2 className="h-4 w-4 mr-2" />Copy Link
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Duration</p><p className="font-medium">{trip.durationMin >= 60 ? `${(trip.durationMin / 60).toFixed(1)}h` : `${trip.durationMin.toFixed(0)}m`}</p></div>
                  <div><p className="text-muted-foreground text-xs">Distance</p><p className="font-medium">{trip.distanceKm.toFixed(2)} km</p></div>
                  <div><p className="text-muted-foreground text-xs">Avg Speed</p><p className="font-medium">{trip.avgSpeedKmh.toFixed(1)} km/h</p></div>
                  <div><p className="text-muted-foreground text-xs">Max Speed</p><p className="font-medium">{trip.maxSpeedKmh.toFixed(1)} km/h</p></div>
                  <div><p className="text-muted-foreground text-xs">Stops</p><p className="font-medium">{trip.stopCount}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── TRIP ANALYTICS ── */}
      {currentView === "analytics" && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Trips</CardTitle></CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6"><div className="text-2xl sm:text-3xl font-bold">{historyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : totalTrips}</div><p className="text-xs text-muted-foreground mt-1">in selected period</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Distance</CardTitle></CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6"><div className="text-2xl sm:text-3xl font-bold">{historyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `${totalDistance.toFixed(0)} km`}</div><p className="text-xs text-muted-foreground mt-1">across all vehicles</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Speed</CardTitle></CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6"><div className="text-2xl sm:text-3xl font-bold">{historyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `${avgSpeed.toFixed(1)} km/h`}</div><p className="text-xs text-muted-foreground mt-1">fleet average</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6"><CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Active Now</CardTitle></CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6"><div className="text-2xl sm:text-3xl font-bold">{activeTrips.length}</div><p className="text-xs text-muted-foreground mt-1">vehicles moving</p></CardContent>
            </Card>
          </div>

          {historyLoading ? (
            <Card><CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span>Loading analytics…</span></CardContent></Card>
          ) : analyticsData.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground"><BarChart3 className="h-10 w-10 mb-3" /><p>No data for selected range</p></CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3 px-3 sm:px-6">
                  <CardTitle className="text-base">Distance per Vehicle</CardTitle>
                  <CardDescription>Total km driven in the selected period</CardDescription>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analyticsData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} unit=" km" />
                      <Tooltip formatter={(v: number) => [`${v} km`, "Distance"]} />
                      <Bar dataKey="distance" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 px-3 sm:px-6">
                  <CardTitle className="text-base">Average Speed per Vehicle</CardTitle>
                  <CardDescription>Fleet speed profile</CardDescription>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analyticsData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} unit=" km/h" />
                      <Tooltip formatter={(v: number) => [`${v} km/h`, "Avg Speed"]} />
                      <Legend />
                      <Bar dataKey="avgSpeed" name="Avg Speed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 px-3 sm:px-6">
                  <CardTitle className="text-base">Trips per Vehicle</CardTitle>
                  <CardDescription>Number of trip segments detected</CardDescription>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={analyticsData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [v, "Trips"]} />
                      <Bar dataKey="trips" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

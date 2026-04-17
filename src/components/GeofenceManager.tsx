import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { geofencesApi, TraccarGeofence } from '@/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

// Traccar stores geofence area as WKT: "CIRCLE (lat lng, radius)"
function toWKT(lng: number, lat: number, radiusMeters: number): string {
  return `CIRCLE (${lat} ${lng}, ${radiusMeters})`;
}

function parseWKT(area: string): { lng: number; lat: number; radius: number; polygonCoords?: [number, number][] } | null {
  // CIRCLE (lat lng, radius)  ← Traccar uses lat lng order
  const circle = area.match(/CIRCLE\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*,\s*([\d.]+)\s*\)/i);
  if (circle) {
    return { lat: parseFloat(circle[1]), lng: parseFloat(circle[2]), radius: parseFloat(circle[3]) };
  }

  // POLYGON ((lat lng, ...)) or LINESTRING (lat lng, ...)  ← Traccar uses lat lng order
  const coordStr = area.match(/\(+([^()]+)\)+/);
  if (!coordStr) return null;
  const pairs = coordStr[1].trim().split(',').map(s => {
    const parts = s.trim().split(/\s+/);
    return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
  }).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
  if (pairs.length === 0) return null;

  const avgLat = pairs.reduce((s, p) => s + p.lat, 0) / pairs.length;
  const avgLng = pairs.reduce((s, p) => s + p.lng, 0) / pairs.length;

  // Radius = max distance from centroid to any vertex (in meters)
  const R = 6371000;
  const radius = Math.max(...pairs.map(p => {
    const dLat = (p.lat - avgLat) * Math.PI / 180;
    const dLng = (p.lng - avgLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(avgLat * Math.PI / 180) * Math.cos(p.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }), 100);

  // Store the actual polygon ring as [lng, lat] pairs for GeoJSON rendering
  const polygonCoords: [number, number][] = pairs.map(p => [p.lng, p.lat]);
  // Close the ring if not already closed
  if (polygonCoords.length > 0) {
    const first = polygonCoords[0];
    const last = polygonCoords[polygonCoords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) polygonCoords.push(first);
  }

  return { lat: avgLat, lng: avgLng, radius, polygonCoords };
}

// UI-friendly geofence derived from TraccarGeofence
interface Geofence {
  id: number;
  name: string;
  description?: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  color: string;
  is_active: boolean;
  polygonCoords?: [number, number][];
}

function toUIGeofence(gf: TraccarGeofence, index: number): Geofence | null {
  const parsed = parseWKT(gf.area);
  if (!parsed) return null;
  return {
    id: gf.id,
    name: gf.name,
    description: gf.description,
    center_lat: parsed.lat,
    center_lng: parsed.lng,
    radius_meters: parsed.radius,
    color: (gf.attributes?.color as string) ?? COLORS[index % COLORS.length],
    is_active: (gf.attributes?.is_active as boolean) ?? true,
    polygonCoords: parsed.polygonCoords,
  };
}

function createGeoJSONCircle(center: [number, number], radiusMeters: number, points = 64) {
  const coords = [];
  const km = radiusMeters / 1000;
  const distanceX = km / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
    properties: {},
  };
}

export default function GeofenceManager() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const queryClient = useQueryClient();

  const [styleLoaded, setStyleLoaded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRadius, setNewRadius] = useState(500);
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [clickedPoint, setClickedPoint] = useState<[number, number] | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  // Fetch geofences from backend → Traccar
  const { data: rawGeofences = [], isLoading } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => geofencesApi.getAll(),
    staleTime: 30000,
  });
  const geofences: Geofence[] = rawGeofences
    .map((gf, i) => toUIGeofence(gf, i))
    .filter((g): g is Geofence => g !== null);

  // Create geofence
  const createMutation = useMutation({
    mutationFn: (payload: { name: string; center_lat: number; center_lng: number; radius_meters: number; color: string }) =>
      geofencesApi.create({
        name: payload.name,
        area: toWKT(payload.center_lng, payload.center_lat, payload.radius_meters),
        attributes: { color: payload.color, is_active: true },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success('Geofence created');
      resetCreation();
    },
    onError: () => toast.error('Failed to create geofence'),
  });

  // Update geofence name
  const updateMutation = useMutation({
    mutationFn: ({ id, name, gf }: { id: number; name: string; gf: Geofence }) =>
      geofencesApi.update(id, {
        name,
        area: toWKT(gf.center_lng, gf.center_lat, gf.radius_meters),
        attributes: { color: gf.color, is_active: gf.is_active },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      setEditingId(null);
    },
    onError: () => toast.error('Failed to update geofence'),
  });

  // Toggle active state
  const toggleMutation = useMutation({
    mutationFn: ({ gf, is_active }: { gf: Geofence; is_active: boolean }) =>
      geofencesApi.update(gf.id, {
        name: gf.name,
        area: toWKT(gf.center_lng, gf.center_lat, gf.radius_meters),
        attributes: { color: gf.color, is_active },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['geofences'] }),
    onError: () => toast.error('Failed to update geofence'),
  });

  // Delete geofence
  const deleteMutation = useMutation({
    mutationFn: (id: number) => geofencesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success('Geofence deleted');
    },
    onError: () => toast.error('Failed to delete geofence'),
  });

  const resetCreation = () => {
    setIsCreating(false);
    setClickedPoint(null);
    setNewName('');
    setNewRadius(500);
    setNewColor(COLORS[0]);
    if (map.current) {
      map.current.getCanvas().style.cursor = '';
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-121.94739103273606, 37.22445667850576],
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.once('style.load', () => setStyleLoaded(true));

    return () => { map.current?.remove(); };
  }, []);

  const hasFitToGeofences = useRef(false);

  // Fly to geofences centroid once on first load
  useEffect(() => {
    if (!map.current || !styleLoaded || geofences.length === 0 || hasFitToGeofences.current) return;
    const avgLng = geofences.reduce((s, g) => s + g.center_lng, 0) / geofences.length;
    const avgLat = geofences.reduce((s, g) => s + g.center_lat, 0) / geofences.length;
    if (!isFinite(avgLat) || !isFinite(avgLng) || avgLat < -90 || avgLat > 90 || avgLng < -180 || avgLng > 180) return;
    hasFitToGeofences.current = true;
    map.current.flyTo({ center: [avgLng, avgLat], zoom: 11, duration: 1000 });
  }, [geofences.length, styleLoaded]);

  // Handle map clicks for creation
  useEffect(() => {
    if (!map.current) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (!isCreating) return;
      setClickedPoint([e.lngLat.lng, e.lngLat.lat]);
    };

    map.current.on('click', handleClick);
    map.current.getCanvas().style.cursor = isCreating ? 'crosshair' : '';

    return () => { map.current?.off('click', handleClick); };
  }, [isCreating]);

  // Draw geofences on map
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    const drawAll = () => {
      const m = map.current;
      if (!m) return;

      // Clean up all existing layers/sources
      for (let i = 0; i < 100; i++) {
        if (m.getLayer(`geofence-fill-${i}`)) m.removeLayer(`geofence-fill-${i}`);
        if (m.getLayer(`geofence-line-${i}`)) m.removeLayer(`geofence-line-${i}`);
        if (m.getSource(`geofence-src-${i}`)) m.removeSource(`geofence-src-${i}`);
      }
      if (m.getLayer('preview-fill')) m.removeLayer('preview-fill');
      if (m.getLayer('preview-line')) m.removeLayer('preview-line');
      if (m.getSource('preview-src')) m.removeSource('preview-src');

      // Remove markers
      Object.values(markersRef.current).forEach(mk => mk.remove());
      markersRef.current = {};

      // Draw each active geofence as a circle
      geofences.forEach((gf, i) => {
        if (!gf.is_active) return;
        if (
          !isFinite(gf.center_lat) || !isFinite(gf.center_lng) ||
          gf.center_lat < -90 || gf.center_lat > 90 ||
          gf.center_lng < -180 || gf.center_lng > 180
        ) return;

        const shapeGeoJSON = gf.polygonCoords && gf.polygonCoords.length >= 3
          ? {
              type: 'Feature' as const,
              geometry: { type: 'Polygon' as const, coordinates: [gf.polygonCoords] },
              properties: {},
            }
          : createGeoJSONCircle([gf.center_lng, gf.center_lat], gf.radius_meters);
        m.addSource(`geofence-src-${i}`, { type: 'geojson', data: shapeGeoJSON as any });
        m.addLayer({
          id: `geofence-fill-${i}`,
          type: 'fill',
          source: `geofence-src-${i}`,
          paint: { 'fill-color': gf.color, 'fill-opacity': 0.15 },
        });
        m.addLayer({
          id: `geofence-line-${i}`,
          type: 'line',
          source: `geofence-src-${i}`,
          paint: { 'line-color': gf.color, 'line-width': 2, 'line-dasharray': [2, 2] },
        });

        const el = document.createElement('div');
        el.style.textAlign = 'center';
        el.innerHTML = `
          <div style="background:${gf.color};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${gf.name}</div>
          <div style="width:8px;height:8px;background:${gf.color};border:2px solid white;border-radius:50%;margin:2px auto 0;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
        `;
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([gf.center_lng, gf.center_lat])
          .addTo(m);
        markersRef.current[gf.id] = marker;
      });

      // Draw preview circle for new geofence being created
      if (clickedPoint) {
        const preview = createGeoJSONCircle(clickedPoint, newRadius);
        m.addSource('preview-src', { type: 'geojson', data: preview as any });
        m.addLayer({
          id: 'preview-fill',
          type: 'fill',
          source: 'preview-src',
          paint: { 'fill-color': newColor, 'fill-opacity': 0.25 },
        });
        m.addLayer({
          id: 'preview-line',
          type: 'line',
          source: 'preview-src',
          paint: { 'line-color': newColor, 'line-width': 2.5 },
        });
      }
    };

    drawAll();
  }, [geofences, clickedPoint, newRadius, newColor, styleLoaded]);

  const handleSave = () => {
    if (!clickedPoint || !newName.trim()) {
      toast.error('Please click on the map and enter a name');
      return;
    }
    createMutation.mutate({
      name: newName.trim(),
      center_lat: clickedPoint[1],
      center_lng: clickedPoint[0],
      radius_meters: newRadius,
      color: newColor,
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Map */}
      <div className="w-full lg:flex-1 rounded-lg overflow-hidden border border-border relative h-[50vw] min-h-[260px] max-h-[420px] lg:h-[600px] lg:max-h-none">
        <div ref={mapContainer} className="w-full h-full" />

        {isCreating && !clickedPoint && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-card border border-border rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 max-w-[90%]">
            <Crosshair className="h-4 w-4 text-primary animate-pulse flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-foreground">Click on the map to place geofence center</span>
          </div>
        )}
      </div>

      {/* Sidebar panel */}
      <div className="w-full lg:w-80 lg:flex-shrink-0 flex flex-col gap-3 overflow-y-auto lg:max-h-[600px]">
        {/* Create button / form */}
        {!isCreating ? (
          <Button onClick={() => setIsCreating(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create New Geofence
          </Button>
        ) : (
          <Card className="p-4 space-y-3 border-primary">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground">New Geofence</h4>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={resetCreation}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                placeholder="e.g. Warehouse Zone"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Radius: {newRadius >= 1000 ? `${(newRadius / 1000).toFixed(1)} km` : `${newRadius} m`}</Label>
              <Slider
                value={[newRadius]}
                onValueChange={([v]) => setNewRadius(v)}
                min={100}
                max={10000}
                step={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Color</Label>
              <div className="flex gap-1.5 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 transition-transform cursor-pointer',
                      newColor === c ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
            </div>

            {clickedPoint && (
              <p className="text-xs text-muted-foreground">
                {clickedPoint[1].toFixed(5)}, {clickedPoint[0].toFixed(5)}
              </p>
            )}

            <Button
              className="w-full"
              size="sm"
              disabled={!clickedPoint || !newName.trim() || createMutation.isPending}
              onClick={handleSave}
            >
              <Check className="h-4 w-4 mr-2" />
              {createMutation.isPending ? 'Saving...' : 'Save Geofence'}
            </Button>
          </Card>
        )}

        {/* Existing geofences list */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">
            Geofences ({geofences.length})
          </h4>

          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

          {geofences.map((gf) => (
            <Card key={gf.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: gf.color }}
                  />
                  {editingId === gf.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 text-sm py-0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateMutation.mutate({ id: gf.id, name: editName, gf });
                        }
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    <span className="text-sm font-medium text-foreground truncate">{gf.name}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {editingId === gf.id ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateMutation.mutate({ id: gf.id, name: editName, gf })}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => { setEditingId(gf.id); setEditName(gf.name); }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(gf.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {gf.radius_meters >= 1000
                    ? `${(gf.radius_meters / 1000).toFixed(1)} km radius`
                    : `${gf.radius_meters} m radius`}
                </span>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Active</Label>
                  <Switch
                    checked={gf.is_active}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ gf, is_active: checked })
                    }
                    className="scale-75"
                  />
                </div>
              </div>
            </Card>
          ))}

          {!isLoading && geofences.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No geofences yet. Click "Create New Geofence" to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
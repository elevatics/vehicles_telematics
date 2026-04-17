import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Vehicle } from '@/types/vehicle';
import { Button } from '@/components/ui/button';
import { Map as MapIcon, Satellite, Navigation, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import VehicleDetailCard from './VehicleDetailCard';
import VehicleAIChat from './VehicleAIChat';

interface FleetMapProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onClearSelection: () => void;
  apiToken: string;
  trailCoordinates?: [number, number][];
  trackedVehicle?: Vehicle | null;
  showDetailCard?: boolean;
}

type MapStyle = 'streets' | 'satellite' | 'traffic';

const buildTrailGeoJSON = (coords: [number, number][]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coords },
    },
    ...coords.map(c => ({
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Point' as const, coordinates: c },
    })),
  ],
});

const FleetMap = ({ vehicles, selectedVehicle, onSelectVehicle, onClearSelection, apiToken, trailCoordinates, trackedVehicle, showDetailCard = true }: FleetMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatVehicle, setAiChatVehicle] = useState<Vehicle | null>(null);
  
  useEffect(() => {
    if (selectedVehicle) {
      setCardPosition({ x: 0, y: 0 });
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (!mapContainer.current || !apiToken) return;

    mapboxgl.accessToken = apiToken;
    const center: [number, number] = [-121.928575, 37.241800833333336];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: 18,
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    const ro = new ResizeObserver(() => {
      map.current?.resize();
    });
    ro.observe(mapContainer.current);

    return () => {
      ro.disconnect();
      map.current?.remove();
    };
  }, [apiToken]);

  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    Object.values(markers.current).forEach((marker) => marker.remove());
    markers.current = {};

    // Add markers for each vehicle
    vehicles.forEach((vehicle) => {
      const el = document.createElement('div');
      el.className = 'vehicle-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.cursor = 'pointer';

      const statusColors = {
        online: 'hsl(142, 71%, 45%)',
        idle: 'hsl(45, 93%, 47%)',
        offline: 'hsl(0, 84%, 60%)',
      };

      el.innerHTML = `
        <div style="
          width: 100%;
          height: 100%;
          background: ${statusColors[vehicle.status]};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 12px;
        ">
          ${vehicle.name.charAt(0)}
        </div>
      `;

      el.addEventListener('click', () => {
        onSelectVehicle(vehicle);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([vehicle.location.lng, vehicle.location.lat])
        .addTo(map.current!);

      markers.current[vehicle.id] = marker;
    });
  }, [vehicles]);

  useEffect(() => {
    if (!map.current || !selectedVehicle) return;
    map.current.flyTo({
      center: [selectedVehicle.location.lng, selectedVehicle.location.lat],
      zoom: 15,
      duration: 1500,
    });
  }, [selectedVehicle]);

  // Auto-follow tracked vehicle
  useEffect(() => {
    if (!map.current || !trackedVehicle) return;
    map.current.easeTo({
      center: [trackedVehicle.location.lng, trackedVehicle.location.lat],
      zoom: 15,
      duration: 800,
    });
  }, [trackedVehicle?.location.lat, trackedVehicle?.location.lng]);

  // Draw/update breadcrumb trail — re-registers after every style change
  useEffect(() => {
    if (!map.current) return;

    const coords = trailCoordinates ?? [];

    const addTrailLayers = () => {
      if (!map.current) return;
      if (!map.current.getSource('trail')) {
        map.current.addSource('trail', {
          type: 'geojson',
          data: buildTrailGeoJSON(coords),
        });
        map.current.addLayer({
          id: 'trail-line',
          type: 'line',
          source: 'trail',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#6366f1', 'line-width': 3, 'line-opacity': 0.9 },
        });
        map.current.addLayer({
          id: 'trail-dots',
          type: 'circle',
          source: 'trail',
          filter: ['==', ['geometry-type'], 'Point'],
          paint: { 'circle-radius': 4, 'circle-color': '#6366f1', 'circle-opacity': 0.7 },
        });
      } else {
        (map.current.getSource('trail') as mapboxgl.GeoJSONSource).setData(buildTrailGeoJSON(coords));
      }
    };

    if (map.current.isStyleLoaded()) {
      addTrailLayers();
    } else {
      map.current.once('style.load', addTrailLayers);
    }

    // Re-draw trail after every future style change
    const onStyleLoad = () => addTrailLayers();
    map.current.on('style.load', onStyleLoad);
    return () => { map.current?.off('style.load', onStyleLoad); };
  }, [trailCoordinates]);

  useEffect(() => {
    if (!map.current) return;

    const styleUrls = {
      streets: 'mapbox://styles/mapbox/streets-v12',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
      traffic: 'mapbox://styles/mapbox/streets-v12',
    };

    map.current.setStyle(styleUrls[mapStyle]);

    if (mapStyle === 'traffic') {
      map.current.on('style.load', () => {
        if (!map.current) return;
        
        // Add traffic layer
        if (!map.current.getLayer('traffic')) {
          map.current.addLayer({
            id: 'traffic',
            type: 'line',
            source: {
              type: 'vector',
              url: 'mapbox://mapbox.mapbox-traffic-v1',
            },
            'source-layer': 'traffic',
            paint: {
              'line-width': 2,
              'line-color': [
                'case',
                ['==', ['get', 'congestion'], 'low'], '#4CAF50',
                ['==', ['get', 'congestion'], 'moderate'], '#FFC107',
                ['==', ['get', 'congestion'], 'heavy'], '#F44336',
                ['==', ['get', 'congestion'], 'severe'], '#9C27B0',
                '#808080',
              ],
            },
          });
        }
      });
    }
  }, [mapStyle]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute inset-0" />

      <div className="absolute top-4 left-4 flex gap-1.5 z-10">
        <Button
          variant={mapStyle === 'streets' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('streets')}
          className="shadow-lg px-2 lg:px-3"
          title="Street"
        >
          <MapIcon className="h-4 w-4 lg:mr-2" />
          <span className="hidden lg:inline">Street</span>
        </Button>
        <Button
          variant={mapStyle === 'satellite' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('satellite')}
          className="shadow-lg px-2 lg:px-3"
          title="Satellite"
        >
          <Satellite className="h-4 w-4 lg:mr-2" />
          <span className="hidden lg:inline">Satellite</span>
        </Button>
        <Button
          variant={mapStyle === 'traffic' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('traffic')}
          className="shadow-lg px-2 lg:px-3"
          title="Traffic"
        >
          <Layers className="h-4 w-4 lg:mr-2" />
          <span className="hidden lg:inline">Traffic</span>
        </Button>
      </div>

      {selectedVehicle && showDetailCard && (
        <>
          {/* Mobile/tablet: full-width card pinned to bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-10 lg:hidden px-2 pb-2">
            <VehicleDetailCard 
              vehicle={selectedVehicle} 
              onClose={onClearSelection}
              position={{ x: 0, y: 0 }}
              onPositionChange={() => {}}
              onOpenAIChat={() => {
                setAiChatVehicle(selectedVehicle);
                setShowAIChat(true);
              }}
            />
          </div>
          {/* Desktop: draggable floating card */}
          <div 
            className="absolute z-10 w-96 max-w-[90vw] hidden lg:block"
            style={{
              left: cardPosition.x === 0 ? '50%' : `${cardPosition.x}px`,
              bottom: cardPosition.y === 0 ? '2rem' : 'auto',
              top: cardPosition.y !== 0 ? `${cardPosition.y}px` : 'auto',
              transform: cardPosition.x === 0 ? 'translateX(-50%)' : 'none',
            }}
          >
            <VehicleDetailCard 
              vehicle={selectedVehicle} 
              onClose={onClearSelection}
              position={cardPosition}
              onPositionChange={setCardPosition}
              onOpenAIChat={() => {
                setAiChatVehicle(selectedVehicle);
                setShowAIChat(true);
              }}
            />
          </div>
        </>
      )}

      {/* AI Chat Window */}
      {showAIChat && aiChatVehicle && (
        <div className="absolute z-20 inset-x-2 top-2 bottom-2 lg:inset-auto lg:top-4 lg:right-4 lg:w-auto lg:bottom-auto">
          <VehicleAIChat 
            vehicle={aiChatVehicle} 
            onClose={() => {
              setShowAIChat(false);
              setAiChatVehicle(null);
            }} 
          />
        </div>
      )}
    </div>
  );
};

export default FleetMap;

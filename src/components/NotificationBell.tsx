import { Bell, AlertCircle, CheckCircle, Clock, Info, MapPin, Wrench, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { useTraccarEvents, TraccarEvent } from '@/hooks/useTraccarEvents';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'traccar_read_event_ids';

const EVENT_LABELS: Record<string, string> = {
  deviceOnline: 'Device Online',
  deviceOffline: 'Device Offline',
  deviceUnknown: 'Device Unknown',
  deviceStopped: 'Device Stopped',
  deviceMoving: 'Device Moving',
  deviceOverspeed: 'Overspeed',
  deviceFuelDrop: 'Fuel Drop',
  deviceFuelIncrease: 'Fuel Increase',
  geofenceEnter: 'Geofence Entered',
  geofenceExit: 'Geofence Exited',
  alarm: 'Alarm',
  ignitionOn: 'Ignition On',
  ignitionOff: 'Ignition Off',
  maintenance: 'Maintenance',
  driverChanged: 'Driver Changed',
};

const getIcon = (type: string) => {
  if (type === 'deviceOffline' || type === 'alarm')
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  if (type === 'deviceOverspeed' || type === 'deviceFuelDrop')
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  if (type === 'deviceOnline' || type === 'ignitionOn' || type === 'ignitionOff')
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (type === 'geofenceEnter' || type === 'geofenceExit')
    return <MapPin className="h-4 w-4 text-blue-500" />;
  if (type === 'maintenance')
    return <Wrench className="h-4 w-4 text-orange-500" />;
  if (type === 'driverChanged')
    return <Info className="h-4 w-4 text-purple-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
};

const getLabel = (event: TraccarEvent): string => {
  const base = EVENT_LABELS[event.type] ?? event.type;
  if (event.type === 'alarm' && event.attributes?.alarm) {
    return `Alarm: ${String(event.attributes.alarm)}`;
  }
  return base;
};

const loadReadIds = (): Set<number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set<number>(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const saveReadIds = (ids: Set<number>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
};

const NotificationBell = () => {
  const { data: events = [], isLoading, refetch } = useTraccarEvents();
  const qc = useQueryClient();
  const [readIds, setReadIds] = useState<Set<number>>(loadReadIds);

  const sorted = [...events].sort(
    (a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()
  );

  const unreadCount = sorted.filter(e => !readIds.has(e.id)).length;

  useEffect(() => {
    saveReadIds(readIds);
  }, [readIds]);

  const markAllRead = () => {
    const next = new Set(readIds);
    events.forEach(e => next.add(e.id));
    setReadIds(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">Events</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} · {events.length} total
            </p>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-primary hover:text-primary"
                onClick={markAllRead}
              >
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['traccar-events'] }); }}
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <ScrollArea className="h-96">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">{isLoading ? 'Loading events…' : 'No events'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sorted.map((event) => {
                const isUnread = !readIds.has(event.id);
                return (
                  <div
                    key={event.id}
                    className={`p-3 transition-colors cursor-pointer hover:bg-accent/50 ${isUnread ? 'bg-primary/5' : ''}`}
                    onClick={() => {
                      if (isUnread) setReadIds(prev => new Set([...prev, event.id]));
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{getIcon(event.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm leading-snug ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                            {event.deviceName ?? `Device #${event.deviceId}`}
                          </p>
                          {isUnread && (
                            <span className="inline-block h-2 w-2 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getLabel(event)}
                          {event.geofenceId ? ` · Geofence #${event.geofenceId}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(event.eventTime), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;

import { Bell, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '@/hooks/useAlerts';
import { alertsApi } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';

const NotificationBell = () => {
  const { data: alerts = [] } = useAlerts();
  const markRead = useMarkAlertRead();
  const markAllRead = useMarkAllAlertsRead();
  const qc = useQueryClient();

  const unreadCount = alerts.filter(a => !a.read).length;

  const deleteAlert = async (id: string) => {
    await alertsApi.delete(id);
    qc.invalidateQueries({ queryKey: ['alerts'] });
  };

  const getIcon = (type: string, severity?: string) => {
    if (type === 'alert' && severity === 'high') {
      return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    }
    if (type === 'alert' && severity === 'medium') {
      return <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    }
    if (type === 'status' || type === 'info') {
      return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
    return <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAllRead.mutate()}
              className="text-xs text-primary hover:text-primary"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 transition-colors hover:bg-accent/50 ${
                    !alert.read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => !alert.read && markRead.mutate(alert.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getIcon(alert.type, alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!alert.read ? 'font-medium' : ''}`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAlert(alert.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Wrench, 
  Search, 
  ChevronDown, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText,
  AlertTriangle,
  DollarSign,
  Plus,
  History,
  TrendingUp,
  Car,
  User,
  ClipboardList,
  Loader2,
  WifiOff
} from 'lucide-react';
import { mockVehicles } from '@/data/mockVehicles';
import { useToast } from '@/hooks/use-toast';
import { useVehicles } from '@/hooks/useVehicles';
import { useMaintenance, useCreateMaintenance, useUpdateMaintenance, MaintenanceOrder } from '@/hooks/useMaintenance';

type ViewType = 'schedule' | 'in-progress' | 'completed' | 'create' | 'breakdown' | 'cost';

interface NewOrderForm {
  traccar_device_id: string;
  type: string;
  priority: string;
  description: string;
  scheduled_date: string;
  cost: string;
  technician: string;
}

const EMPTY_FORM: NewOrderForm = { traccar_device_id: '', type: 'routine', priority: 'medium', description: '', scheduled_date: '', cost: '', technician: '' };

export default function Maintenance() {
  const [currentView, setCurrentView] = useState<ViewType>('schedule');
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [orderForm, setOrderForm] = useState<NewOrderForm>(EMPTY_FORM);
  const { toast } = useToast();

  const { data: orders = [], isLoading, isError } = useMaintenance();
  const createOrder = useCreateMaintenance();
  const updateOrder = useUpdateMaintenance();
  const { data: liveVehicles } = useVehicles();
  const vehicles = liveVehicles ?? mockVehicles;

  const viewOptions = [
    { value: 'schedule' as ViewType, label: 'Maintenance Schedule', icon: Wrench },
    { value: 'in-progress' as ViewType, label: 'In Progress', icon: Clock },
    { value: 'completed' as ViewType, label: 'Completed', icon: CheckCircle2 },
    { value: 'create' as ViewType, label: 'Create Order', icon: FileText },
    { value: 'breakdown' as ViewType, label: 'Breakdown Reports', icon: AlertTriangle },
    { value: 'cost' as ViewType, label: 'Maintenance Cost', icon: DollarSign },
  ];

  const currentViewLabel = viewOptions.find(opt => opt.value === currentView)?.label || 'Maintenance Schedule';

  const filteredOrders = orders.filter(order =>
    (order.vehicle_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400';
      case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'breakdown': return AlertTriangle;
      case 'inspection': return ClipboardList;
      default: return Wrench;
    }
  };

  const handleStartWork = async (order: MaintenanceOrder) => {
    try {
      await updateOrder.mutateAsync({ id: order.id, status: 'in-progress' });
      toast({ title: 'Work started', description: `${order.vehicle_name ?? order.description} moved to In Progress` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update order', variant: 'destructive' });
    }
  };

  const handleComplete = async (order: MaintenanceOrder) => {
    try {
      await updateOrder.mutateAsync({ id: order.id, status: 'completed', completed_date: new Date().toISOString().split('T')[0] });
      toast({ title: 'Order completed', description: `${order.vehicle_name ?? order.description} marked complete` });
    } catch {
      toast({ title: 'Error', description: 'Failed to complete order', variant: 'destructive' });
    }
  };

  const handleScheduleMaintenance = () => {
    setScheduleDialogOpen(true);
  };

  const handleViewHistory = () => {
    setHistoryDialogOpen(true);
  };

  const handleCreateOrder = () => {
    setCreateOrderDialogOpen(true);
  };

  const handleTrackCosts = () => {
    setCostDialogOpen(true);
  };

  const handleSubmitOrder = async () => {
    if (!orderForm.traccar_device_id) {
      toast({ title: 'Vehicle required', variant: 'destructive' });
      return;
    }
    try {
      await createOrder.mutateAsync({
        traccar_device_id: Number(orderForm.traccar_device_id),
        type: orderForm.type as MaintenanceOrder['type'],
        priority: orderForm.priority as MaintenanceOrder['priority'],
        description: orderForm.description || undefined,
        scheduled_date: orderForm.scheduled_date || undefined,
        cost: orderForm.cost ? Number(orderForm.cost) : undefined,
        technician: orderForm.technician || undefined,
      });
      toast({ title: 'Maintenance Order Created', description: 'Scheduled successfully.' });
      setCreateOrderDialogOpen(false);
      setScheduleDialogOpen(false);
      setOrderForm(EMPTY_FORM);
    } catch {
      toast({ title: 'Error', description: 'Failed to create order', variant: 'destructive' });
    }
  };

  const renderScheduleView = () => {
    const scheduledOrders = filteredOrders.filter(o => o.status === 'scheduled');
    
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {scheduledOrders.map((order) => {
          const TypeIcon = getTypeIcon(order.type);
          
          return (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{order.vehicle_name ?? order.description}</CardTitle>
                      <CardDescription>{order.description}</CardDescription>
                    </div>
                  </div>
                  <Badge className={getPriorityColor(order.priority)}>
                    {order.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Scheduled:</span>
                    <span className="font-medium">
                      {order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  {order.cost && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Estimated Cost:</span>
                      <span className="font-medium">${order.cost}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleStartWork(order)} disabled={updateOrder.isPending}>
                      {updateOrder.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                      Start Work
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Reschedule
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderInProgressView = () => {
    const inProgressOrders = filteredOrders.filter(o => o.status === 'in-progress');
    
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {inProgressOrders.map((order) => {
          const TypeIcon = getTypeIcon(order.type);
          
          return (
            <Card key={order.id} className="border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{order.vehicle_name ?? order.description}</CardTitle>
                      <CardDescription>{order.description}</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                    In Progress
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.technician && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Technician:</span>
                      <span className="font-medium">{order.technician}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Started:</span>
                    <span className="font-medium">
                      {order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  {order.cost && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-medium">${order.cost}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1" onClick={() => handleComplete(order)} disabled={updateOrder.isPending}>
                      {updateOrder.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                      Complete
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Update Status
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderCompletedView = () => {
    const completedOrders = filteredOrders.filter(o => o.status === 'completed');
    
    return (
      <div className="space-y-4">
        {completedOrders.map((order) => {
          const TypeIcon = getTypeIcon(order.type);
          
          return (
            <Card key={order.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <TypeIcon className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <h4 className="font-semibold">{order.vehicle_name ?? order.description}</h4>
                      <p className="text-sm text-muted-foreground">{order.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {order.technician && (
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Technician</div>
                        <div className="font-medium">{order.technician}</div>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Completed</div>
                      <div className="font-medium">
                        {order.completed_date && new Date(order.completed_date).toLocaleDateString()}
                      </div>
                    </div>
                    {order.cost && (
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Cost</div>
                        <div className="font-medium">${order.cost}</div>
                      </div>
                    )}
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderCreateOrderView = () => {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Maintenance Order</CardTitle>
          <CardDescription>Schedule maintenance for your fleet vehicles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle</Label>
              <Select value={orderForm.traccar_device_id} onValueChange={v => setOrderForm(p => ({ ...p, traccar_device_id: v }))}>
                <SelectTrigger id="vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                      {vehicle.name} - {vehicle.plateNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Maintenance Type</Label>
              <Select value={orderForm.type} onValueChange={v => setOrderForm(p => ({ ...p, type: v }))}>
                <SelectTrigger id="type"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine Maintenance</SelectItem>
                  <SelectItem value="breakdown">Breakdown Repair</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={orderForm.priority} onValueChange={v => setOrderForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger id="priority"><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Describe the maintenance work needed..." rows={3} value={orderForm.description} onChange={e => setOrderForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Scheduled Date</Label>
                <Input id="date" type="date" value={orderForm.scheduled_date} onChange={e => setOrderForm(p => ({ ...p, scheduled_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Estimated Cost ($)</Label>
                <Input id="cost" type="number" placeholder="0.00" value={orderForm.cost} onChange={e => setOrderForm(p => ({ ...p, cost: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="technician">Assign Technician (Optional)</Label>
              <Input id="technician" placeholder="Technician name" value={orderForm.technician} onChange={e => setOrderForm(p => ({ ...p, technician: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleSubmitOrder} disabled={createOrder.isPending}>
              {createOrder.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Maintenance Order
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBreakdownView = () => {
    const breakdownOrders = filteredOrders.filter(o => o.type === 'breakdown');
    
    return (
      <div className="space-y-4">
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Emergency Breakdown Reports
            </CardTitle>
            <CardDescription>
              Critical vehicle issues requiring immediate attention
            </CardDescription>
          </CardHeader>
        </Card>
        
        <div className="grid gap-4 md:grid-cols-2">
          {breakdownOrders.map((order) => (
            <Card key={order.id} className="border-red-200 dark:border-red-900">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{order.vehicle_name ?? order.description}</CardTitle>
                    <CardDescription>{order.description}</CardDescription>
                  </div>
                  <Badge className={getPriorityColor(order.priority)}>
                    {order.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className={
                      order.status === 'in-progress' 
                        ? 'text-blue-600' 
                        : order.status === 'completed'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }>
                      {order.status}
                    </Badge>
                  </div>
                  {order.technician && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Technician:</span>
                      <span className="font-medium">{order.technician}</span>
                    </div>
                  )}
                  {order.cost && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Repair Cost:</span>
                      <span className="font-medium">${order.cost}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderCostView = () => {
    const totalCost = orders.reduce((sum, order) => sum + (order.cost ?? 0), 0);
    const completedCost = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.cost ?? 0), 0);
    const inProgressCost = orders.filter(o => o.status === 'in-progress').reduce((sum, o) => sum + (o.cost ?? 0), 0);
    const scheduledCost = orders.filter(o => o.status === 'scheduled').reduce((sum, o) => sum + (o.cost ?? 0), 0);

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Maintenance Cost</CardDescription>
              <CardTitle className="text-2xl">${totalCost.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed Work</CardDescription>
              <CardTitle className="text-2xl text-green-600">${orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.cost ?? 0), 0).toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-2xl text-blue-600">${orders.filter(o => o.status === 'in-progress').reduce((s, o) => s + (o.cost ?? 0), 0).toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Scheduled</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">${orders.filter(o => o.status === 'scheduled').reduce((s, o) => s + (o.cost ?? 0), 0).toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Cost Breakdown</CardTitle>
            <CardDescription>Detailed expense tracking by vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vehicles.map((vehicle) => {
                const vehicleOrders = orders.filter(o => o.traccar_device_id === Number(vehicle.id));
                const vehicleCost = vehicleOrders.reduce((sum, order) => sum + (order.cost ?? 0), 0);
                
                if (vehicleCost === 0) return null;
                
                return (
                  <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-semibold">{vehicle.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {vehicleOrders.length} maintenance order{vehicleOrders.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">${vehicleCost.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {((vehicleCost / totalCost) * 100).toFixed(1)}% of total
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost by Maintenance Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  <span className="font-medium">Scheduled</span>
                </div>
                <div className="text-2xl font-semibold">
                  ${orders.filter(o => o.type === 'routine').reduce((s, o) => s + (o.cost ?? 0), 0).toLocaleString()}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Breakdowns</span>
                </div>
                <div className="text-2xl font-semibold text-red-600">
                  ${orders.filter(o => o.type === 'breakdown').reduce((s, o) => s + (o.cost ?? 0), 0).toLocaleString()}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Inspections</span>
                </div>
                <div className="text-2xl font-semibold">
                  ${orders.filter(o => o.type === 'inspection').reduce((s, o) => s + (o.cost ?? 0), 0).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderHistoryView = () => {
    return (
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {orders
          .filter(o => o.status === 'completed')
          .map((order) => (
            <div key={order.id} className="p-3 border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{order.vehicle_name ?? order.description}</div>
                  <div className="text-sm text-muted-foreground">{order.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Completed: {order.completed_date && new Date(order.completed_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${order.cost}</div>
                  {order.technician && (
                    <div className="text-xs text-muted-foreground">{order.technician}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto">
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Maintenance</h2>
            {isLoading && <div className="flex items-center gap-2 text-xs text-primary mt-1"><Loader2 className="h-3 w-3 animate-spin" />Loading orders...</div>}
            {isError && <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 mt-1"><WifiOff className="h-3 w-3" />Backend unavailable — showing mock data</div>}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            <Button variant="outline" size="sm" onClick={handleScheduleMaintenance}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewHistory}>
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={handleCreateOrder}>
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>
            <Button variant="outline" size="sm" onClick={handleTrackCosts}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Costs
            </Button>
            
            {/* View Selector */}
            <Popover open={viewDropdownOpen} onOpenChange={setViewDropdownOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[220px] justify-between">
                  {currentViewLabel}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2">
                <div className="space-y-1">
                  {viewOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.value}
                        variant={currentView === option.value ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => {
                          setCurrentView(option.value);
                          setViewDropdownOpen(false);
                        }}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search maintenance orders or vehicles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {currentView === 'schedule' && renderScheduleView()}
      {currentView === 'in-progress' && renderInProgressView()}
      {currentView === 'completed' && renderCompletedView()}
      {currentView === 'create' && renderCreateOrderView()}
      {currentView === 'breakdown' && renderBreakdownView()}
      {currentView === 'cost' && renderCostView()}

      {/* Schedule Maintenance Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogDescription>
              Set up a new maintenance task for your vehicle
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-vehicle">Vehicle</Label>
              <Select value={orderForm.traccar_device_id} onValueChange={v => setOrderForm(p => ({ ...p, traccar_device_id: v }))}>
                <SelectTrigger id="schedule-vehicle">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                      {vehicle.name} - {vehicle.plateNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-date">Date</Label>
              <Input id="schedule-date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-type">Service Type</Label>
              <Select>
                <SelectTrigger id="schedule-type">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oil">Oil Change</SelectItem>
                  <SelectItem value="tires">Tire Service</SelectItem>
                  <SelectItem value="brakes">Brake Service</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              handleSubmitOrder();
              setScheduleDialogOpen(false);
            }}>
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Maintenance History</DialogTitle>
            <DialogDescription>
              Complete service records for all vehicles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {orders
              .filter(o => o.status === 'completed')
              .map((order) => (
                <div key={order.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{order.vehicle_name ?? order.description}</div>
                      <div className="text-sm text-muted-foreground">{order.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Completed: {order.completed_date && new Date(order.completed_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${order.cost}</div>
                      {order.technician && (
                        <div className="text-xs text-muted-foreground">{order.technician}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog (Quick Action) */}
      <Dialog open={createOrderDialogOpen} onOpenChange={setCreateOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Create Maintenance Order</DialogTitle>
            <DialogDescription>
              Quickly schedule a new maintenance task
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the work needed..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              handleSubmitOrder();
              setCreateOrderDialogOpen(false);
            }}>
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Track Costs Dialog */}
      <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Maintenance Cost Summary
            </DialogTitle>
            <DialogDescription>
              Overview of maintenance expenses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Spent</div>
                <div className="text-2xl font-bold">
                  ${orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.cost ?? 0), 0).toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="text-sm text-muted-foreground">Avg Cost per Order</div>
                <div className="text-2xl font-bold">
                  ${Math.round(
                    orders.filter(o => o.cost).reduce((sum, o) => sum + (o.cost ?? 0), 0) /
                    (orders.filter(o => o.cost).length || 1)
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Cost Distribution</div>
              {['routine', 'breakdown', 'inspection'].map((type) => {
                const typeCost = orders
                  .filter(o => o.type === type)
                  .reduce((sum, o) => sum + (o.cost ?? 0), 0);
                const total = orders.reduce((sum, o) => sum + (o.cost ?? 0), 0);
                const percentage = total > 0 ? (typeCost / total) * 100 : 0;
                
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{type}</span>
                      <span className="font-medium">${typeCost.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}

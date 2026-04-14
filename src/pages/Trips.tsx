import { useState } from "react";
import { Calendar, Download, Share2, Play, History, BarChart3, User, FileText, Clock, MapPin, AlertTriangle, Camera, Mail, MessageSquare, Bell, ChevronDown, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export default function Trips() {
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState("today");
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [currentView, setCurrentView] = useState("active");

  // Mock data
  const vehicles = ["VH-001", "VH-002", "VH-003", "VH-004", "VH-005"];
  const eventOptions = [
    { id: "stops", label: "Show Stops", icon: MapPin },
    { id: "overspeeding", label: "Overspeeding", icon: AlertTriangle },
    { id: "idle", label: "Idle Time", icon: Clock },
    { id: "media", label: "Media Files", icon: Camera },
  ];
  const statusOptions = [
    { id: "inprogress", label: "In Progress", icon: Play },
    { id: "completed", label: "Completed", icon: FileText },
    { id: "lasttrip", label: "Last Trip", icon: History },
  ];
  
  const activeTrips = [
    { id: "T001", vehicle: "VH-001", driver: "John Doe", origin: "New York", destination: "Boston", status: "In Progress", progress: 65, eta: "2h 15m" },
    { id: "T002", vehicle: "VH-003", driver: "Jane Smith", origin: "Chicago", destination: "Detroit", status: "In Progress", progress: 40, eta: "3h 30m" },
  ];

  const tripHistory = [
    { id: "T100", vehicle: "VH-002", driver: "Mike Johnson", date: "2025-10-22", duration: "4h 30m", distance: "250 km", stops: 3, alerts: 2, avgSpeed: "55 km/h" },
    { id: "T101", vehicle: "VH-001", driver: "John Doe", date: "2025-10-21", duration: "3h 15m", distance: "180 km", stops: 2, alerts: 0, avgSpeed: "58 km/h" },
    { id: "T102", vehicle: "VH-004", driver: "Sarah Lee", date: "2025-10-21", duration: "5h 00m", distance: "320 km", stops: 4, alerts: 1, avgSpeed: "64 km/h" },
  ];

  const handleVehicleToggle = (vehicle: string) => {
    setSelectedVehicles(prev =>
      prev.includes(vehicle)
        ? prev.filter(v => v !== vehicle)
        : [...prev, vehicle]
    );
  };

  const handleEventToggle = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    );
  };

  const handleStatusToggle = (statusId: string) => {
    setSelectedStatus(prev =>
      prev.includes(statusId)
        ? prev.filter(s => s !== statusId)
        : [...prev, statusId]
    );
  };

  const handleDownloadReport = () => {
    toast.success("Trip report downloaded successfully");
  };

  const handleShareTrip = (method: string) => {
    toast.success(`Trip history shared via ${method}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">Trip Management</h2>
          <p className="text-muted-foreground">Manage and track vehicle trips</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <Select value={currentView} onValueChange={setCurrentView}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="active">
                <div className="flex items-center">
                  <Play className="h-4 w-4 mr-2" />
                  Active Trips
                </div>
              </SelectItem>
              <SelectItem value="history">
                <div className="flex items-center">
                  <History className="h-4 w-4 mr-2" />
                  Trip History
                </div>
              </SelectItem>
              <SelectItem value="analytics">
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Trip Analytics
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Vehicle & Time Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select vehicles, time range, and events to filter</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Select Vehicles</Label>
              <Popover open={vehicleDropdownOpen} onOpenChange={setVehicleDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedVehicles.length === 0 ? (
                      "Select vehicles..."
                    ) : (
                      <span className="truncate">
                        {selectedVehicles.length} vehicle(s) selected
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-3 bg-background z-50" align="start">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Select Vehicles</p>
                      {selectedVehicles.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-xs"
                          onClick={() => setSelectedVehicles([])}
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                    {vehicles.map(vehicle => (
                      <div key={vehicle} className="flex items-center space-x-2">
                        <Checkbox
                          id={`vehicle-${vehicle}`}
                          checked={selectedVehicles.includes(vehicle)}
                          onCheckedChange={() => handleVehicleToggle(vehicle)}
                        />
                        <label 
                          htmlFor={`vehicle-${vehicle}`} 
                          className="text-sm cursor-pointer flex-1"
                        >
                          {vehicle}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedVehicles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedVehicles.map(vehicle => (
                    <Badge key={vehicle} variant="secondary" className="text-xs">
                      {vehicle}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => handleVehicleToggle(vehicle)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Trip Status</Label>
              <Popover open={statusDropdownOpen} onOpenChange={setStatusDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedStatus.length === 0 ? (
                      "Select status..."
                    ) : (
                      <span className="truncate">
                        {selectedStatus.length} status selected
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-3 bg-background z-50" align="start">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Select Status</p>
                      {selectedStatus.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-xs"
                          onClick={() => setSelectedStatus([])}
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                    {statusOptions.map(status => {
                      const Icon = status.icon;
                      return (
                        <div key={status.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status.id}`}
                            checked={selectedStatus.includes(status.id)}
                            onCheckedChange={() => handleStatusToggle(status.id)}
                          />
                          <label 
                            htmlFor={`status-${status.id}`} 
                            className="text-sm cursor-pointer flex items-center flex-1"
                          >
                            <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                            {status.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedStatus.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedStatus.map(statusId => {
                    const status = statusOptions.find(s => s.id === statusId);
                    if (!status) return null;
                    const Icon = status.icon;
                    return (
                      <Badge key={statusId} variant="secondary" className="text-xs">
                        <Icon className="h-3 w-3 mr-1" />
                        {status.label}
                        <X 
                          className="h-3 w-3 ml-1 cursor-pointer" 
                          onClick={() => handleStatusToggle(statusId)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="hour">Last Hour</SelectItem>
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
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="datetime-local" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="datetime-local" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Event Filters</Label>
            <Popover open={eventsDropdownOpen} onOpenChange={setEventsDropdownOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {selectedEvents.length === 0 ? (
                    "Select event filters..."
                  ) : (
                    <span className="truncate">
                      {selectedEvents.length} filter(s) selected
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-3 bg-background z-50" align="start">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Select Filters</p>
                    {selectedEvents.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 text-xs"
                        onClick={() => setSelectedEvents([])}
                      >
                        Clear all
                      </Button>
                    )}
                  </div>
                  {eventOptions.map(event => {
                    const Icon = event.icon;
                    return (
                      <div key={event.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`event-${event.id}`}
                          checked={selectedEvents.includes(event.id)}
                          onCheckedChange={() => handleEventToggle(event.id)}
                        />
                        <label 
                          htmlFor={`event-${event.id}`} 
                          className="text-sm cursor-pointer flex items-center flex-1"
                        >
                          <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                          {event.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            {selectedEvents.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedEvents.map(eventId => {
                  const event = eventOptions.find(e => e.id === eventId);
                  if (!event) return null;
                  const Icon = event.icon;
                  return (
                    <Badge key={eventId} variant="secondary" className="text-xs">
                      <Icon className="h-3 w-3 mr-1" />
                      {event.label}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => handleEventToggle(eventId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content based on selected view */}
      <div className="space-y-4">
        {/* Active Trips */}
        {currentView === "active" && (
          <div className="space-y-4">
            <div className="grid gap-4">
              {activeTrips.map(trip => (
                <Card key={trip.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{trip.vehicle} - {trip.driver}</CardTitle>
                        <CardDescription>{trip.origin} → {trip.destination}</CardDescription>
                      </div>
                      <Badge className="bg-green-500">{trip.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress: {trip.progress}%</span>
                      <span className="font-medium">ETA: {trip.eta}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${trip.progress}%` }} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <User className="h-4 w-4 mr-2" />
                        Contact Driver
                      </Button>
                      <Button size="sm" variant="outline">
                        <MapPin className="h-4 w-4 mr-2" />
                        Track Live
                      </Button>
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Trip History */}
        {currentView === "history" && (
          <div className="space-y-4">
            <div className="grid gap-4">
            {tripHistory.map(trip => (
              <Card key={trip.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{trip.vehicle} - {trip.driver}</CardTitle>
                      <CardDescription>{trip.date}</CardDescription>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedTrip(trip.id)}>
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Trip Details - {trip.id}</DialogTitle>
                          <DialogDescription>Complete trip information and historical route</DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          {/* Trip Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Duration</p>
                              <p className="font-semibold">{trip.duration}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Distance</p>
                              <p className="font-semibold">{trip.distance}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Stops</p>
                              <p className="font-semibold">{trip.stops}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Avg Speed</p>
                              <p className="font-semibold">{trip.avgSpeed}</p>
                            </div>
                          </div>

                          {/* Historical Route Map Placeholder */}
                          <div className="border rounded-lg p-6 bg-muted/20">
                            <div className="flex items-center justify-center h-64 text-muted-foreground">
                              <div className="text-center">
                                <MapPin className="h-12 w-12 mx-auto mb-2" />
                                <p>Historical Route Map</p>
                                <p className="text-sm">Route visualization will appear here</p>
                              </div>
                            </div>
                          </div>

                          {/* Time Range Selection for History */}
                          <div>
                            <Label>View Route By</Label>
                            <Select defaultValue="day">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hour">Hourly</SelectItem>
                                <SelectItem value="day">Daily</SelectItem>
                                <SelectItem value="week">Weekly</SelectItem>
                                <SelectItem value="month">Monthly</SelectItem>
                                <SelectItem value="custom">Custom Range</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Share Options */}
                          <div className="space-y-2">
                            <Label>Share Trip History</Label>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleShareTrip("Email")}>
                                <Mail className="h-4 w-4 mr-2" />
                                Email
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleShareTrip("SMS")}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                SMS
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleShareTrip("Push")}>
                                <Bell className="h-4 w-4 mr-2" />
                                Push
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                toast.success("Link copied to clipboard");
                              }}>
                                <Share2 className="h-4 w-4 mr-2" />
                                Copy Link
                              </Button>
                            </div>
                          </div>

                          {/* Alerts in Duration */}
                          {trip.alerts > 0 && (
                            <div className="space-y-2">
                              <Label>Alerts ({trip.alerts})</Label>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 p-2 border rounded-lg">
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">Overspeeding Detected</p>
                                    <p className="text-xs text-muted-foreground">Speed: 95 km/h at 10:30 AM</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Media Files */}
                          <div className="space-y-2">
                            <Label>Media Files</Label>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="border rounded-lg p-4 text-center hover:bg-accent cursor-pointer">
                                <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-xs">Camera 1</p>
                                <p className="text-xs text-muted-foreground">10:15 AM</p>
                              </div>
                              <div className="border rounded-lg p-4 text-center hover:bg-accent cursor-pointer">
                                <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-xs">Camera 2</p>
                                <p className="text-xs text-muted-foreground">11:30 AM</p>
                              </div>
                              <div className="border rounded-lg p-4 text-center hover:bg-accent cursor-pointer">
                                <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-xs">Camera 3</p>
                                <p className="text-xs text-muted-foreground">02:45 PM</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">{trip.duration}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Distance</p>
                      <p className="font-medium">{trip.distance}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stops</p>
                      <p className="font-medium">{trip.stops}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Alerts</p>
                      <p className="font-medium">{trip.alerts}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Speed</p>
                      <p className="font-medium">{trip.avgSpeed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          </div>
        )}

        {/* Trip Analytics */}
        {currentView === "analytics" && (
          <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Trips</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">124</div>
                <p className="text-sm text-green-500">+12% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Distance</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">15,240 km</div>
                <p className="text-sm text-green-500">+8% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avg Efficiency</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">87%</div>
                <p className="text-sm text-yellow-500">-2% from last month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Detailed trip analytics and insights</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p>Analytics charts will appear here</p>
              </div>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </div>
  );
}

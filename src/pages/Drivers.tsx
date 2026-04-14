import { useState } from "react";
import { Users, BarChart3, Car, FileText, Trophy, Phone, MessageSquare, UserPlus, Mail, MapPin, Clock, CheckCircle, AlertCircle, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function Drivers() {
  const [currentView, setCurrentView] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  // Mock data
  const drivers = [
    { 
      id: "D001", 
      name: "John Doe", 
      phone: "+1-555-0101", 
      email: "john@fleet.com",
      vehicle: "VH-001",
      status: "active",
      score: 92,
      trips: 145,
      rating: 4.8,
      license: "DL-123456",
      experience: "5 years",
      avatar: ""
    },
    { 
      id: "D002", 
      name: "Jane Smith", 
      phone: "+1-555-0102", 
      email: "jane@fleet.com",
      vehicle: "VH-003",
      status: "active",
      score: 88,
      trips: 132,
      rating: 4.6,
      license: "DL-789012",
      experience: "3 years",
      avatar: ""
    },
    { 
      id: "D003", 
      name: "Mike Johnson", 
      phone: "+1-555-0103", 
      email: "mike@fleet.com",
      vehicle: "VH-002",
      status: "inactive",
      score: 95,
      trips: 198,
      rating: 4.9,
      license: "DL-345678",
      experience: "7 years",
      avatar: ""
    },
    { 
      id: "D004", 
      name: "Sarah Lee", 
      phone: "+1-555-0104", 
      email: "sarah@fleet.com",
      vehicle: "VH-004",
      status: "active",
      score: 85,
      trips: 87,
      rating: 4.5,
      license: "DL-901234",
      experience: "2 years",
      avatar: ""
    },
  ];

  const documents = [
    { type: "Driver's License", status: "valid", expiry: "2026-12-31" },
    { type: "Insurance", status: "valid", expiry: "2025-06-30" },
    { type: "Medical Certificate", status: "expiring", expiry: "2025-11-15" },
    { type: "Background Check", status: "valid", expiry: "2026-03-20" },
  ];

  const leaderboard = [...drivers].sort((a, b) => b.score - a.score);

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = (driverId: string, driverName: string) => {
    toast.success(`Message dialog opened for ${driverName}`);
  };

  const handleAssignTrip = (driverId: string, driverName: string) => {
    toast.success(`Trip assignment dialog opened for ${driverName}`);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">Driver Management</h2>
          <p className="text-muted-foreground">Manage drivers and track performance</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <Select value={currentView} onValueChange={setCurrentView}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="list">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Driver List
                </div>
              </SelectItem>
              <SelectItem value="performance">
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Performance
                </div>
              </SelectItem>
              <SelectItem value="assignments">
                <div className="flex items-center">
                  <Car className="h-4 w-4 mr-2" />
                  Assignments
                </div>
              </SelectItem>
              <SelectItem value="documents">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Documents
                </div>
              </SelectItem>
              <SelectItem value="leaderboard">
                <div className="flex items-center">
                  <Trophy className="h-4 w-4 mr-2" />
                  Leaderboard
                </div>
              </SelectItem>
              <SelectItem value="contacts">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  Contacts
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Driver
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {(currentView === "list" || currentView === "contacts") && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search drivers by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Driver List */}
      {currentView === "list" && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDrivers.map(driver => (
            <Card key={driver.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={driver.avatar} />
                      <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{driver.name}</CardTitle>
                      <CardDescription>{driver.id}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={driver.status === "active" ? "default" : "secondary"}>
                    {driver.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Vehicle</p>
                    <p className="font-medium">{driver.vehicle}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Performance</p>
                    <p className="font-medium">{driver.score}/100</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Trips</p>
                    <p className="font-medium">{driver.trips}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rating</p>
                    <p className="font-medium">⭐ {driver.rating}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Users className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Driver Details - {driver.name}</DialogTitle>
                        <DialogDescription>Complete driver information and performance</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-20 w-20">
                            <AvatarImage src={driver.avatar} />
                            <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold">{driver.name}</h3>
                            <p className="text-muted-foreground">{driver.id}</p>
                            <Badge variant={driver.status === "active" ? "default" : "secondary"} className="mt-1">
                              {driver.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Phone</Label>
                            <p className="text-sm">{driver.phone}</p>
                          </div>
                          <div>
                            <Label>Email</Label>
                            <p className="text-sm">{driver.email}</p>
                          </div>
                          <div>
                            <Label>License Number</Label>
                            <p className="text-sm">{driver.license}</p>
                          </div>
                          <div>
                            <Label>Experience</Label>
                            <p className="text-sm">{driver.experience}</p>
                          </div>
                        </div>

                        <div>
                          <Label>Performance Score</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Progress value={driver.score} className="flex-1" />
                            <span className="text-sm font-medium">{driver.score}%</span>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleSendMessage(driver.id, driver.name)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  
                  <Button 
                    size="sm"
                    onClick={() => handleAssignTrip(driver.id, driver.name)}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Assign Trip
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Performance View */}
      {currentView === "performance" && (
        <div className="grid gap-4">
          {drivers.map(driver => (
            <Card key={driver.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={driver.avatar} />
                      <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{driver.name}</CardTitle>
                      <CardDescription>{driver.vehicle}</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{driver.score}</div>
                    <p className="text-xs text-muted-foreground">Efficiency Score</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Performance</span>
                    <span className="font-medium">{driver.score}%</span>
                  </div>
                  <Progress value={driver.score} />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Trips</p>
                    <p className="text-xl font-semibold">{driver.trips}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rating</p>
                    <p className="text-xl font-semibold">{driver.rating}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={driver.status === "active" ? "default" : "secondary"}>
                      {driver.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assignments View */}
      {currentView === "assignments" && (
        <div className="grid gap-4">
          {drivers.filter(d => d.status === "active").map(driver => (
            <Card key={driver.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={driver.avatar} />
                      <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{driver.name}</CardTitle>
                      <CardDescription>{driver.id}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="default">
                    <Car className="h-3 w-3 mr-1" />
                    {driver.vehicle}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <p className="text-muted-foreground">Currently assigned to vehicle</p>
                    <p className="font-medium text-lg">{driver.vehicle}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Car className="h-4 w-4 mr-2" />
                      Reassign
                    </Button>
                    <Button size="sm">
                      <MapPin className="h-4 w-4 mr-2" />
                      Assign Trip
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Documents View */}
      {currentView === "documents" && (
        <div className="grid gap-4">
          {drivers.map(driver => (
            <Card key={driver.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={driver.avatar} />
                    <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{driver.name}</CardTitle>
                    <CardDescription>License: {driver.license}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{doc.type}</p>
                          <p className="text-xs text-muted-foreground">Expires: {doc.expiry}</p>
                        </div>
                      </div>
                      <Badge variant={doc.status === "valid" ? "default" : "destructive"}>
                        {doc.status === "valid" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {doc.status === "expiring" && <AlertCircle className="h-3 w-3 mr-1" />}
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Leaderboard View */}
      {currentView === "leaderboard" && (
        <div className="grid gap-4">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Top Performers
              </CardTitle>
              <CardDescription>Driver performance rankings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((driver, index) => (
                  <div key={driver.id} className="flex items-center gap-4 p-3 rounded-lg border bg-background">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-bold">
                      {index === 0 && "🥇"}
                      {index === 1 && "🥈"}
                      {index === 2 && "🥉"}
                      {index > 2 && `#${index + 1}`}
                    </div>
                    <Avatar>
                      <AvatarImage src={driver.avatar} />
                      <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{driver.name}</p>
                      <p className="text-xs text-muted-foreground">{driver.trips} trips completed</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{driver.score}</div>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contacts View */}
      {currentView === "contacts" && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDrivers.map(driver => (
            <Card key={driver.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={driver.avatar} />
                    <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{driver.name}</CardTitle>
                    <CardDescription>{driver.id}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${driver.phone}`} className="hover:underline">{driver.phone}</a>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${driver.email}`} className="hover:underline">{driver.email}</a>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1" asChild>
                    <a href={`tel:${driver.phone}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </a>
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleSendMessage(driver.id, driver.name)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

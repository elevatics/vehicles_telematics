import { useState } from "react";
import { Users, Trophy, UserPlus, Search, Loader2, WifiOff, Trash2, Pencil, IdCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useTraccarDrivers,
  useCreateTraccarDriver,
  useUpdateTraccarDriver,
  useDeleteTraccarDriver,
  TraccarDriver,
} from "@/hooks/useDrivers";

const BLANK_FORM = { name: '', uniqueId: '' };

export default function Drivers() {
  const [currentView, setCurrentView] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<TraccarDriver | null>(null);
  const [form, setForm] = useState(BLANK_FORM);

  const { data: drivers = [], isLoading, isError } = useTraccarDrivers();
  const createDriver = useCreateTraccarDriver();
  const updateDriver = useUpdateTraccarDriver();
  const deleteDriver = useDeleteTraccarDriver();

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.uniqueId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  const openAdd = () => { setForm(BLANK_FORM); setAddOpen(true); };

  const openEdit = (driver: TraccarDriver) => {
    setEditDriver(driver);
    setForm({ name: driver.name, uniqueId: driver.uniqueId });
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.uniqueId.trim()) {
      toast.error('Name and Unique ID are required');
      return;
    }
    try {
      await createDriver.mutateAsync(form);
      toast.success(`Driver "${form.name}" created in Traccar`);
      setAddOpen(false);
      setForm(BLANK_FORM);
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to create driver');
    }
  };

  const handleEdit = async () => {
    if (!editDriver) return;
    if (!form.name.trim() || !form.uniqueId.trim()) {
      toast.error('Name and Unique ID are required');
      return;
    }
    try {
      await updateDriver.mutateAsync({ id: editDriver.id, ...form });
      toast.success(`Driver "${form.name}" updated`);
      setEditDriver(null);
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to update driver');
    }
  };

  const handleDelete = async (driver: TraccarDriver) => {
    if (!confirm(`Delete driver "${driver.name}" from Traccar?`)) return;
    try {
      await deleteDriver.mutateAsync(driver.id);
      toast.success(`"${driver.name}" deleted`);
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to delete driver');
    }
  };

  const formFields = (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Full Name *</Label>
        <Input
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="John Smith"
        />
      </div>
      <div className="space-y-2">
        <Label>Unique ID *</Label>
        <Input
          value={form.uniqueId}
          onChange={e => setForm(p => ({ ...p, uniqueId: e.target.value }))}
          placeholder="e.g. DRV001 or iButton ID"
        />
        <p className="text-xs text-muted-foreground">
          This ID must match what the device sends as <code>driverUniqueId</code> (iButton/RFID), or any unique string.
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-medium">Driver Management</h2>
          {/* <p className="text-muted-foreground">Manage Traccar drivers — {drivers.length} registered</p> */}
        </div>
        <div className="flex gap-2 items-center">
          <Select value={currentView} onValueChange={setCurrentView}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="list">
                <div className="flex items-center"><Users className="h-4 w-4 mr-2" />Driver List</div>
              </SelectItem>
              <SelectItem value="leaderboard">
                <div className="flex items-center"><Trophy className="h-4 w-4 mr-2" />Leaderboard</div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openAdd}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Driver
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or unique ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Traccar drivers...
        </div>
      )}
      {isError && (
        <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
          <WifiOff className="h-4 w-4" />
          Could not reach backend — check Traccar connection
        </div>
      )}

      {/* Driver List */}
      {currentView === "list" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDrivers.length === 0 && !isLoading && (
            <p className="text-muted-foreground col-span-full text-center py-12">
              No drivers found. Add one via Traccar or the button above.
            </p>
          )}
          {filteredDrivers.map(driver => (
            <Card key={driver.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src="" />
                      <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{driver.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-0.5">
                        <IdCard className="h-3 w-3" />
                        {driver.uniqueId}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openEdit(driver)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(driver)}
                    disabled={deleteDriver.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Leaderboard View — sorted alphabetically since Traccar has no score */}
      {currentView === "leaderboard" && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Registered Drivers
            </CardTitle>
            <CardDescription>All Traccar drivers, sorted by name</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...drivers].sort((a, b) => a.name.localeCompare(b.name)).map((driver, index) => (
                <div key={driver.id} className="flex items-center gap-4 p-3 rounded-lg border bg-background">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted text-sm font-bold">
                    {index + 1}
                  </div>
                  <Avatar>
                    <AvatarImage src="" />
                    <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{driver.name}</p>
                    <p className="text-xs text-muted-foreground truncate">ID: {driver.uniqueId}</p>
                  </div>
                </div>
              ))}
              {drivers.length === 0 && !isLoading && (
                <p className="text-center text-muted-foreground py-8">No drivers registered in Traccar.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Driver Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Traccar Driver</DialogTitle>
            <DialogDescription>
              Creates a new driver directly in Traccar. Devices that send a matching
              <code className="mx-1 text-xs bg-muted px-1 py-0.5 rounded">driverUniqueId</code>
              will be linked automatically.
            </DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createDriver.isPending}>
              {createDriver.isPending
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <UserPlus className="h-4 w-4 mr-2" />}
              Create Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={!!editDriver} onOpenChange={(open) => { if (!open) setEditDriver(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>Update this driver's details in Traccar.</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDriver(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateDriver.isPending}>
              {updateDriver.isPending
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Pencil className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

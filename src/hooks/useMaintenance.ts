import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi, MaintenanceFilters } from '@/services/api';

export interface MaintenanceOrder {
  id: string;
  traccar_device_id?: number;
  vehicle_name?: string;
  type: 'routine' | 'repair' | 'inspection' | 'breakdown';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'in-progress' | 'completed';
  description?: string;
  scheduled_date?: string;
  completed_date?: string;
  technician?: string;
  cost?: number;
  notes?: string;
  created_at?: string;
}

export interface MaintenanceStats {
  total_cost: number;
  by_type: { type: string; count: number; total_cost: number }[];
  by_status: { status: string; count: number }[];
}

const MOCK_ORDERS: MaintenanceOrder[] = [
  { id: 'mo1', type: 'routine', description: 'Oil change and filter replacement', priority: 'medium', status: 'scheduled', scheduled_date: '2025-11-01', cost: 150, vehicle_name: 'Truck Alpha' },
  { id: 'mo2', type: 'breakdown', description: 'Brake system repair', priority: 'critical', status: 'in-progress', scheduled_date: '2025-10-25', technician: 'Mike Johnson', cost: 450, vehicle_name: 'Van Beta' },
  { id: 'mo3', type: 'routine', description: 'Tire rotation and alignment', priority: 'low', status: 'completed', scheduled_date: '2025-10-15', completed_date: '2025-10-15', cost: 200, technician: 'John Smith', vehicle_name: 'Truck Gamma' },
  { id: 'mo4', type: 'inspection', description: 'Annual safety inspection', priority: 'high', status: 'scheduled', scheduled_date: '2025-10-28', cost: 100, vehicle_name: 'Van Delta' },
  { id: 'mo5', type: 'breakdown', description: 'Engine overheating issue', priority: 'critical', status: 'in-progress', scheduled_date: '2025-10-24', technician: 'Sarah Williams', cost: 850, vehicle_name: 'Truck Epsilon' },
  { id: 'mo6', type: 'routine', description: 'Battery replacement', priority: 'medium', status: 'completed', scheduled_date: '2025-10-10', completed_date: '2025-10-10', cost: 180, technician: 'Mike Johnson', vehicle_name: 'Truck Alpha' },
];

export const useMaintenance = (filters?: MaintenanceFilters) =>
  useQuery<MaintenanceOrder[]>({
    queryKey: ['maintenance', filters],
    queryFn: async () => {
      const data = await maintenanceApi.getAll(filters) as MaintenanceOrder[];
      return data.length > 0 ? data : MOCK_ORDERS;
    },
    staleTime: 30000,
    retry: 2,
    placeholderData: MOCK_ORDERS,
  });

export const useMaintenanceStats = () =>
  useQuery<MaintenanceStats>({
    queryKey: ['maintenance-stats'],
    queryFn: () => maintenanceApi.getStats() as Promise<MaintenanceStats>,
    staleTime: 60000,
    retry: 1,
  });

export const useCreateMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<MaintenanceOrder>) => maintenanceApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      qc.invalidateQueries({ queryKey: ['maintenance-stats'] });
    },
  });
};

export const useUpdateMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<MaintenanceOrder> & { id: string }) =>
      maintenanceApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      qc.invalidateQueries({ queryKey: ['maintenance-stats'] });
    },
  });
};

export const useDeleteMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => maintenanceApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance'] }),
  });
};

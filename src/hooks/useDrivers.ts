import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driversApi, traccarDriversApi, TraccarDriver } from '@/services/api';

export type { TraccarDriver };

// ── Traccar Driver hooks ───────────────────────────────────────────────────────

export const useTraccarDrivers = () =>
  useQuery<TraccarDriver[]>({
    queryKey: ['traccar-drivers'],
    queryFn: () => traccarDriversApi.getAll(),
    staleTime: 30000,
    retry: 2,
  });

export const useCreateTraccarDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; uniqueId: string; attributes?: Record<string, unknown> }) =>
      traccarDriversApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['traccar-drivers'] }),
  });
};

export const useUpdateTraccarDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; name: string; uniqueId: string; attributes?: Record<string, unknown> }) =>
      traccarDriversApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['traccar-drivers'] }),
  });
};

export const useDeleteTraccarDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => traccarDriversApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['traccar-drivers'] }),
  });
};

export interface Driver {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  license_number?: string;
  license_expiry?: string;
  traccar_driver_id?: number;
  joined_date?: string;
  performance_score?: number;
  status: 'active' | 'inactive' | 'on_leave';
  traccar_data?: { id: number; uniqueId: string; name: string; attributes?: Record<string, unknown> } | null;
}

const MOCK_DRIVERS: Driver[] = [
  { id: 'D001', name: 'John Doe', email: 'john@fleet.com', phone: '+1-555-0101', license_number: 'DL-123456', license_expiry: '2026-12-31', performance_score: 92, status: 'active', joined_date: '2020-03-15' },
  { id: 'D002', name: 'Jane Smith', email: 'jane@fleet.com', phone: '+1-555-0102', license_number: 'DL-789012', license_expiry: '2025-08-20', performance_score: 88, status: 'active', joined_date: '2021-07-01' },
  { id: 'D003', name: 'Mike Johnson', email: 'mike@fleet.com', phone: '+1-555-0103', license_number: 'DL-345678', license_expiry: '2027-03-10', performance_score: 95, status: 'inactive', joined_date: '2018-11-20' },
  { id: 'D004', name: 'Sarah Lee', email: 'sarah@fleet.com', phone: '+1-555-0104', license_number: 'DL-901234', license_expiry: '2026-05-14', performance_score: 85, status: 'active', joined_date: '2022-02-10' },
];

export const useDrivers = () =>
  useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const data = await driversApi.getAll() as Driver[];
      return data.length > 0 ? data : MOCK_DRIVERS;
    },
    staleTime: 30000,
    retry: 2,
    placeholderData: MOCK_DRIVERS,
  });

export const useDriver = (id: string) =>
  useQuery<Driver>({
    queryKey: ['drivers', id],
    queryFn: () => driversApi.getOne(id) as Promise<Driver>,
    enabled: !!id,
  });

export const useCreateDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Driver>) => driversApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  });
};

export const useUpdateDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Driver> & { id: string }) => driversApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  });
};

export const useDeleteDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => driversApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  });
};

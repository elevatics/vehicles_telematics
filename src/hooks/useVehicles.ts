import { useQuery } from '@tanstack/react-query';
import { vehiclesApi } from '@/services/api';
import { Vehicle } from '@/types/vehicle';

export const useVehicles = () =>
  useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.getAll() as Promise<Vehicle[]>,
    refetchInterval: 15000,
    staleTime: 10000,
    retry: 2,
  });

export const useVehicle = (id: number) =>
  useQuery<Vehicle>({
    queryKey: ['vehicles', id],
    queryFn: () => vehiclesApi.getOne(id) as Promise<Vehicle>,
    enabled: !!id,
    refetchInterval: 15000,
  });

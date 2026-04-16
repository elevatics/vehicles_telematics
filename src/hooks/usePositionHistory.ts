import { useQuery } from '@tanstack/react-query';
import { positionsApi, TraccarPosition } from '@/services/api';

export type { TraccarPosition };

export const usePositionHistory = (deviceId: number | null, from: string, to: string) =>
  useQuery<TraccarPosition[]>({
    queryKey: ['positions', deviceId, from, to],
    queryFn: () => positionsApi.getHistory(deviceId!, from, to),
    enabled: !!deviceId && !!from && !!to,
    staleTime: 10000,
    refetchInterval: 15000,
  });

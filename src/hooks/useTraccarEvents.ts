import { useQuery } from '@tanstack/react-query';
import { traccarEventsApi, TraccarEvent } from '@/services/api';

export type { TraccarEvent };

export const useTraccarEvents = (params?: { deviceId?: number; from?: string; to?: string; type?: string }) =>
  useQuery<TraccarEvent[]>({
    queryKey: ['traccar-events', params],
    queryFn: () => traccarEventsApi.getAll(params),
    staleTime: 15000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    retryOnMount: true,
    retry: 2,
  });

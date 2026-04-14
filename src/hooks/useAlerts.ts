import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi, ApiAlert } from '@/services/api';

export const useAlerts = (filters?: { read?: boolean; severity?: string }) =>
  useQuery<ApiAlert[]>({
    queryKey: ['alerts', filters],
    queryFn: () => alertsApi.getAll(filters),
    refetchInterval: 30000,
    staleTime: 15000,
  });

export const useUnreadAlertCount = () =>
  useQuery<{ count: number }>({
    queryKey: ['alerts', 'unread-count'],
    queryFn: () => alertsApi.getUnreadCount(),
    refetchInterval: 30000,
  });

export const useMarkAlertRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

export const useMarkAllAlertsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => alertsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

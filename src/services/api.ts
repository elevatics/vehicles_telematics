const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getToken = (): string | null => localStorage.getItem('fleet_token');

const headers = (): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers ?? {}) },
  });

  if (res.status === 401) {
    localStorage.removeItem('fleet_token');
    localStorage.removeItem('fleet_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
};

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload {
  email: string; password: string;
  full_name: string; role: string; phone?: string;
}
export interface AuthUser {
  id: string; email: string; full_name: string;
  role: string; phone?: string; avatar_url?: string; created_at: string;
}
export interface AuthResponse { token: string; user: AuthUser; }

export const authApi = {
  login: (body: LoginPayload) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  register: (body: RegisterPayload) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  me: () => request<AuthUser>('/api/auth/me'),

  updateMe: (body: Partial<AuthUser>) =>
    request<AuthUser>('/api/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),

  changePassword: (current_password: string, new_password: string) =>
    request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),
};

// ── Vehicles ──────────────────────────────────────────────────────────────────

export const vehiclesApi = {
  getAll: () => request<unknown[]>('/api/vehicles'),
  getOne: (id: number) => request<unknown>(`/api/vehicles/${id}`),
};

// ── Drivers ───────────────────────────────────────────────────────────────────

export const driversApi = {
  getAll: () => request<unknown[]>('/api/drivers'),
  getOne: (id: string) => request<unknown>(`/api/drivers/${id}`),
  create: (body: unknown) =>
    request<unknown>('/api/drivers', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: unknown) =>
    request<unknown>(`/api/drivers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<unknown>(`/api/drivers/${id}`, { method: 'DELETE' }),
};

// ── Traccar Drivers (direct Traccar CRUD) ─────────────────────────────────────

export interface TraccarDriver {
  id: number;
  name: string;
  uniqueId: string;
  attributes?: Record<string, unknown>;
}

export const traccarDriversApi = {
  getAll: () => request<TraccarDriver[]>('/api/driverlists'),
  create: (body: { name: string; uniqueId: string; attributes?: Record<string, unknown> }) =>
    request<TraccarDriver>('/api/driverlists', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { name: string; uniqueId: string; attributes?: Record<string, unknown> }) =>
    request<TraccarDriver>(`/api/driverlists/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: number) =>
    request(`/api/driverlists/${id}`, { method: 'DELETE' }),
};

// ── Traccar Events ────────────────────────────────────────────────────────────

export interface TraccarEvent {
  id: number;
  type: string;
  eventTime: string;
  deviceId: number;
  deviceName?: string;
  positionId: number;
  geofenceId?: number;
  maintenanceId?: number;
  attributes: Record<string, unknown>;
}

export const traccarEventsApi = {
  getAll: (params?: { deviceId?: number; from?: string; to?: string; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.deviceId) q.set('deviceId', String(params.deviceId));
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.type) q.set('type', params.type);
    const qs = q.toString();
    return request<TraccarEvent[]>(`/api/events${qs ? `?${qs}` : ''}`);
  },
};

// ── Positions ─────────────────────────────────────────────────────────────────

export interface TraccarPosition {
  id: number;
  deviceId: number;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  accuracy: number;
  attributes: Record<string, unknown>;
}

export const positionsApi = {
  getHistory: (deviceId: number, from: string, to: string) =>
    request<TraccarPosition[]>(`/api/positions?deviceId=${deviceId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
};

// ── Maintenance ───────────────────────────────────────────────────────────────

export interface MaintenanceFilters {
  status?: string; device_id?: number; priority?: string;
}

export const maintenanceApi = {
  getAll: (filters?: MaintenanceFilters) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.device_id) params.set('device_id', String(filters.device_id));
    if (filters?.priority) params.set('priority', filters.priority);
    const qs = params.toString();
    return request<unknown[]>(`/api/maintenance${qs ? `?${qs}` : ''}`);
  },
  getOne: (id: string) => request<unknown>(`/api/maintenance/${id}`),
  getStats: () => request<unknown>('/api/maintenance/stats/summary'),
  create: (body: unknown) =>
    request<unknown>('/api/maintenance', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: unknown) =>
    request<unknown>(`/api/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<unknown>(`/api/maintenance/${id}`, { method: 'DELETE' }),
};

// ── Alerts ────────────────────────────────────────────────────────────────────

export interface AlertFilters { read?: boolean; device_id?: number; severity?: string; }
export interface ApiAlert {
  id: string; traccar_device_id?: number;
  type: 'alert' | 'info' | 'trip' | 'status';
  message: string; severity: 'low' | 'medium' | 'high';
  read: boolean; created_at: string;
}

export const alertsApi = {
  getAll: (filters?: AlertFilters) => {
    const params = new URLSearchParams();
    if (filters?.read !== undefined) params.set('read', String(filters.read));
    if (filters?.device_id) params.set('device_id', String(filters.device_id));
    if (filters?.severity) params.set('severity', filters.severity);
    const qs = params.toString();
    return request<ApiAlert[]>(`/api/alerts${qs ? `?${qs}` : ''}`);
  },
  getUnreadCount: () => request<{ count: number }>('/api/alerts/unread-count'),
  markRead: (id: string) =>
    request<ApiAlert>(`/api/alerts/${id}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    request('/api/alerts/read-all', { method: 'PATCH' }),
  delete: (id: string) =>
    request(`/api/alerts/${id}`, { method: 'DELETE' }),
};

// ── Finance ───────────────────────────────────────────────────────────────────

export const financeApi = {
  getAll: (filters?: { type?: string; device_id?: number; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.device_id) params.set('device_id', String(filters.device_id));
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    const qs = params.toString();
    return request<unknown[]>(`/api/finance${qs ? `?${qs}` : ''}`);
  },
  getSummary: () => request<unknown>('/api/finance/summary'),
  create: (body: unknown) =>
    request<unknown>('/api/finance', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: unknown) =>
    request<unknown>(`/api/finance/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) =>
    request<unknown>(`/api/finance/${id}`, { method: 'DELETE' }),
};

// ── Trips ─────────────────────────────────────────────────────────────────────

export const tripsApi = {
  getTrips: (deviceId: number, from: string, to: string) =>
    request<unknown[]>(`/api/trips?deviceId=${deviceId}&from=${from}&to=${to}`),
  getRoute: (deviceId: number, from: string, to: string) =>
    request<unknown[]>(`/api/trips/route?deviceId=${deviceId}&from=${from}&to=${to}`),
  getSummary: (deviceId: number, from: string, to: string) =>
    request<unknown[]>(`/api/trips/summary?deviceId=${deviceId}&from=${from}&to=${to}`),
  getEvents: (deviceId: number, from: string, to: string, type?: string) => {
    const qs = type ? `&type=${type}` : '';
    return request<unknown[]>(`/api/trips/events?deviceId=${deviceId}&from=${from}&to=${to}${qs}`);
  },
};

// ── Commands ──────────────────────────────────────────────────────────────────

export interface SendCommandPayload {
  deviceId: number;
  type: 'custom' | 'sendSms' | 'message' | 'engineStop' | 'engineResume' | 'positionSingle';
  attributes?: Record<string, unknown>;
}

export const commandsApi = {
  send: (body: SendCommandPayload) =>
    request<unknown>('/api/commands/send', { method: 'POST', body: JSON.stringify(body) }),
  getTypes: (deviceId: number) =>
    request<{ type: string }[]>(`/api/commands/types?deviceId=${deviceId}`),
};

// ── Geofences ─────────────────────────────────────────────────────────────────

export interface TraccarGeofence {
  id: number;
  name: string;
  description?: string;
  area: string;
  calendarId?: number;
  attributes?: Record<string, unknown>;
}

export const geofencesApi = {
  getAll: () => request<TraccarGeofence[]>('/api/geofences'),
  create: (body: { name: string; description?: string; area: string; attributes?: Record<string, unknown> }) =>
    request<TraccarGeofence>('/api/geofences', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { name: string; description?: string; area: string; attributes?: Record<string, unknown> }) =>
    request<TraccarGeofence>(`/api/geofences/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: number) =>
    request(`/api/geofences/${id}`, { method: 'DELETE' }),
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reportsApi = {
  fleetReport: (from: string, to: string) =>
    request<unknown>(`/api/reports/fleet?from=${from}&to=${to}`),
  vehicleReport: (deviceId: number, from: string, to: string) =>
    request<unknown>(`/api/reports/vehicle?deviceId=${deviceId}&from=${from}&to=${to}`),
  financialReport: (from: string, to: string) =>
    request<unknown>(`/api/reports/financial?from=${from}&to=${to}`),
  getScheduled: () => request<unknown[]>('/api/reports/scheduled'),
  createScheduled: (body: unknown) =>
    request<unknown>('/api/reports/scheduled', { method: 'POST', body: JSON.stringify(body) }),
  deleteScheduled: (id: string) =>
    request(`/api/reports/scheduled/${id}`, { method: 'DELETE' }),
};

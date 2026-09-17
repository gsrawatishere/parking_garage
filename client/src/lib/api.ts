const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export type User = {
  id: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
};
export type Garage = {
  id: string;
  name: string;
  address: string;
  timezone: string;
  status: string;
  _count?: { floors: number; spots: number; tickets: number };
};
export type Spot = {
  id: string;
  spotNumber: string;
  type: string;
  status: string;
  label?: string;
  floor?: { id: string; name: string; level: number };
};
export type Ticket = {
  id: string;
  status: string;
  checkedInAt: string;
  checkedOutAt?: string;
  totalAmount?: string | number;
  currency: string;
  vehicle: { plateNumber: string; vehicleType: string };
  spot: { spotNumber: string; type: string };
  garage?: Garage;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(body.message || "Request failed.", response.status);
  return body as T;
}

export const api = {
  login: (body: object) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  register: (body: object) =>
    request<{ user: User; tenant: { id: string; name: string } }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify(body) },
    ),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  garages: () => request<{ garages: Garage[] }>("/api/garages"),
  createGarage: (body: object) =>
    request<{ garage: Garage }>("/api/garages", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  floors: (garageId: string) =>
    request<{
      floors: Array<{
        id: string;
        name: string;
        level: number;
        _count: { spots: number };
      }>;
    }>(`/api/floors/garage/${garageId}`),
  createFloor: (garageId: string, body: object) =>
    request(`/api/floors/garage/${garageId}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  spots: (garageId: string) =>
    request<{ spots: Spot[] }>(`/api/spots/garage/${garageId}`),
  availability: (garageId: string) =>
    request<{ availability: Record<string, Record<string, number>> }>(
      `/api/spots/garage/${garageId}/availability`,
    ),
  createSpot: (garageId: string, body: object) =>
    request(`/api/spots/garage/${garageId}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  ratePolicies: (garageId: string) =>
    request<{
      policies: Array<{
        id: string;
        name: string;
        firstHourRate: string;
        additionalHourRate: string;
        dailyCap: string;
        currency: string;
        isActive: boolean;
      }>;
    }>(`/api/rate-policies/garage/${garageId}`),
  createRatePolicy: (garageId: string, body: object) =>
    request(`/api/rate-policies/garage/${garageId}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  tickets: (garageId: string, status = "ACTIVE") =>
    request<{ tickets: Ticket[]; pagination: { total: number } }>(
      `/api/tickets/garage/${garageId}?status=${status}`,
    ),
  checkIn: (body: object) =>
    request<{ ticket: Ticket }>("/api/tickets/check-in", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  checkOut: (body: object) =>
    request<{
      ticket: Ticket;
      billing: { amount: number; elapsedHours: number; currency: string };
    }>("/api/tickets/check-out", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  registerVehicle: (body: object) =>
    request("/api/vehicles", { method: "POST", body: JSON.stringify(body) }),
  vehicleStatus: (plate: string) =>
    request<{
      vehicle: { plateNumber: string; vehicleType: string; tickets: Ticket[] };
    }>(`/api/vehicles/${encodeURIComponent(plate)}/status`),
  dailyReport: () =>
    request<{
      tickets: number;
      revenue: string | number;
      period: { start: string; end: string };
    }>("/api/reports/daily"),
  monthlyReport: () =>
    request<{
      tickets: number;
      revenue: string | number;
      period: { start: string; end: string };
    }>("/api/reports/monthly"),
  audit: () =>
    request<{
      logs: Array<{
        id: string;
        action: string;
        entityType: string;
        details?: string;
        createdAt: string;
        user?: { name: string };
        garage?: { name: string };
      }>;
    }>("/api/audit"),
};

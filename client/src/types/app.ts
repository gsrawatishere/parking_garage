export type Page =
  "overview" | "operations" | "garages" | "vehicles" | "reports" | "audit";
export type FormValues = Record<string, string>;

export type Floor = {
  id: string;
  name: string;
  level: number;
  _count: { spots: number };
};

export type RatePolicy = {
  id: string;
  name: string;
  firstHourRate: string;
  additionalHourRate: string;
  dailyCap: string;
  currency: string;
  isActive: boolean;
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  details?: string;
  createdAt: string;
  user?: { name: string };
  garage?: { name: string };
};

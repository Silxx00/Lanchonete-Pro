import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface HealthIssue {
  type: string;
  id?: number;
  name?: string;
  severity: "critical" | "high" | "warning" | "info";
  description: string;
  count?: number;
}

export interface HealthSummary {
  totalIssues: number;
  critical: number;
  high: number;
  warnings: number;
  info: number;
  status: "healthy" | "warnings" | "degraded" | "critical";
}

export interface HealthStats {
  totalProducts: number;
  activeProducts: number;
  totalCombos: number;
  totalComboItems: number;
}

export interface SystemHealthResult {
  issues: HealthIssue[];
  summary: HealthSummary;
  stats: HealthStats;
  checkedAt: string;
}

export function useSystemHealth(enabled = false, staleTime = 0) {
  return useQuery<SystemHealthResult>({
    queryKey: ["system-health"],
    queryFn: () => apiFetch("/api/admin/health-check"),
    enabled,
    staleTime,
    gcTime: 5 * 60 * 1000,
  });
}

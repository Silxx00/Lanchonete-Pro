import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type ResetType = "categories" | "orders" | "products" | "financial" | "promotions";

export interface ResetLog {
  id: number;
  userId: number | null;
  userEmail: string | null;
  action: string;
  entity: string;
  details: { message?: string } | null;
  ipAddress: string | null;
  createdAt: string;
}

export function useResetLogs() {
  return useQuery<ResetLog[]>({
    queryKey: ["reset-logs"],
    queryFn: () => apiFetch("/api/reset/logs"),
    staleTime: 10_000,
  });
}

export function useExecuteReset() {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, ResetType>({
    mutationFn: (type) => apiFetch(`/api/reset/${type}`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reset-logs"] });
      qc.invalidateQueries({ queryKey: ["financial-summary"] });
      qc.invalidateQueries({ queryKey: ["financial-expenses"] });
      qc.invalidateQueries({ queryKey: ["financial-cash-closings"] });
      qc.invalidateQueries({ queryKey: ["financial-insights"] });
      qc.invalidateQueries({ queryKey: ["financial-monthly-chart"] });
    },
  });
}

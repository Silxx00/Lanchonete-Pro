import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type ResetType = "categories" | "orders" | "products" | "financial" | "promotions" | "combos";

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

export interface ResetCounts {
  categoriesDeleted?: number;
  productsDeleted?: number;
  ordersDeleted?: number;
  orderItemsDeleted?: number;
  orderItemOptionsDeleted?: number;
  productOptionsDeleted?: number;
  productExtrasDeleted?: number;
  productIngredientsDeleted?: number;
  combosDeleted?: number;
  comboItemsDeleted?: number;
  expensesDeleted?: number;
  cashClosingsDeleted?: number;
  promotionsDeleted?: number;
}

export interface ResetResult {
  message: string;
  counts?: ResetCounts;
}

export function useExecuteReset() {
  const qc = useQueryClient();
  return useMutation<ResetResult, Error, ResetType>({
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

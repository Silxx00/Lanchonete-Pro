import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface ComboItem {
  id: number;
  comboId: number;
  productId: number | null;
  productName: string;
  quantity: number;
  productPrice: number | null;
}

export interface Combo {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  active: boolean;
  featured: boolean;
  items: ComboItem[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

const QUERY_KEY = ["combos"] as const;

export function useCombos() {
  return useQuery<Combo[]>({
    queryKey: QUERY_KEY,
    queryFn: () => apiFetch("/api/combos"),
    staleTime: 30_000,
  });
}

export function useCombo(id: number | null) {
  return useQuery<Combo>({
    queryKey: ["combos", id],
    queryFn: () => apiFetch(`/api/combos/${id}`),
    enabled: id != null && id > 0,
    staleTime: 30_000,
  });
}

export function useCreateCombo() {
  const qc = useQueryClient();
  return useMutation<
    Combo,
    Error,
    {
      name: string;
      description?: string | null;
      imageUrl?: string | null;
      price: number;
      active?: boolean;
      featured?: boolean;
      items?: { productId: number; quantity: number }[];
    }
  >({
    mutationFn: (data) => apiFetch("/api/combos", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateCombo() {
  const qc = useQueryClient();
  return useMutation<Combo, Error, { id: number; data: Partial<{ name: string; description: string | null; imageUrl: string | null; price: number; active: boolean; featured: boolean }> }>({
    mutationFn: ({ id, data }) => apiFetch(`/api/combos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteCombo() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: number }>({
    mutationFn: ({ id }) => apiFetch(`/api/combos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useAddComboItem() {
  const qc = useQueryClient();
  return useMutation<ComboItem, Error, { comboId: number; productId: number; quantity: number }>({
    mutationFn: ({ comboId, ...data }) => apiFetch(`/api/combos/${comboId}/items`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateComboItem() {
  const qc = useQueryClient();
  return useMutation<ComboItem, Error, { comboId: number; itemId: number; quantity: number }>({
    mutationFn: ({ comboId, itemId, quantity }) =>
      apiFetch(`/api/combos/${comboId}/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteComboItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, { comboId: number; itemId: number }>({
    mutationFn: ({ comboId, itemId }) => apiFetch(`/api/combos/${comboId}/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

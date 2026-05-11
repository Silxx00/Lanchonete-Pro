import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface ProductExtra {
  id: number;
  productId: number;
  name: string;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useProductExtras(productId: number | null) {
  return useQuery<ProductExtra[]>({
    queryKey: ["product-extras", productId],
    queryFn: () => apiFetch(`/api/products/${productId}/extras`),
    enabled: productId != null && productId > 0,
    staleTime: 30_000,
  });
}

export function useCreateProductExtra() {
  const qc = useQueryClient();
  return useMutation<ProductExtra, Error, { productId: number; name: string; price: number; active?: boolean }>({
    mutationFn: ({ productId, ...data }) =>
      apiFetch(`/api/products/${productId}/extras`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-extras", vars.productId] });
    },
  });
}

export function useUpdateProductExtra() {
  const qc = useQueryClient();
  return useMutation<ProductExtra, Error, { productId: number; extraId: number; name?: string; price?: number; active?: boolean }>({
    mutationFn: ({ productId, extraId, ...data }) =>
      apiFetch(`/api/products/${productId}/extras/${extraId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-extras", vars.productId] });
    },
  });
}

export function useDeleteProductExtra() {
  const qc = useQueryClient();
  return useMutation<void, Error, { productId: number; extraId: number }>({
    mutationFn: ({ productId, extraId }) =>
      apiFetch(`/api/products/${productId}/extras/${extraId}`, { method: "DELETE" }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-extras", vars.productId] });
    },
  });
}

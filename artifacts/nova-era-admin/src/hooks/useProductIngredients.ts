import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface ProductIngredient {
  id: number;
  productId: number;
  name: string;
  active: boolean;
  createdAt: string;
}

export function useProductIngredients(productId: number | null) {
  return useQuery<ProductIngredient[]>({
    queryKey: ["product-ingredients", productId],
    queryFn: () => apiFetch(`/api/products/${productId}/ingredients`),
    enabled: productId != null && productId > 0,
    staleTime: 30_000,
  });
}

export function useCreateProductIngredient() {
  const qc = useQueryClient();
  return useMutation<ProductIngredient, Error, { productId: number; name: string; active?: boolean }>({
    mutationFn: ({ productId, ...data }) =>
      apiFetch(`/api/products/${productId}/ingredients`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-ingredients", vars.productId] });
    },
  });
}

export function useUpdateProductIngredient() {
  const qc = useQueryClient();
  return useMutation<ProductIngredient, Error, { productId: number; ingredientId: number; name?: string; active?: boolean }>({
    mutationFn: ({ productId, ingredientId, ...data }) =>
      apiFetch(`/api/products/${productId}/ingredients/${ingredientId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-ingredients", vars.productId] });
    },
  });
}

export function useDeleteProductIngredient() {
  const qc = useQueryClient();
  return useMutation<void, Error, { productId: number; ingredientId: number }>({
    mutationFn: ({ productId, ingredientId }) =>
      apiFetch(`/api/products/${productId}/ingredients/${ingredientId}`, { method: "DELETE" }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-ingredients", vars.productId] });
    },
  });
}

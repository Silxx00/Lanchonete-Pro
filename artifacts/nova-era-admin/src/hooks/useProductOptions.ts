import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type OptionType = "add" | "remove" | "choice";

export interface ProductOption {
  id: number;
  productId: number;
  name: string;
  price: number;
  type: OptionType;
  active: boolean;
  createdAt: string;
}

export function useProductOptions(productId: number | null) {
  return useQuery<ProductOption[]>({
    queryKey: ["product-options", productId],
    queryFn: () => apiFetch(`/api/products/${productId}/options`),
    enabled: productId != null && productId > 0,
    staleTime: 30_000,
  });
}

export function useCreateProductOption() {
  const qc = useQueryClient();
  return useMutation<ProductOption, Error, { productId: number; name: string; price: number; type: OptionType; active?: boolean }>({
    mutationFn: ({ productId, ...data }) =>
      apiFetch(`/api/products/${productId}/options`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-options", vars.productId] });
    },
  });
}

export function useUpdateProductOption() {
  const qc = useQueryClient();
  return useMutation<ProductOption, Error, { productId: number; optionId: number; name?: string; price?: number; type?: OptionType; active?: boolean }>({
    mutationFn: ({ productId, optionId, ...data }) =>
      apiFetch(`/api/products/${productId}/options/${optionId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-options", vars.productId] });
    },
  });
}

export function useDeleteProductOption() {
  const qc = useQueryClient();
  return useMutation<void, Error, { productId: number; optionId: number }>({
    mutationFn: ({ productId, optionId }) =>
      apiFetch(`/api/products/${productId}/options/${optionId}`, { method: "DELETE" }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-options", vars.productId] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface FinancialSummary {
  year: number;
  month: number;
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  orderCount: number;
  margin: number;
}

export interface MonthlyChartPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensesResponse {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
}

export interface CashClosing {
  id: number;
  periodStart: string;
  periodEnd: string;
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  orderCount: number;
  notes: string | null;
  createdAt: string;
}

export interface FinancialInsights {
  revenueGrowth: number;
  expenseGrowth: number;
  netProfit: number;
  margin: number;
  topExpenseCategory: { name: string; amount: number } | null;
  categoryBreakdown: { name: string; amount: number }[];
  alerts: string[];
  availableCategories: string[];
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
}

export interface CreateCashClosingInput {
  periodStart: string;
  periodEnd: string;
  notes?: string;
}

export function useFinancialSummary(year: number, month: number) {
  return useQuery<FinancialSummary>({
    queryKey: ["financial-summary", year, month],
    queryFn: () => apiFetch(`/api/financial/summary?year=${year}&month=${month}`),
    staleTime: 60_000,
  });
}

export function useMonthlyChart() {
  return useQuery<MonthlyChartPoint[]>({
    queryKey: ["financial-monthly-chart"],
    queryFn: () => apiFetch("/api/financial/monthly-chart"),
    staleTime: 5 * 60_000,
  });
}

export function useExpenses(params: { page?: number; limit?: number; category?: string; month?: string }) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.category) qs.set("category", params.category);
  if (params.month) qs.set("month", params.month);

  return useQuery<ExpensesResponse>({
    queryKey: ["financial-expenses", params],
    queryFn: () => apiFetch(`/api/financial/expenses?${qs}`),
    staleTime: 30_000,
  });
}

export function useCashClosings() {
  return useQuery<CashClosing[]>({
    queryKey: ["financial-cash-closings"],
    queryFn: () => apiFetch("/api/financial/cash-closings"),
    staleTime: 60_000,
  });
}

export function useFinancialInsights() {
  return useQuery<FinancialInsights>({
    queryKey: ["financial-insights"],
    queryFn: () => apiFetch("/api/financial/insights"),
    staleTime: 5 * 60_000,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation<Expense, Error, CreateExpenseInput>({
    mutationFn: (data) => apiFetch("/api/financial/expenses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-expenses"] });
      qc.invalidateQueries({ queryKey: ["financial-summary"] });
      qc.invalidateQueries({ queryKey: ["financial-insights"] });
      qc.invalidateQueries({ queryKey: ["financial-monthly-chart"] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation<Expense, Error, { id: number } & Partial<CreateExpenseInput>>({
    mutationFn: ({ id, ...data }) => apiFetch(`/api/financial/expenses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-expenses"] });
      qc.invalidateQueries({ queryKey: ["financial-summary"] });
      qc.invalidateQueries({ queryKey: ["financial-insights"] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) => apiFetch(`/api/financial/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-expenses"] });
      qc.invalidateQueries({ queryKey: ["financial-summary"] });
      qc.invalidateQueries({ queryKey: ["financial-insights"] });
      qc.invalidateQueries({ queryKey: ["financial-monthly-chart"] });
    },
  });
}

export function useCreateCashClosing() {
  const qc = useQueryClient();
  return useMutation<CashClosing, Error, CreateCashClosingInput>({
    mutationFn: (data) => apiFetch("/api/financial/cash-closings", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial-cash-closings"] });
    },
  });
}

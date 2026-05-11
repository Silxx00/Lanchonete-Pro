import { memo, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Plus, Pencil, Trash2, Loader2, CheckCircle2, X,
  BarChart3, Wallet, ArrowUpRight, ArrowDownRight, Receipt,
  Banknote, CreditCard, Smartphone,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, cn } from "@/lib/utils";
import {
  useFinancialSummary, useMonthlyChart, useExpenses, useCashClosings,
  useFinancialInsights, useCreateExpense, useUpdateExpense, useDeleteExpense,
  useCreateCashClosing, type Expense, type CreateExpenseInput, type CreateCashClosingInput,
} from "@/hooks/useFinancial";
import { toast } from "sonner";

const PIE_COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 26 } },
};

function TrendBadge({ value }: { value: number }) {
  const pos = value > 0, zero = value === 0;
  const Icon = zero ? Minus : pos ? TrendingUp : TrendingDown;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md",
      zero ? "text-muted-foreground bg-muted/40" :
      pos  ? "text-emerald-400 bg-emerald-400/10" :
             "text-red-400 bg-red-400/10"
    )}>
      <Icon className="h-3 w-3" />
      {zero ? "Estável" : `${pos ? "+" : ""}${value.toFixed(1)}%`}
    </span>
  );
}

const KpiCard = memo(function KpiCard({
  title, value, sub, icon: Icon, iconColor, gradient, badge, loading,
}: {
  title: string; value: string; sub: string;
  icon: React.ElementType; iconColor: string; gradient: string;
  badge?: React.ReactNode; loading: boolean;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-card border-card-border relative overflow-hidden group hover:border-primary/20 transition-colors">
        <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none opacity-100", gradient)} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <><Skeleton className="h-7 w-28 mb-2" /><Skeleton className="h-3.5 w-36" /></>
          ) : (
            <>
              <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xs text-muted-foreground">{sub}</p>
                {badge}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

function ExpenseForm({
  initial, categories, onSave, onCancel, loading,
}: {
  initial?: Expense;
  categories: string[];
  onSave: (data: CreateExpenseInput) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    description: initial?.description ?? "",
    amount: initial?.amount ? String(initial.amount) : "",
    category: initial?.category ?? "Outros",
    date: initial?.date ? initial.date.slice(0, 10) : today,
    notes: initial?.notes ?? "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.description.trim()) { toast.error("Descrição obrigatória"); return; }
    if (isNaN(amount) || amount <= 0) { toast.error("Valor inválido"); return; }
    if (!form.date) { toast.error("Data obrigatória"); return; }
    onSave({ description: form.description.trim(), amount, category: form.category, date: form.date, notes: form.notes || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3">
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Descrição</Label>
          <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Ex: Pagamento fornecedor" className="h-9 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Valor (R$)</Label>
            <Input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0,00" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Data</Label>
            <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="h-9 text-sm" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Categoria</Label>
          <Select value={form.category} onValueChange={v => set("category", v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Observações (opcional)</Label>
          <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Detalhes adicionais..." className="h-9 text-sm" />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-8 text-xs">Cancelar</Button>
        <Button type="submit" size="sm" disabled={loading} className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {initial ? "Salvar" : "Adicionar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CashClosingForm({
  onSave, onCancel, loading,
}: {
  onSave: (data: CreateCashClosingInput) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [form, setForm] = useState({
    periodStart: firstOfMonth,
    periodEnd: today,
    notes: "",
    cashAmount: "",
    pixAmount: "",
    cardAmount: "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const cash = parseFloat(form.cashAmount) || 0;
  const pix = parseFloat(form.pixAmount) || 0;
  const card = parseFloat(form.cardAmount) || 0;
  const countedTotal = cash + pix + card;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.periodStart || !form.periodEnd) { toast.error("Período obrigatório"); return; }
    if (form.periodStart > form.periodEnd) { toast.error("Data inicial deve ser anterior à final"); return; }
    onSave({
      periodStart: form.periodStart + "T00:00:00.000Z",
      periodEnd: form.periodEnd + "T23:59:59.999Z",
      notes: form.notes || undefined,
      cashAmount: cash || undefined,
      pixAmount: pix || undefined,
      cardAmount: card || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
        O fechamento calcula automaticamente a receita bruta dos pedidos entregues e os gastos registrados no período.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">De</Label>
          <Input type="date" value={form.periodStart} onChange={e => set("periodStart", e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Até</Label>
          <Input type="date" value={form.periodEnd} onChange={e => set("periodEnd", e.target.value)} className="h-9 text-sm" />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Valores Contados (opcional)</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1 block">
              <Banknote className="h-3 w-3" /> Dinheiro
            </Label>
            <Input
              type="number" step="0.01" min="0"
              value={form.cashAmount}
              onChange={e => set("cashAmount", e.target.value)}
              placeholder="0,00" className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1 block">
              <Smartphone className="h-3 w-3" /> PIX
            </Label>
            <Input
              type="number" step="0.01" min="0"
              value={form.pixAmount}
              onChange={e => set("pixAmount", e.target.value)}
              placeholder="0,00" className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1 block">
              <CreditCard className="h-3 w-3" /> Cartão
            </Label>
            <Input
              type="number" step="0.01" min="0"
              value={form.cardAmount}
              onChange={e => set("cardAmount", e.target.value)}
              placeholder="0,00" className="h-9 text-sm"
            />
          </div>
        </div>
        {countedTotal > 0 && (
          <div className="mt-2 p-2.5 rounded-lg bg-muted/30 border border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total contado</span>
            <span className="text-sm font-bold text-foreground">{formatCurrency(countedTotal)}</span>
          </div>
        )}
      </div>

      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5 block">Observações</Label>
        <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Ex: Fechamento quinzenal" className="h-9 text-sm" />
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-8 text-xs">Cancelar</Button>
        <Button type="submit" size="sm" disabled={loading} className="h-8 text-xs gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
          Fechar Caixa
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function FinancialPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [expPage, setExpPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState("");

  const [expenseDialog, setExpenseDialog] = useState<{ open: boolean; editing?: Expense }>({ open: false });
  const [closingDialog, setClosingDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const monthStr = useMemo(() => `${year}-${String(month).padStart(2, "0")}`, [year, month]);

  const summary = useFinancialSummary(year, month);
  const chart = useMonthlyChart();
  const expenses = useExpenses({ page: expPage, limit: 15, category: filterCategory || undefined, month: monthStr });
  const closings = useCashClosings();
  const insights = useFinancialInsights();

  const createExp = useCreateExpense();
  const updateExp = useUpdateExpense();
  const deleteExp = useDeleteExpense();
  const createClosing = useCreateCashClosing();

  const categories = insights.data?.availableCategories ?? [];

  const handleMonthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const [y, m] = e.target.value.split("-").map(Number);
    if (y && m) { setYear(y); setMonth(m); setExpPage(1); }
  }, []);

  const handleSaveExpense = useCallback((data: CreateExpenseInput) => {
    if (expenseDialog.editing) {
      updateExp.mutate({ id: expenseDialog.editing.id, ...data }, {
        onSuccess: () => { toast.success("Despesa atualizada"); setExpenseDialog({ open: false }); },
        onError: (e) => toast.error(e.message),
      });
    } else {
      createExp.mutate(data, {
        onSuccess: () => { toast.success("Despesa adicionada"); setExpenseDialog({ open: false }); },
        onError: (e) => toast.error(e.message),
      });
    }
  }, [expenseDialog.editing, createExp, updateExp]);

  const handleDeleteExpense = useCallback(() => {
    if (deleteId == null) return;
    deleteExp.mutate(deleteId, {
      onSuccess: () => { toast.success("Despesa removida"); setDeleteId(null); },
      onError: (e) => toast.error(e.message),
    });
  }, [deleteId, deleteExp]);

  const handleCreateClosing = useCallback((data: CreateCashClosingInput) => {
    createClosing.mutate(data, {
      onSuccess: () => { toast.success("Fechamento de caixa realizado"); setClosingDialog(false); },
      onError: (e) => toast.error(e.message),
    });
  }, [createClosing]);

  const isSummaryLoading = summary.isLoading;
  const d = summary.data;

  const marginColor = d
    ? d.margin >= 30 ? "text-emerald-400" : d.margin >= 15 ? "text-amber-400" : "text-red-400"
    : "text-foreground";

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Controle de receitas, gastos e lucratividade</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={`${year}-${String(month).padStart(2, "0")}`}
            onChange={handleMonthChange}
            className="h-8 text-xs w-36 border-border bg-card"
          />
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setClosingDialog(true)}>
            <Receipt className="h-3.5 w-3.5" /> Fechar Caixa
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Receita Bruta" loading={isSummaryLoading}
          value={formatCurrency(d?.grossRevenue ?? 0)}
          sub={`${d?.orderCount ?? 0} pedidos entregues`}
          icon={DollarSign} iconColor="bg-primary/10 text-primary" gradient="from-primary/5 to-transparent"
          badge={insights.data ? <TrendBadge value={insights.data.revenueGrowth} /> : undefined}
        />
        <KpiCard
          title="Total de Gastos" loading={isSummaryLoading}
          value={formatCurrency(d?.totalExpenses ?? 0)}
          sub="Despesas registradas"
          icon={TrendingDown} iconColor="bg-red-500/10 text-red-400" gradient="from-red-500/5 to-transparent"
          badge={insights.data ? <TrendBadge value={insights.data.expenseGrowth} /> : undefined}
        />
        <KpiCard
          title="Lucro Líquido" loading={isSummaryLoading}
          value={formatCurrency(d?.netProfit ?? 0)}
          sub="Receita menos gastos"
          icon={TrendingUp}
          iconColor={(d?.netProfit ?? 0) >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}
          gradient={(d?.netProfit ?? 0) >= 0 ? "from-emerald-500/5 to-transparent" : "from-red-500/5 to-transparent"}
        />
        <KpiCard
          title="Margem de Lucro" loading={isSummaryLoading}
          value={`${(d?.margin ?? 0).toFixed(1)}%`}
          sub="Eficiência do mês"
          icon={BarChart3} iconColor="bg-indigo-500/10 text-indigo-400" gradient="from-indigo-500/5 to-transparent"
          badge={d ? <span className={cn("text-[11px] font-medium", marginColor)}>{d.margin >= 30 ? "Excelente" : d.margin >= 15 ? "Razoável" : d.margin > 0 ? "Baixo" : "—"}</span> : undefined}
        />
      </motion.div>

      {/* Chart + Insights */}
      <div className="grid gap-5 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-card border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tendência Mensal — 6 Meses</CardTitle>
            <CardDescription className="text-xs">Receita, gastos e lucro por mês</CardDescription>
          </CardHeader>
          <CardContent className="pl-1">
            {chart.isLoading ? (
              <div className="h-[260px] flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !chart.data?.length || chart.data.every(p => p.revenue === 0 && p.expenses === 0) ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <BarChart3 className="h-8 w-8 opacity-20" />
                <p className="text-sm">Nenhum dado financeiro ainda</p>
                <p className="text-xs opacity-60">Os gráficos aparecerão conforme os dados forem registrados</p>
              </div>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} width={52} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "10px", fontSize: "12px" }}
                      formatter={(v: number, n: string) => [formatCurrency(v), n === "revenue" ? "Receita" : n === "expenses" ? "Gastos" : "Lucro"]}
                    />
                    <Legend formatter={v => v === "revenue" ? "Receita" : v === "expenses" ? "Gastos" : "Lucro"} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(221 83% 53%)" strokeWidth={2} fill="url(#gradRev)" dot={false} activeDot={{ r: 4 }} />
                    <Bar dataKey="expenses" fill="hsl(0 72% 51% / 0.6)" radius={[3, 3, 0, 0]} barSize={14} />
                    <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={1.5} fill="none" strokeDasharray="4 3" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 bg-card border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Análise Inteligente
            </CardTitle>
            <CardDescription className="text-xs">Insights gerados automaticamente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : !insights.data ? null : (
              <>
                {insights.data.alerts.length > 0 && (
                  <div className="space-y-1.5">
                    {insights.data.alerts.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/15 text-xs text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border">
                  <div className="flex items-center gap-2">
                    {insights.data.revenueGrowth >= 0
                      ? <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                      : <ArrowDownRight className="h-4 w-4 text-red-400" />}
                    <span className="text-xs text-muted-foreground">Crescimento da receita</span>
                  </div>
                  <TrendBadge value={insights.data.revenueGrowth} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs text-muted-foreground">Margem de lucro</span>
                  </div>
                  <span className={cn("text-xs font-semibold", marginColor)}>{insights.data.margin.toFixed(1)}%</span>
                </div>

                {insights.data.topExpenseCategory && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-400" />
                      <div>
                        <div className="text-xs text-muted-foreground">Maior gasto</div>
                        <div className="text-[11px] text-foreground font-medium">{insights.data.topExpenseCategory.name}</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-red-400">{formatCurrency(insights.data.topExpenseCategory.amount)}</span>
                  </div>
                )}

                {insights.data.categoryBreakdown.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1">Gastos por categoria</p>
                    <div className="h-[110px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={insights.data.categoryBreakdown} dataKey="amount" nameKey="name" cx="35%" cy="50%" outerRadius={48} innerRadius={28}>
                            {insights.data.categoryBreakdown.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                            formatter={(v: number) => [formatCurrency(v), ""]}
                          />
                          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 10, right: 0 }}
                            formatter={v => <span className="text-muted-foreground">{v}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {insights.data.alerts.length === 0 && insights.data.categoryBreakdown.length === 0 && (
                  <div className="text-center py-4 text-xs text-muted-foreground opacity-60">
                    Adicione gastos para gerar análises
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expenses */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Despesas do Mês</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {expenses.data?.total ?? 0} registros · {formatCurrency(d?.totalExpenses ?? 0)} total
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterCategory} onValueChange={v => { setFilterCategory(v === "all" ? "" : v); setExpPage(1); }}>
              <SelectTrigger className="h-8 text-xs w-36 border-border"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90" onClick={() => setExpenseDialog({ open: true })}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.isLoading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : !expenses.data?.data.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-5 w-5 opacity-30" />
              </div>
              <p className="text-sm font-medium">Nenhuma despesa registrada</p>
              <p className="text-xs mt-1 opacity-60">Clique em "Adicionar" para lançar uma despesa</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {expenses.data.data.map(exp => (
                  <div key={exp.id} className="flex items-center justify-between p-3.5 border border-border rounded-xl bg-background/20 hover:bg-accent/20 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{exp.description}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border shrink-0">{exp.category}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(exp.date).toLocaleDateString("pt-BR")}
                        {exp.notes && <> · {exp.notes}</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="font-bold text-sm text-red-400 tabular-nums shrink-0">{formatCurrency(exp.amount)}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setExpenseDialog({ open: true, editing: exp })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(exp.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {expenses.data.total > 15 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {((expPage - 1) * 15) + 1}–{Math.min(expPage * 15, expenses.data.total)} de {expenses.data.total}
                  </p>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={expPage === 1} onClick={() => setExpPage(p => p - 1)}>Anterior</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={expPage * 15 >= expenses.data.total} onClick={() => setExpPage(p => p + 1)}>Próximo</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Cash Closings */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> Histórico de Fechamentos
          </CardTitle>
          <CardDescription className="text-xs">Últimos fechamentos de caixa realizados</CardDescription>
        </CardHeader>
        <CardContent>
          {closings.isLoading ? (
            <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : !closings.data?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <Receipt className="h-8 w-8 opacity-20 mx-auto mb-2" />
              <p className="text-sm">Nenhum fechamento realizado</p>
              <p className="text-xs mt-1 opacity-60">Use o botão "Fechar Caixa" para registrar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {closings.data.map(c => {
                const hasPaymentBreakdown = c.cashAmount != null || c.pixAmount != null || c.cardAmount != null;
                const diff = c.countedTotal != null ? c.countedTotal - c.grossRevenue : null;
                return (
                  <div key={c.id} className="p-4 border border-border rounded-xl bg-background/20 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium text-foreground">
                          {new Date(c.periodStart).toLocaleDateString("pt-BR")} → {new Date(c.periodEnd).toLocaleDateString("pt-BR")}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {c.orderCount} pedidos · Fechado em {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                          {c.notes && ` · ${c.notes}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right shrink-0">
                        <div>
                          <div className="text-[10px] text-muted-foreground">Receita</div>
                          <div className="text-sm font-semibold text-primary">{formatCurrency(c.grossRevenue)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">Gastos</div>
                          <div className="text-sm font-semibold text-red-400">{formatCurrency(c.totalExpenses)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">Lucro</div>
                          <div className={cn("text-sm font-bold", c.netProfit >= 0 ? "text-emerald-400" : "text-red-400")}>{formatCurrency(c.netProfit)}</div>
                        </div>
                      </div>
                    </div>
                    {hasPaymentBreakdown && (
                      <div className="pt-2 border-t border-border/60">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-1">Breakdown:</span>
                          {c.cashAmount != null && c.cashAmount > 0 && (
                            <div className="flex items-center gap-1 text-[11px] bg-muted/30 rounded-md px-2 py-0.5 border border-border">
                              <Banknote className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Dinheiro</span>
                              <span className="font-medium text-foreground">{formatCurrency(c.cashAmount)}</span>
                            </div>
                          )}
                          {c.pixAmount != null && c.pixAmount > 0 && (
                            <div className="flex items-center gap-1 text-[11px] bg-muted/30 rounded-md px-2 py-0.5 border border-border">
                              <Smartphone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">PIX</span>
                              <span className="font-medium text-foreground">{formatCurrency(c.pixAmount)}</span>
                            </div>
                          )}
                          {c.cardAmount != null && c.cardAmount > 0 && (
                            <div className="flex items-center gap-1 text-[11px] bg-muted/30 rounded-md px-2 py-0.5 border border-border">
                              <CreditCard className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Cartão</span>
                              <span className="font-medium text-foreground">{formatCurrency(c.cardAmount)}</span>
                            </div>
                          )}
                          {diff != null && (
                            <div className={cn(
                              "flex items-center gap-1 text-[11px] rounded-md px-2 py-0.5 border ml-auto",
                              Math.abs(diff) < 0.01
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : diff > 0
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                            )}>
                              <span>Diferença:</span>
                              <span className="font-semibold">{diff >= 0 ? "+" : ""}{formatCurrency(diff)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Dialog */}
      <Dialog open={expenseDialog.open} onOpenChange={open => setExpenseDialog(s => ({ ...s, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {expenseDialog.editing ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <ExpenseForm
            initial={expenseDialog.editing}
            categories={categories.length ? categories : ["Outros"]}
            onSave={handleSaveExpense}
            onCancel={() => setExpenseDialog({ open: false })}
            loading={createExp.isPending || updateExp.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Cash Closing Dialog */}
      <Dialog open={closingDialog} onOpenChange={setClosingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Fechamento de Caixa</DialogTitle>
          </DialogHeader>
          <CashClosingForm
            onSave={handleCreateClosing}
            onCancel={() => setClosingDialog(false)}
            loading={createClosing.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId != null} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Excluir despesa?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDeleteId(null)}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancelar
            </Button>
            <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={handleDeleteExpense} disabled={deleteExp.isPending}>
              {deleteExp.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

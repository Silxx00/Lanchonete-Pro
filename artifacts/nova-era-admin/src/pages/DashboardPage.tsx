import { memo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import {
  DollarSign, ShoppingBag, Clock, Package,
  Loader2, ArrowRight, TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { Link } from "wouter";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";

import {
  useGetDashboardStats,
  useGetSalesChart,
  useGetTopProducts,
  useGetRecentOrders
} from "@workspace/api-client-react";

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pendente",
  accepted:  "Aceito",
  preparing: "Preparando",
  ready:     "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":   return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "accepted":  return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    case "preparing": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    case "ready":     return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "delivered": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    case "cancelled": return "bg-red-500/10 text-red-400 border-red-500/20";
    default:          return "bg-primary/10 text-primary border-primary/20";
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.07 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 320, damping: 28 } }
};

function TrendBadge({ value, suffix = "%" }: { value?: number | null; suffix?: string }) {
  if (value == null) return null;
  const positive = value >= 0;
  const zero = value === 0;
  const Icon = zero ? Minus : positive ? TrendingUp : TrendingDown;
  return (
    <div className={cn(
      "flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md",
      zero     ? "text-muted-foreground bg-muted/40" :
      positive ? "text-emerald-400 bg-emerald-400/10" :
                 "text-red-400 bg-red-400/10"
    )}>
      <Icon className="h-3 w-3" />
      {zero ? "Estável" : `${positive ? "+" : ""}${value.toFixed(1)}${suffix}`}
    </div>
  );
}

const StatCard = memo(function StatCard({
  title, value, sub, icon: Icon, iconColor, gradient, trend, loading,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  gradient: string;
  trend?: number | null;
  loading: boolean;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-card border-card-border relative overflow-hidden group hover:border-primary/20 transition-colors">
        <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none transition-opacity opacity-100 group-hover:opacity-150", gradient)} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <>
              <Skeleton className="h-7 w-28 mb-1.5" />
              <Skeleton className="h-3.5 w-32" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xs text-muted-foreground">{sub}</p>
                {trend !== undefined && <TrendBadge value={trend} />}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: salesChart, isLoading: salesLoading } = useGetSalesChart();
  const { data: topProducts, isLoading: topProductsLoading } = useGetTopProducts();
  const { data: recentOrders, isLoading: ordersLoading } = useGetRecentOrders();

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Painel</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral do desempenho da lanchonete</p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="Receita de Hoje"
          value={formatCurrency(stats?.todayRevenue || 0)}
          sub={`Mensal: ${formatCurrency(stats?.monthRevenue || 0)}`}
          icon={DollarSign}
          iconColor="bg-primary/10 text-primary"
          gradient="from-primary/5 to-transparent"
          trend={null}
          loading={statsLoading}
        />
        <StatCard
          title="Pedidos Hoje"
          value={stats?.todayOrders || 0}
          sub={`Mensal: ${stats?.monthOrders || 0} pedidos`}
          icon={ShoppingBag}
          iconColor="bg-primary/10 text-primary"
          gradient="from-primary/5 to-transparent"
          trend={null}
          loading={statsLoading}
        />
        <StatCard
          title="Aguardando"
          value={stats?.pendingOrders || 0}
          sub="Pedidos precisam de atenção"
          icon={Clock}
          iconColor="bg-amber-500/10 text-amber-400"
          gradient="from-amber-500/5 to-transparent"
          trend={null}
          loading={statsLoading}
        />
        <StatCard
          title="Produtos Ativos"
          value={stats?.activeProducts || 0}
          sub={`Total cadastrado: ${stats?.totalProducts || 0}`}
          icon={Package}
          iconColor="bg-primary/10 text-primary"
          gradient="from-primary/5 to-transparent"
          trend={null}
          loading={statsLoading}
        />
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-card border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Faturamento — Últimos 7 Dias</CardTitle>
            <CardDescription className="text-xs">Receita diária acumulada</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {salesLoading ? (
              <div className="h-[260px] flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !salesChart?.length ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <DollarSign className="h-8 w-8 opacity-20" />
                <p className="text-sm">Nenhum dado de faturamento ainda</p>
                <p className="text-xs opacity-60">Os gráficos serão gerados conforme os pedidos chegarem</p>
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(221 83% 53%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "10px", fontSize: "12px" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(221 83% 53%)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" dot={false} activeDot={{ r: 4, fill: "hsl(221 83% 53%)" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 bg-card border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Produtos Mais Vendidos</CardTitle>
            <CardDescription className="text-xs">Por quantidade de vendas</CardDescription>
          </CardHeader>
          <CardContent>
            {topProductsLoading ? (
              <div className="h-[260px] flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !topProducts?.length ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Package className="h-8 w-8 opacity-20" />
                <p className="text-sm">Nenhuma venda registrada</p>
                <p className="text-xs opacity-60">O ranking será exibido após os primeiros pedidos</p>
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={110} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <RechartsTooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "10px", fontSize: "12px" }}
                      formatter={(value: number, name: string) => [
                        name === "totalSold" ? value : formatCurrency(value),
                        name === "totalSold" ? "Qtd. vendida" : "Receita"
                      ]}
                    />
                    <Bar dataKey="totalSold" fill="hsl(221 83% 53%)" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold">Pedidos Recentes</CardTitle>
            <CardDescription className="text-xs mt-0.5">Últimos pedidos registrados</CardDescription>
          </div>
          <Link href="/orders">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 border-border hover:border-primary/40">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-border rounded-xl">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : !recentOrders?.length ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="h-6 w-6 opacity-40" />
              </div>
              <p className="text-sm font-medium">Nenhum pedido registrado</p>
              <p className="text-xs mt-1 opacity-60">Os pedidos aparecerão aqui assim que forem criados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border border-border rounded-xl bg-background/20 hover:bg-accent/20 transition-colors"
                >
                  <div className="flex flex-col gap-0.5 mb-2 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">#{order.id}</span>
                      <span className="text-muted-foreground text-sm">{order.customerName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span>{order.items.length} {order.items.length === 1 ? "item" : "itens"}</span>
                      <span>·</span>
                      <span>{new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <Badge variant="outline" className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-medium border", getStatusColor(order.status))}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                    <span className="font-bold text-sm text-foreground tabular-nums">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { DollarSign, ShoppingBag, Clock, Package, Loader2, ArrowRight } from "lucide-react";
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
  pending: "Pendente",
  accepted: "Aceito",
  preparing: "Preparando",
  ready: "Pronto",
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
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } }
};

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: salesChart, isLoading: salesLoading } = useGetSalesChart();
  const { data: topProducts, isLoading: topProductsLoading } = useGetTopProducts();
  const { data: recentOrders, isLoading: ordersLoading } = useGetRecentOrders();

  return (
    <div className="space-y-7 max-w-screen-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Painel</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do desempenho da lanchonete</p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={itemVariants}>
          <Card className="bg-card border-card-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receita de Hoje</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-7 w-28 mb-1" /> : (
                <div className="text-2xl font-bold text-foreground">{formatCurrency(stats?.todayRevenue || 0)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {statsLoading ? <Skeleton className="h-3.5 w-32 mt-1" /> : `Mensal: ${formatCurrency(stats?.monthRevenue || 0)}`}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-card border-card-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pedidos Hoje</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-7 w-16 mb-1" /> : (
                <div className="text-2xl font-bold text-foreground">{stats?.todayOrders || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {statsLoading ? <Skeleton className="h-3.5 w-32 mt-1" /> : `Mensal: ${stats?.monthOrders || 0} pedidos`}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-card border-card-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aguardando</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-7 w-16 mb-1" /> : (
                <div className="text-2xl font-bold text-blue-400">{stats?.pendingOrders || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {statsLoading ? <Skeleton className="h-3.5 w-32 mt-1" /> : "Pedidos pendentes de atenção"}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-card border-card-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Produtos Ativos</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? <Skeleton className="h-7 w-16 mb-1" /> : (
                <div className="text-2xl font-bold text-foreground">{stats?.activeProducts || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {statsLoading ? <Skeleton className="h-3.5 w-32 mt-1" /> : `Total cadastrado: ${stats?.totalProducts || 0}`}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-card border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Faturamento — Últimos 7 Dias</CardTitle>
            <CardDescription className="text-xs">Receita diária acumulada</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {salesLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !salesChart?.length ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <p className="text-sm">Nenhum dado de faturamento disponível</p>
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(221 83% 53%)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 bg-card border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Produtos Mais Vendidos</CardTitle>
            <CardDescription className="text-xs">Por quantidade de vendas</CardDescription>
          </CardHeader>
          <CardContent>
            {topProductsLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !topProducts?.length ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <p className="text-sm">Nenhuma venda registrada</p>
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} vertical={true} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={110} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <RechartsTooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(value: number, name: string) => [
                        name === "totalSold" ? value : formatCurrency(value),
                        name === "totalSold" ? "Qtd. vendida" : "Receita"
                      ]}
                    />
                    <Bar dataKey="totalSold" fill="hsl(221 83% 53%)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-card-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base font-semibold">Pedidos Recentes</CardTitle>
            <CardDescription className="text-xs mt-1">Últimos pedidos registrados</CardDescription>
          </div>
          <Link href="/orders">
            <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-border rounded-xl">
                  <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : !recentOrders?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum pedido registrado</p>
              <p className="text-xs mt-1">Os pedidos aparecerão aqui assim que forem criados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-xl bg-background/30 hover:bg-accent/30 transition-colors">
                  <div className="flex flex-col gap-1 mb-2 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">Pedido #{order.id}</span>
                      <span className="text-muted-foreground text-sm">• {order.customerName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{order.items.length} {order.items.length === 1 ? "item" : "itens"}</span>
                      <span>•</span>
                      <span>{new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <Badge variant="outline" className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", getStatusColor(order.status))}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                    <span className="font-bold text-sm text-foreground">{formatCurrency(order.total)}</span>
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

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, ChevronRight, Check, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, cn } from "@/lib/utils";

import {
  useListOrders,
  getListOrdersQueryKey,
  useUpdateOrder,
} from "@workspace/api-client-react";

import type { Order } from "@workspace/api-client-react";

const STATUSES = ["all", "pending", "accepted", "preparing", "ready", "delivered", "cancelled"] as const;

const STATUS_LABELS: Record<string, string> = {
  all: "Todos",
  pending: "Pendente",
  accepted: "Aceito",
  preparing: "Preparando",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  accepted:  "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  preparing: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  ready:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  delivered: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const getStatusColor = (status: string) =>
  STATUS_COLORS[status.toLowerCase()] ?? "bg-primary/10 text-primary border-primary/20";

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");

  const { data: orders, isLoading } = useListOrders(
    { status: activeTab === "all" ? undefined : activeTab },
    { query: { queryKey: getListOrdersQueryKey({ status: activeTab === "all" ? undefined : activeTab }) } }
  );

  const updateMutation = useUpdateOrder();

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateMutation.mutate(
      { id: orderId, data: { status: newStatus } },
      {
        onSuccess: (updatedOrder) => {
          toast.success(`Status atualizado para ${STATUS_LABELS[newStatus] ?? newStatus}`);
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrder);
        },
        onError: () => toast.error("Falha ao atualizar o status"),
      }
    );
  };

  const filtered = useMemo(() => {
    if (!orders) return [];
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) => o.customerName.toLowerCase().includes(q) || String(o.id).includes(q)
    );
  }, [orders, search]);

  return (
    <div className="space-y-6 flex flex-col h-full max-w-screen-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe e gerencie os pedidos em tempo real</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou nº do pedido..."
            className="pl-9 h-9 bg-card/50 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex overflow-x-auto scrollbar-none border-b border-border gap-1">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={cn(
              "px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all -mb-px",
              activeTab === status
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-card border border-card-border rounded-2xl overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-16 text-center text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" />
            <p className="text-sm">Carregando pedidos...</p>
          </div>
        ) : !filtered.length ? (
          <div className="p-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <ShoppingCart className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">Nenhum pedido encontrado</p>
            <p className="text-xs">
              {search ? "Tente ajustar a busca" : `Não há pedidos com status "${STATUS_LABELS[activeTab]}"`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {filtered.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  onClick={() => setSelectedOrder(order)}
                  className="px-5 py-4 hover:bg-accent/30 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-foreground">#{order.id}</span>
                      <span className="text-sm text-foreground">{order.customerName}</span>
                      <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", getStatusColor(order.status))}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      {" · "}
                      {order.items.length} {order.items.length === 1 ? "item" : "itens"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <span className="font-bold text-sm text-foreground">{formatCurrency(order.total)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <DialogContent className="sm:max-w-[580px] bg-card border-border p-0 overflow-hidden rounded-2xl">
            <div className="p-6 pb-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DialogTitle className="text-xl font-bold">Pedido #{selectedOrder.id}</DialogTitle>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1.5">
                    <span>{new Date(selectedOrder.createdAt).toLocaleString("pt-BR")}</span>
                    <span>·</span>
                    <span>{selectedOrder.customerName}</span>
                    {selectedOrder.customerPhone && (
                      <><span>·</span><span>{selectedOrder.customerPhone}</span></>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={cn("px-3 py-1 rounded-full text-xs font-medium border shrink-0", getStatusColor(selectedOrder.status))}>
                  {STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status}
                </Badge>
              </div>
            </div>

            <div className="mx-6 mt-5 p-4 bg-accent/40 rounded-xl border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Atualizar Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.filter((s) => s !== "all").map((status) => (
                  <Button
                    key={status}
                    variant={selectedOrder.status === status ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => handleStatusChange(selectedOrder.id, status)}
                    disabled={updateMutation.isPending}
                  >
                    {selectedOrder.status === status && <Check className="mr-1.5 h-3 w-3" />}
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Itens do Pedido</p>
              <div className="space-y-3">
                {selectedOrder.items.map((item: { id: number; quantity: number; productName: string; totalPrice: number }) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted text-muted-foreground w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">
                        {item.quantity}x
                      </div>
                      <span className="text-sm font-medium">{item.productName}</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>

              {selectedOrder.notes && (
                <div className="mt-5 p-3.5 bg-muted/40 rounded-xl border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Observações do cliente:</p>
                  <p className="text-sm text-foreground/80 italic">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-border flex justify-between items-center">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, ChevronRight, Check } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, cn } from "@/lib/utils";

import {
  useListOrders,
  getListOrdersQueryKey,
  useUpdateOrder,
} from "@workspace/api-client-react";

import type { Order } from "@workspace/api-client-react";

const STATUSES = ['all', 'pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders, isLoading } = useListOrders(
    { status: activeTab === 'all' ? undefined : activeTab },
    { query: { queryKey: getListOrdersQueryKey({ status: activeTab === 'all' ? undefined : activeTab }) } }
  );

  const updateMutation = useUpdateOrder();

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'accepted': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'preparing': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'ready': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'delivered': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateMutation.mutate(
      { id: orderId, data: { status: newStatus } },
      {
        onSuccess: (updatedOrder) => {
          toast.success(`Order status updated to ${newStatus}`);
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          if (selectedOrder?.id === orderId) {
            setSelectedOrder(updatedOrder);
          }
        },
        onError: () => toast.error("Failed to update status"),
      }
    );
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        <p className="text-muted-foreground">Manage and track incoming orders.</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 scrollbar-none border-b border-border">
        {STATUSES.map(status => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize whitespace-nowrap border-b-2 transition-colors",
              activeTab === status 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-card/50 backdrop-blur-sm border border-card-border rounded-xl overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading orders...</div>
        ) : orders?.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            No orders found for this status.
          </div>
        ) : (
          <div className="divide-y divide-border overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {orders?.map(order => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedOrder(order)}
                  className="p-4 sm:px-6 hover:bg-accent/50 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">#{order.id}</span>
                      <span className="text-foreground">{order.customerName}</span>
                      <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full capitalize border", getStatusColor(order.status))}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} • {order.items.length} items
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <span className="font-bold text-lg text-primary">{formatCurrency(order.total)}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <DialogContent className="sm:max-w-[600px] bg-card border-border p-0 overflow-hidden">
            <div className="p-6 pb-0 flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl mb-1">Order #{selectedOrder.id}</DialogTitle>
                <div className="text-muted-foreground text-sm flex items-center gap-2">
                  <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  <span>•</span>
                  <span>{selectedOrder.customerName}</span>
                  {selectedOrder.customerPhone && (
                    <>
                      <span>•</span>
                      <span>{selectedOrder.customerPhone}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={cn("px-3 py-1 text-sm rounded-full capitalize border", getStatusColor(selectedOrder.status))}>
                {selectedOrder.status}
              </Badge>
            </div>

            <div className="p-6 bg-accent/30 mt-4 border-y border-border">
              <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">Status Update</h4>
              <div className="flex flex-wrap gap-2">
                {STATUSES.filter(s => s !== 'all').map(status => (
                  <Button 
                    key={status}
                    variant={selectedOrder.status === status ? "default" : "outline"}
                    size="sm"
                    className="capitalize"
                    onClick={() => handleStatusChange(selectedOrder.id, status)}
                    disabled={updateMutation.isPending}
                  >
                    {selectedOrder.status === status && <Check className="mr-2 h-3 w-3" />}
                    {status}
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-6">
              <h4 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">Order Items</h4>
              <div className="space-y-4">
                {selectedOrder.items.map((item: { id: number; quantity: number; productName: string; totalPrice: number }) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted text-muted-foreground w-8 h-8 rounded flex items-center justify-center font-bold text-sm">
                        {item.quantity}x
                      </div>
                      <span className="font-medium">{item.productName}</span>
                    </div>
                    <span>{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
              
              {selectedOrder.notes && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
                  <h4 className="font-semibold text-sm mb-1">Customer Notes:</h4>
                  <p className="text-sm text-muted-foreground italic">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-lg">
                <span className="font-bold">Total</span>
                <span className="font-bold text-primary">{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";

import {
  useListPromotions,
  getListPromotionsQueryKey,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
} from "@workspace/api-client-react";

import type { Promotion } from "@workspace/api-client-react/src/generated/api.schemas";

const promotionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  type: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().min(0.1, "Must be greater than 0"),
  code: z.string().optional().nullable(),
  minOrderValue: z.coerce.number().optional().nullable(),
  active: z.boolean().default(true),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  maxUsage: z.coerce.number().optional().nullable(),
});

type PromotionFormValues = z.infer<typeof promotionSchema>;

export default function PromotionsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  const { data: promotions, isLoading } = useListPromotions();

  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  const deleteMutation = useDeletePromotion();

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "percentage",
      discountValue: 0,
      code: "",
      minOrderValue: 0,
      active: true,
      maxUsage: 0,
    },
  });

  const openCreateModal = () => {
    setEditingPromo(null);
    form.reset({
      name: "",
      description: "",
      type: "percentage",
      discountValue: 0,
      code: "",
      minOrderValue: 0,
      active: true,
      maxUsage: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (promo: Promotion) => {
    setEditingPromo(promo);
    form.reset({
      name: promo.name,
      description: promo.description || "",
      type: promo.type as "percentage" | "fixed",
      discountValue: promo.discountValue,
      code: promo.code || "",
      minOrderValue: promo.minOrderValue || 0,
      active: promo.active,
      maxUsage: promo.maxUsage || 0,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (values: PromotionFormValues) => {
    if (editingPromo) {
      updateMutation.mutate(
        { id: editingPromo.id, data: values },
        {
          onSuccess: () => {
            toast.success("Promotion updated");
            queryClient.invalidateQueries({ queryKey: getListPromotionsQueryKey() });
            setIsModalOpen(false);
          },
          onError: () => toast.error("Failed to update promotion"),
        }
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            toast.success("Promotion created");
            queryClient.invalidateQueries({ queryKey: getListPromotionsQueryKey() });
            setIsModalOpen(false);
          },
          onError: () => toast.error("Failed to create promotion"),
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this promotion?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Promotion deleted");
            queryClient.invalidateQueries({ queryKey: getListPromotionsQueryKey() });
          },
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Promotions</h2>
          <p className="text-muted-foreground">Manage discounts and coupon codes.</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 shadow-lg">
          <Plus className="h-4 w-4" /> New Promotion
        </Button>
      </div>

      <div className="bg-card/50 backdrop-blur-sm border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-4 font-medium">Promotion</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Discount</th>
                <th className="px-6 py-4 font-medium">Code</th>
                <th className="px-6 py-4 font-medium">Usage</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="bg-card/20">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : promotions?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No promotions found. Create one to get started.
                  </td>
                </tr>
              ) : (
                promotions?.map((promo) => (
                  <tr key={promo.id} className={`hover:bg-accent/50 transition-colors ${!promo.active ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex flex-col">
                        <span>{promo.name}</span>
                        {!promo.active && <span className="text-xs text-destructive">Inactive</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize">{promo.type}</td>
                    <td className="px-6 py-4 font-medium text-primary">
                      {promo.type === 'percentage' ? `${promo.discountValue}%` : formatCurrency(promo.discountValue)}
                    </td>
                    <td className="px-6 py-4">
                      {promo.code ? (
                        <Badge variant="secondary" className="font-mono">{promo.code}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {promo.usageCount} {promo.maxUsage ? `/ ${promo.maxUsage}` : ''}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(promo)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(promo.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingPromo ? "Edit Promotion" : "New Promotion"}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Summer Sale" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Value (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Value</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="SUMMER20" className="uppercase" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minOrderValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Order Value (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || 0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="maxUsage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Uses (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Leave empty for unlimited" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingPromo ? "Save Changes" : "Create Promotion"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

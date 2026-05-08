import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Edit, Trash2, TicketPercent } from "lucide-react";
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

import type { Promotion } from "@workspace/api-client-react";

const promotionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional().nullable(),
  type: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().min(0.1, "Deve ser maior que zero"),
  code: z.string().optional().nullable(),
  minOrderValue: z.coerce.number().optional().nullable(),
  active: z.boolean().default(true),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  maxUsage: z.coerce.number().optional().nullable(),
});

type PromotionFormValues = z.infer<typeof promotionSchema>;

const TYPE_LABELS: Record<string, string> = {
  percentage: "Porcentagem",
  fixed: "Valor fixo",
};

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
    defaultValues: { name: "", description: "", type: "percentage", discountValue: 0, code: "", minOrderValue: 0, active: true, maxUsage: 0 },
  });

  const openCreateModal = () => {
    setEditingPromo(null);
    form.reset({ name: "", description: "", type: "percentage", discountValue: 0, code: "", minOrderValue: 0, active: true, maxUsage: 0 });
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
            toast.success("Promoção atualizada com sucesso");
            queryClient.invalidateQueries({ queryKey: getListPromotionsQueryKey() });
            setIsModalOpen(false);
          },
          onError: () => toast.error("Falha ao atualizar a promoção"),
        }
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            toast.success("Promoção criada com sucesso");
            queryClient.invalidateQueries({ queryKey: getListPromotionsQueryKey() });
            setIsModalOpen(false);
          },
          onError: () => toast.error("Falha ao criar a promoção"),
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja excluir esta promoção? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Promoção excluída");
            queryClient.invalidateQueries({ queryKey: getListPromotionsQueryKey() });
          },
          onError: () => toast.error("Falha ao excluir a promoção"),
        }
      );
    }
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Promoções</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie descontos e cupons do sistema</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 h-9 text-sm shadow-md shadow-primary/20">
          <Plus className="h-4 w-4" /> Nova Promoção
        </Button>
      </div>

      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Promoção</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desconto</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cupom</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uso</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="h-7 w-7 ml-auto" /></td>
                  </tr>
                ))
              ) : !promotions?.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <TicketPercent className="h-9 w-9 mx-auto text-muted-foreground opacity-20 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Nenhuma promoção cadastrada</p>
                    <p className="text-xs text-muted-foreground mt-1">Crie promoções e cupons de desconto para seus clientes</p>
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => (
                  <tr key={promo.id} className={`hover:bg-accent/20 transition-colors ${!promo.active ? "opacity-50" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground text-sm">{promo.name}</span>
                        {!promo.active && <span className="text-xs text-muted-foreground">Inativa</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                        {TYPE_LABELS[promo.type] ?? promo.type}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 font-semibold text-foreground text-sm">
                      {promo.type === "percentage" ? `${promo.discountValue}%` : formatCurrency(promo.discountValue)}
                    </td>
                    <td className="px-5 py-4">
                      {promo.code ? (
                        <Badge variant="secondary" className="font-mono text-xs">{promo.code}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {promo.usageCount}{promo.maxUsage ? ` / ${promo.maxUsage}` : ""}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-sm">
                          <DropdownMenuItem onClick={() => openEditModal(promo)}>
                            <Edit className="mr-2 h-3.5 w-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(promo.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
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
        <DialogContent className="sm:max-w-[480px] bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{editingPromo ? "Editar Promoção" : "Nova Promoção"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Nome da Promoção</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Desconto de Verão" className="h-9 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Tipo de Desconto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="discountValue" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Valor do Desconto</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="h-9 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Código do Cupom (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="PROMO10" className="h-9 text-sm uppercase" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="minOrderValue" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Pedido Mínimo (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="h-9 text-sm" {...field} value={field.value || 0} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="maxUsage" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Limite de Usos (opcional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Deixe vazio para ilimitado" className="h-9 text-sm" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-xs font-semibold">Promoção Ativa</FormLabel>
                    <div className="text-[11px] text-muted-foreground">Disponível para uso imediato</div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingPromo ? "Salvar Alterações" : "Criar Promoção"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

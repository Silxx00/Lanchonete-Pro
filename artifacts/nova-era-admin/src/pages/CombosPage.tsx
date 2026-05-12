import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Edit, Trash2, Package, Layers, Search, MoreVertical,
  CheckCircle2, XCircle, Star, Loader2, ImageIcon, ChevronDown,
  ChevronUp, MinusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency } from "@/lib/utils";
import {
  useCombos,
  useCreateCombo,
  useUpdateCombo,
  useDeleteCombo,
  useAddComboItem,
  useDeleteComboItem,
  type Combo,
} from "@/hooks/useCombos";
import { useListProducts } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/useDebounce";

// ── Validation ────────────────────────────────────────────────────────────────
const comboSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  price: z.coerce.number().min(0, "Preço não pode ser negativo"),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
});
type ComboFormValues = z.infer<typeof comboSchema>;

// ── Combo Items Manager ───────────────────────────────────────────────────────
function ComboItemsManager({ combo }: { combo: Combo }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState<Record<number, number>>({});
  const debouncedSearch = useDebounce(search, 350);

  const { data: products } = useListProducts(
    { search: debouncedSearch || undefined, active: "true" },
    { query: { enabled: open } }
  );
  const addItem = useAddComboItem();
  const deleteItem = useDeleteComboItem();

  const handleAdd = (productId: number, productName: string) => {
    const quantity = qty[productId] || 1;
    addItem.mutate(
      { comboId: combo.id, productId, quantity },
      {
        onSuccess: () => {
          setQty((prev) => ({ ...prev, [productId]: 1 }));
          toast.success(`${productName} adicionado ao combo`);
        },
        onError: () => toast.error("Erro ao adicionar produto"),
      }
    );
  };

  return (
    <div className="rounded-xl border border-border bg-muted/10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground"
      >
        <span className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          Itens do Combo ({combo.items.length})
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
          {/* Current items */}
          {combo.items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">Nenhum item adicionado ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {combo.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1.5 px-2.5 bg-background/40 rounded-lg border border-border text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">
                      {item.quantity}x
                    </Badge>
                    <span className="font-medium text-foreground">{item.productName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteItem.mutate(
                      { comboId: combo.id, itemId: item.id },
                      { onError: () => toast.error("Erro ao remover item") }
                    )}
                    className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                  >
                    <MinusCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add product search */}
          <div className="space-y-2 pt-1 border-t border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Adicionar produto</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="h-8 text-xs pl-8"
              />
            </div>
            {products && products.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border bg-background/30 p-1.5">
                {products.map((prod) => (
                  <div key={prod.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors">
                    <span className="text-xs flex-1 font-medium text-foreground truncate">{prod.name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{formatCurrency(prod.price)}</span>
                    <Input
                      type="number"
                      min="1"
                      value={qty[prod.id] ?? 1}
                      onChange={(e) => setQty((prev) => ({ ...prev, [prod.id]: Number(e.target.value) || 1 }))}
                      className="h-6 w-12 text-xs text-center p-0 px-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-6 px-2 text-[10px] gap-1"
                      onClick={() => handleAdd(prod.id, prod.name)}
                      disabled={addItem.isPending}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CombosPage() {
  const { data: combos, isLoading } = useCombos();
  const createMutation = useCreateCombo();
  const updateMutation = useUpdateCombo();
  const deleteMutation = useDeleteCombo();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const form = useForm<ComboFormValues>({
    resolver: zodResolver(comboSchema),
    defaultValues: { name: "", description: "", imageUrl: "", price: 0, active: true, featured: false },
  });

  const filteredCombos = combos?.filter((c) =>
    !debouncedSearch || c.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  ) ?? [];

  const openCreate = useCallback(() => {
    setEditingCombo(null);
    form.reset({ name: "", description: "", imageUrl: "", price: 0, active: true, featured: false });
    setIsModalOpen(true);
  }, [form]);

  const openEdit = useCallback((combo: Combo) => {
    setEditingCombo(combo);
    form.reset({
      name: combo.name,
      description: combo.description || "",
      imageUrl: combo.imageUrl || "",
      price: combo.price,
      active: combo.active,
      featured: combo.featured,
    });
    setIsModalOpen(true);
  }, [form]);

  const onSubmit = (values: ComboFormValues) => {
    const payload = {
      ...values,
      description: values.description || null,
      imageUrl: values.imageUrl || null,
    };
    if (editingCombo) {
      updateMutation.mutate(
        { id: editingCombo.id, data: payload },
        {
          onSuccess: () => { toast.success("Combo atualizado"); setIsModalOpen(false); },
          onError: () => toast.error("Erro ao atualizar combo"),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success("Combo criado"); setIsModalOpen(false); },
        onError: () => toast.error("Erro ao criar combo"),
      });
    }
  };

  const handleDelete = () => {
    if (deleteId == null) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => { toast.success("Combo excluído"); setDeleteId(null); },
        onError: () => toast.error("Erro ao excluir combo"),
      }
    );
  };

  const toggleActive = (combo: Combo) => {
    updateMutation.mutate(
      { id: combo.id, data: { active: !combo.active } },
      { onSuccess: () => toast.success(`Combo ${!combo.active ? "ativado" : "desativado"}`) }
    );
  };

  const toggleFeatured = (combo: Combo) => {
    updateMutation.mutate(
      { id: combo.id, data: { featured: !combo.featured } },
      { onSuccess: () => toast.success(`Destaque ${!combo.featured ? "ativado" : "removido"}`) }
    );
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-primary" />
            Combos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Crie e gerencie combinações de produtos</p>
        </div>
        <Button onClick={openCreate} className="gap-2 h-9 text-sm shadow-md shadow-primary/20">
          <Plus className="h-4 w-4" /> Novo Combo
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar combos..."
          className="pl-9 h-9 bg-card/50 text-sm"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-card-border overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCombos.length === 0 ? (
        <div className="text-center py-24 bg-card/30 rounded-2xl border border-dashed border-border">
          <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
          <h3 className="text-sm font-semibold text-foreground">
            {searchInput ? "Nenhum combo encontrado" : "Nenhum combo cadastrado"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            {searchInput ? "Tente ajustar a busca" : "Crie o primeiro combo para o cardápio"}
          </p>
          {!searchInput && (
            <Button onClick={openCreate} size="sm" className="gap-2 text-xs">
              <Plus className="h-3.5 w-3.5" /> Criar Combo
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
        >
          <AnimatePresence>
            {filteredCombos.map((combo) => (
              <motion.div
                key={combo.id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <Card className="bg-card border-card-border overflow-hidden group hover:border-primary/40 transition-all duration-200 h-full flex flex-col shadow-sm">
                  {/* Image */}
                  <div className="relative h-40 bg-muted/20 flex items-center justify-center overflow-hidden">
                    {combo.imageUrl ? (
                      <img
                        src={combo.imageUrl}
                        alt={combo.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
                        <ImageIcon className="h-10 w-10" />
                        <span className="text-xs">Sem imagem</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      {combo.featured && (
                        <Badge className="bg-amber-500 text-white text-[10px] font-semibold border-none shadow">
                          <Star className="h-2.5 w-2.5 mr-0.5" /> Destaque
                        </Badge>
                      )}
                      {!combo.active && (
                        <Badge variant="outline" className="bg-background/80 text-muted-foreground text-[10px] border-border">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4 flex-1 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground line-clamp-1">{combo.name}</h3>
                        {combo.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{combo.description}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1.5 text-muted-foreground shrink-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-sm">
                          <DropdownMenuItem onClick={() => openEdit(combo)}>
                            <Edit className="mr-2 h-3.5 w-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(combo)}>
                            {combo.active
                              ? <><XCircle className="mr-2 h-3.5 w-3.5" /> Desativar</>
                              : <><CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-500" /> Ativar</>
                            }
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleFeatured(combo)}>
                            <Star className="mr-2 h-3.5 w-3.5 text-amber-400" />
                            {combo.featured ? "Remover Destaque" : "Destacar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(combo.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Items summary */}
                    {combo.items.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {combo.items.map((item) => (
                          <Badge key={item.id} variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-border">
                            {item.quantity}× {item.productName}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                      <span className="text-base font-bold text-primary">{formatCurrency(combo.price)}</span>
                      <span className="text-xs text-muted-foreground">{combo.items.length} {combo.items.length === 1 ? "item" : "itens"}</span>
                    </div>

                    <ComboItemsManager combo={combo} />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Excluir combo"
        description="Deseja excluir este combo? Todos os itens do combo também serão removidos."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(o) => { if (!o) setIsModalOpen(false); }}>
        <DialogContent className="sm:max-w-[560px] bg-card border-border rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              {editingCombo ? "Editar Combo" : "Novo Combo"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Nome do Combo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Combo Família" className="h-9 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Descreva o combo..." className="h-9 text-sm" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Preço Promocional (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" className="h-9 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">URL da Imagem (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." className="h-9 text-sm" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="active" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-xs font-semibold">Ativo</FormLabel>
                      <div className="text-[11px] text-muted-foreground">Visível no cardápio</div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="featured" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-xs font-semibold">Destaque</FormLabel>
                      <div className="text-[11px] text-muted-foreground">Aparece em vitrine</div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              {editingCombo && (
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Itens</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <ComboItemsManager combo={editingCombo} />
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingCombo ? "Salvar Alterações" : "Criar Combo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

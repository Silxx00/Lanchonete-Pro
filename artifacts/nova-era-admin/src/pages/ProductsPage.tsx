import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, CheckCircle2, XCircle, Package, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDebounce } from "@/hooks/useDebounce";

import {
  useListProducts,
  getListProductsQueryKey,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useListCategories,
} from "@workspace/api-client-react";

import type { Product } from "@workspace/api-client-react";

import {
  useProductExtras,
  useCreateProductExtra,
  useDeleteProductExtra,
} from "@/hooks/useProductExtras";
import {
  useProductIngredients,
  useCreateProductIngredient,
  useDeleteProductIngredient,
} from "@/hooks/useProductIngredients";

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0.01, "Preço deve ser maior que zero"),
  categoryId: z.coerce.number().optional().nullable(),
  stock: z.coerce.number().min(0, "Estoque não pode ser negativo"),
  imageUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  prepTime: z.coerce.number().min(0).optional().nullable(),
  internalNotes: z.string().optional().nullable(),
});

type ProductFormValues = z.infer<typeof productSchema>;

function ExtrasSection({ productId }: { productId: number }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const { data: extras, isLoading } = useProductExtras(productId);
  const createExtra = useCreateProductExtra();
  const deleteExtra = useDeleteProductExtra();

  const handleAdd = () => {
    const n = name.trim();
    const p = parseFloat(price) || 0;
    if (!n) { toast.error("Nome do adicional obrigatório"); return; }
    createExtra.mutate(
      { productId, name: n, price: p },
      {
        onSuccess: () => { setName(""); setPrice(""); toast.success("Adicional criado"); },
        onError: () => toast.error("Erro ao criar adicional"),
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
        <span>Adicionais ({extras?.length ?? 0})</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...
            </div>
          ) : !extras?.length ? (
            <p className="text-xs text-muted-foreground py-1">Nenhum adicional cadastrado.</p>
          ) : (
            <div className="space-y-1.5">
              {extras.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between py-1.5 px-2.5 bg-background/40 rounded-lg border border-border text-xs">
                  <span className="font-medium text-foreground">{ex.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{ex.price > 0 ? formatCurrency(ex.price) : "Grátis"}</span>
                    <button
                      type="button"
                      onClick={() => deleteExtra.mutate(
                        { productId, extraId: ex.id },
                        { onError: () => toast.error("Erro ao remover adicional") }
                      )}
                      className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do adicional"
              className="h-8 text-xs flex-1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Preço"
              className="h-8 text-xs w-24"
            />
            <Button type="button" size="sm" className="h-8 px-3 text-xs gap-1" onClick={handleAdd} disabled={createExtra.isPending}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function IngredientsSection({ productId }: { productId: number }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const { data: ingredients, isLoading } = useProductIngredients(productId);
  const createIngredient = useCreateProductIngredient();
  const deleteIngredient = useDeleteProductIngredient();

  const handleAdd = () => {
    const n = name.trim();
    if (!n) { toast.error("Nome do ingrediente obrigatório"); return; }
    createIngredient.mutate(
      { productId, name: n },
      {
        onSuccess: () => { setName(""); toast.success("Ingrediente adicionado"); },
        onError: () => toast.error("Erro ao adicionar ingrediente"),
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
        <span>Ingredientes ({ingredients?.length ?? 0})</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...
            </div>
          ) : !ingredients?.length ? (
            <p className="text-xs text-muted-foreground py-1">Nenhum ingrediente cadastrado.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {ingredients.map((ing) => (
                <div key={ing.id} className="flex items-center gap-1 py-1 px-2.5 bg-background/40 rounded-full border border-border text-xs">
                  <span className="font-medium text-foreground">{ing.name}</span>
                  <button
                    type="button"
                    onClick={() => deleteIngredient.mutate(
                      { productId, ingredientId: ing.id },
                      { onError: () => toast.error("Erro ao remover ingrediente") }
                    )}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do ingrediente (ex: Cebola)"
              className="h-8 text-xs flex-1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
            />
            <Button type="button" size="sm" className="h-8 px-3 text-xs gap-1" onClick={handleAdd} disabled={createIngredient.isPending}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);
  const [categoryId, setCategoryId] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: categories } = useListCategories();
  const { data: products, isLoading } = useListProducts(
    { search: search || undefined, categoryId: categoryId !== "all" ? Number(categoryId) : undefined },
    { query: { queryKey: getListProductsQueryKey({ search: search || undefined, categoryId: categoryId !== "all" ? Number(categoryId) : undefined }) } }
  );

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", description: "", price: 0, categoryId: undefined, stock: 0, imageUrl: "", active: true, featured: false, prepTime: undefined, internalNotes: "" },
  });

  const openCreateModal = useCallback(() => {
    setEditingProduct(null);
    form.reset({ name: "", description: "", price: 0, categoryId: categories?.[0]?.id || undefined, stock: 0, imageUrl: "", active: true, featured: false, prepTime: undefined, internalNotes: "" });
    setIsModalOpen(true);
  }, [form, categories]);

  const openEditModal = useCallback((product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      price: product.price,
      categoryId: product.categoryId || undefined,
      stock: product.stock,
      imageUrl: product.imageUrl || "",
      active: product.active,
      featured: product.featured,
      prepTime: product.prepTime ?? undefined,
      internalNotes: product.internalNotes || "",
    });
    setIsModalOpen(true);
  }, [form]);

  const onSubmit = (values: ProductFormValues) => {
    const payload = {
      ...values,
      prepTime: values.prepTime || undefined,
      internalNotes: values.internalNotes || undefined,
    };
    if (editingProduct) {
      updateMutation.mutate(
        { id: editingProduct.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Produto atualizado com sucesso");
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            setIsModalOpen(false);
          },
          onError: () => toast.error("Falha ao atualizar o produto"),
        }
      );
    } else {
      createMutation.mutate(
        { data: payload as any },
        {
          onSuccess: () => {
            toast.success("Produto criado com sucesso");
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            setIsModalOpen(false);
          },
          onError: () => toast.error("Falha ao criar o produto"),
        }
      );
    }
  };

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId == null) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast.success("Produto excluído");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          setDeleteId(null);
        },
        onError: () => toast.error("Falha ao excluir o produto"),
      }
    );
  }, [deleteId, deleteMutation, queryClient]);

  const toggleStatus = useCallback((id: number, currentStatus: boolean) => {
    updateMutation.mutate(
      { id, data: { active: !currentStatus } },
      {
        onSuccess: () => {
          toast.success(`Produto ${!currentStatus ? "ativado" : "desativado"}`);
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        },
      }
    );
  }, [updateMutation, queryClient]);

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os itens do cardápio</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 h-9 text-sm shadow-md shadow-primary/20">
          <Plus className="h-4 w-4" /> Novo Produto
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            className="pl-9 h-9 bg-card/50 text-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="bg-card/50 h-9 text-sm">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Todas as categorias" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="bg-card border-card-border overflow-hidden">
              <Skeleton className="h-44 w-full rounded-none" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !products?.length ? (
        <div className="text-center py-24 bg-card/30 rounded-2xl border border-dashed border-border">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
          <h3 className="text-sm font-semibold text-foreground">Nenhum produto cadastrado</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            {searchInput || categoryId !== "all" ? "Tente ajustar os filtros" : "Cadastre o primeiro produto do cardápio"}
          </p>
          {!searchInput && categoryId === "all" && (
            <Button onClick={openCreateModal} size="sm" className="gap-2 text-xs">
              <Plus className="h-3.5 w-3.5" /> Cadastrar Produto
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18, delay: index * 0.04 }}
              >
                <Card className="bg-card border-card-border overflow-hidden group hover:border-primary/40 transition-all duration-200 h-full flex flex-col shadow-sm">
                  <div className="relative h-44 bg-muted/20 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground/20" />
                    )}
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      {product.featured && (
                        <Badge variant="default" className="bg-primary text-white text-[10px] font-semibold border-none shadow-md">
                          Destaque
                        </Badge>
                      )}
                      {!product.active && (
                        <Badge variant="outline" className="bg-background/80 text-muted-foreground text-[10px] border-border">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    {product.prepTime && (
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="outline" className="bg-background/80 text-[10px] border-border text-muted-foreground">
                          {product.prepTime} min
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-sm text-foreground line-clamp-1" title={product.name}>{product.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1.5 text-muted-foreground">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-sm">
                          <DropdownMenuItem onClick={() => openEditModal(product)}>
                            <Edit className="mr-2 h-3.5 w-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleStatus(product.id, product.active)}>
                            {product.active
                              ? <><XCircle className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Desativar</>
                              : <><CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-500" /> Ativar</>
                            }
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(product.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1">
                      {product.description || "Sem descrição cadastrada."}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                      <span className="text-base font-bold text-primary">{formatCurrency(product.price)}</span>
                      <Badge variant="outline" className={`text-xs ${product.stock <= 5 ? "text-red-400 border-red-500/30" : "text-muted-foreground"}`}>
                        {product.stock} em estoque
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Excluir produto"
        description="Deseja excluir este produto? Esta ação não poderá ser desfeita."
        confirmLabel="Excluir"
        onConfirm={handleDeleteConfirm}
      />

      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) setIsModalOpen(false); }}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-semibold">Nome do Produto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: X-Burguer Especial" className="h-9 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Preço (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="h-9 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="categoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Categoria</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val ? Number(val) : undefined)} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="stock" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Estoque</FormLabel>
                    <FormControl>
                      <Input type="number" className="h-9 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="prepTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Tempo de Preparo (min)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="Ex: 15" className="h-9 text-sm" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-semibold">URL da Imagem (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." className="h-9 text-sm" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-semibold">Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Descreva o produto..." className="h-9 text-sm" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="internalNotes" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-semibold">Notas Internas (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Instruções para a equipe, alergênicos..." className="h-9 text-sm" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="active" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-xs font-semibold">Produto Ativo</FormLabel>
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
                      <FormLabel className="text-xs font-semibold">Em Destaque</FormLabel>
                      <div className="text-[11px] text-muted-foreground">Aparece na vitrine</div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              {editingProduct && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Cardápio</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <ExtrasSection productId={editingProduct.id} />
                  <IngredientsSection productId={editingProduct.id} />
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProduct ? "Salvar Alterações" : "Criar Produto"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

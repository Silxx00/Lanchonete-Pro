import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, CheckCircle2, XCircle, Package } from "lucide-react";
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

import {
  useListProducts,
  getListProductsQueryKey,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useListCategories,
} from "@workspace/api-client-react";

import type { Product } from "@workspace/api-client-react";

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0.01, "Preço deve ser maior que zero"),
  categoryId: z.coerce.number().optional().nullable(),
  stock: z.coerce.number().min(0, "Estoque não pode ser negativo"),
  imageUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
    defaultValues: { name: "", description: "", price: 0, categoryId: undefined, stock: 0, imageUrl: "", active: true, featured: false },
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    form.reset({ name: "", description: "", price: 0, categoryId: categories?.[0]?.id || undefined, stock: 0, imageUrl: "", active: true, featured: false });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
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
    });
    setIsModalOpen(true);
  };

  const onSubmit = (values: ProductFormValues) => {
    if (editingProduct) {
      updateMutation.mutate(
        { id: editingProduct.id, data: values },
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
        { data: values as any },
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

  const handleDelete = (id: number) => {
    if (confirm("Deseja excluir este produto? Esta ação não poderá ser desfeita.")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Produto excluído");
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          },
          onError: () => toast.error("Falha ao excluir o produto"),
        }
      );
    }
  };

  const toggleStatus = (id: number, currentStatus: boolean) => {
    updateMutation.mutate(
      { id, data: { active: !currentStatus } },
      {
        onSuccess: () => {
          toast.success(`Produto ${!currentStatus ? "ativado" : "desativado"}`);
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        },
      }
    );
  };

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            {search || categoryId !== "all" ? "Tente ajustar os filtros" : "Cadastre o primeiro produto do cardápio"}
          </p>
          {!search && categoryId === "all" && (
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
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                          <DropdownMenuItem onClick={() => handleDelete(product.id)} className="text-destructive focus:text-destructive">
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[580px] bg-card border-border rounded-2xl">
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

                <FormField control={form.control} name="imageUrl" render={({ field }) => (
                  <FormItem>
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

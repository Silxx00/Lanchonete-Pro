import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, Edit, Trash2, Tags } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";

import {
  useListCategories,
  getListCategoriesQueryKey,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@workspace/api-client-react";

import type { Category } from "@workspace/api-client-react";

const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  active: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: categories, isLoading } = useListCategories();

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "", imageUrl: "", active: true },
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    form.reset({ name: "", description: "", imageUrl: "", active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      imageUrl: category.imageUrl || "",
      active: category.active,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (values: CategoryFormValues) => {
    if (editingCategory) {
      updateMutation.mutate(
        { id: editingCategory.id, data: values },
        {
          onSuccess: () => {
            toast.success("Categoria atualizada com sucesso");
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            setIsModalOpen(false);
          },
          onError: () => toast.error("Falha ao atualizar a categoria"),
        }
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            toast.success("Categoria criada com sucesso");
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            setIsModalOpen(false);
          },
          onError: () => toast.error("Falha ao criar a categoria"),
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja excluir esta categoria? Os produtos vinculados podem ser afetados.")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Categoria excluída");
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          },
          onError: () => toast.error("Falha ao excluir a categoria"),
        }
      );
    }
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize os produtos do cardápio por categoria</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 h-9 text-sm shadow-md shadow-primary/20">
          <Plus className="h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card border-card-border overflow-hidden">
              <Skeleton className="h-28 w-full rounded-none" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !categories?.length ? (
        <div className="text-center py-24 bg-card/30 rounded-2xl border border-dashed border-border">
          <Tags className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
          <h3 className="text-sm font-semibold text-foreground">Nenhuma categoria cadastrada</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Crie categorias para organizar o cardápio</p>
          <Button onClick={openCreateModal} size="sm" className="gap-2 text-xs">
            <Plus className="h-3.5 w-3.5" /> Criar Categoria
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
              >
                <Card className={`bg-card border-card-border overflow-hidden group hover:border-primary/40 transition-all duration-200 h-full flex flex-col shadow-sm ${!category.active ? "opacity-55" : ""}`}>
                  <div className="relative h-28 bg-muted/20 flex items-center justify-center overflow-hidden">
                    {category.imageUrl ? (
                      <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="text-3xl font-black text-muted-foreground/15 uppercase tracking-tighter">
                        {category.name.substring(0, 3)}
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full bg-background/80 backdrop-blur shadow-sm">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-sm">
                          <DropdownMenuItem onClick={() => openEditModal(category)}>
                            <Edit className="mr-2 h-3.5 w-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(category.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <CardContent className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-sm text-foreground mb-1">{category.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {category.description || "Sem descrição."}
                    </p>
                    {!category.active && (
                      <span className="text-[10px] text-muted-foreground mt-2 font-medium">Inativa</span>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Lanches, Bebidas..." className="h-9 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Descreva a categoria..." className="h-9 text-sm" {...field} value={field.value || ""} />
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

              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-xs font-semibold">Categoria Ativa</FormLabel>
                    <div className="text-[11px] text-muted-foreground">Visível no cardápio</div>
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
                  {editingCategory ? "Salvar Alterações" : "Criar Categoria"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

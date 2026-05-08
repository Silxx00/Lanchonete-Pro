import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, MoreHorizontal, Edit, Trash2, Users } from "lucide-react";
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

import {
  useListUsers,
  getListUsersQueryKey,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useGetMe,
} from "@workspace/api-client-react";

import type { User } from "@workspace/api-client-react";

const userSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres").optional().or(z.literal("")),
  role: z.enum(["admin", "manager", "employee"]),
  active: z.boolean().default(true),
});

type UserFormValues = z.infer<typeof userSchema>;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  employee: "Funcionário",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "border-primary/40 text-primary",
  manager: "border-blue-400/40 text-blue-400",
  employee: "border-muted-foreground/40 text-muted-foreground",
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useGetMe();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users, isLoading } = useListUsers();

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", password: "", role: "employee", active: true },
  });

  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Shield className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Acesso Restrito</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Apenas administradores podem visualizar e gerenciar usuários do sistema.
          </p>
        </div>
      </div>
    );
  }

  const openCreateModal = () => {
    setEditingUser(null);
    form.reset({ name: "", email: "", password: "", role: "employee", active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    form.reset({ name: user.name, email: user.email, password: "", role: user.role as "admin" | "manager" | "employee", active: user.active });
    setIsModalOpen(true);
  };

  const onSubmit = (values: UserFormValues) => {
    if (editingUser) {
      const updateData = { ...values };
      if (!updateData.password) delete (updateData as any).password;
      updateMutation.mutate(
        { id: editingUser.id, data: updateData },
        {
          onSuccess: () => {
            toast.success("Usuário atualizado com sucesso");
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            setIsModalOpen(false);
          },
          onError: () => toast.error("Falha ao atualizar o usuário"),
        }
      );
    } else {
      if (!values.password) {
        form.setError("password", { message: "Senha é obrigatória para novos usuários" });
        return;
      }
      createMutation.mutate(
        { data: values as any },
        {
          onSuccess: () => {
            toast.success("Usuário criado com sucesso");
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            setIsModalOpen(false);
          },
          onError: () => toast.error("Falha ao criar o usuário"),
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (id === currentUser?.id) {
      toast.error("Você não pode excluir sua própria conta");
      return;
    }
    if (confirm("Deseja excluir este usuário? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Usuário excluído");
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          },
          onError: () => toast.error("Falha ao excluir o usuário"),
        }
      );
    }
  };

  return (
    <div className="space-y-6 max-w-screen-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie o acesso da equipe ao sistema</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 h-9 text-sm shadow-md shadow-primary/20">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Perfil</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-44" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="h-7 w-7 ml-auto" /></td>
                  </tr>
                ))
              ) : !users?.length ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Users className="h-9 w-9 mx-auto text-muted-foreground opacity-20 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Nenhum usuário cadastrado</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className={`hover:bg-accent/20 transition-colors ${!user.active ? "opacity-50" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground text-sm">{user.name}</span>
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">Você</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-sm">{user.email}</td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className={`text-xs ${ROLE_COLORS[user.role] ?? ""}`}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${user.active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                        <span className={`text-xs font-medium ${user.active ? "text-emerald-500" : "text-muted-foreground"}`}>
                          {user.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-sm">
                          <DropdownMenuItem onClick={() => openEditModal(user)}>
                            <Edit className="mr-2 h-3.5 w-3.5" /> Editar
                          </DropdownMenuItem>
                          {user.id !== currentUser?.id && (
                            <DropdownMenuItem onClick={() => handleDelete(user.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                            </DropdownMenuItem>
                          )}
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
        <DialogContent className="sm:max-w-[420px] bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João Silva" className="h-9 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="joao@email.com" className="h-9 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">
                    {editingUser ? "Nova Senha (opcional)" : "Senha"}
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" className="h-9 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Perfil de Acesso</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="employee">Funcionário — acesso básico (pedidos)</SelectItem>
                      <SelectItem value="manager">Gerente — gerencia cardápio e pedidos</SelectItem>
                      <SelectItem value="admin">Administrador — acesso total</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-xs font-semibold">Conta Ativa</FormLabel>
                    <div className="text-[11px] text-muted-foreground">Usuário pode acessar o sistema</div>
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
                  {editingUser ? "Salvar Alterações" : "Criar Usuário"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

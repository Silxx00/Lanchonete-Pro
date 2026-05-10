import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, User, Mail, Lock, ShieldCheck, UserCog, Save } from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getToken } from "@/lib/auth";

const profileSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação obrigatória"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  employee: "Funcionário",
  gerente: "Gerente",
  funcionario: "Funcionário",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "border-blue-500/30 text-blue-400",
  manager: "border-indigo-500/30 text-indigo-400",
  gerente: "border-indigo-500/30 text-indigo-400",
  employee: "border-cyan-500/30 text-cyan-400",
  funcionario: "border-cyan-500/30 text-cyan-400",
};

const ROLE_ICONS: Record<string, typeof ShieldCheck> = {
  admin: ShieldCheck,
  manager: UserCog,
  gerente: UserCog,
  employee: User,
  funcionario: User,
};

async function patchMe(data: object) {
  const token = getToken();
  const res = await fetch("/api/auth/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error || "Erro ao salvar");
  return json;
}

export default function ProfilePage() {
  const { user: tokenUser } = useAuth();
  const { data: user, isLoading, refetch } = useGetMe({
    query: { queryKey: ["getMe"], staleTime: 0 },
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const displayName = user?.name || tokenUser?.email || "Usuário";
  const displayEmail = user?.email || tokenUser?.email || "";
  const displayRole = user?.role || tokenUser?.role || "employee";

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  const RoleIcon = ROLE_ICONS[displayRole] ?? User;

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "", email: user?.email ?? "" },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSaveProfile = async (data: ProfileForm) => {
    setSavingProfile(true);
    try {
      await patchMe(data);
      await refetch();
      toast.success("Perfil atualizado com sucesso!");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao salvar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const onSavePassword = async (data: PasswordForm) => {
    setSavingPassword(true);
    try {
      await patchMe({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      passwordForm.reset();
      toast.success("Senha alterada com sucesso!");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao alterar senha");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas informações e segurança</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-5"
      >
        <Card className="bg-card border-card-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl border border-primary/20">
                  {isLoading ? "..." : initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1.5 min-w-0">
                <p className="text-base font-semibold text-foreground leading-none">
                  {isLoading ? "Carregando..." : displayName}
                </p>
                <p className="text-sm text-muted-foreground leading-none truncate">{displayEmail}</p>
                <Badge
                  variant="outline"
                  className={`w-fit text-[11px] mt-0.5 px-2 py-0.5 ${ROLE_COLORS[displayRole] ?? ""}`}
                >
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {ROLE_LABELS[displayRole] ?? displayRole}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Informações Pessoais
            </CardTitle>
            <CardDescription className="text-xs">Atualize seu nome e endereço de e-mail</CardDescription>
          </CardHeader>
          <Separator className="mb-4" />
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Seu nome completo"
                            className="h-10 pl-9 bg-background/60 border-border focus:border-primary/60 transition-colors text-sm"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="seu@email.com"
                            type="email"
                            className="h-10 pl-9 bg-background/60 border-border focus:border-primary/60 transition-colors text-sm"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    className="gap-2 h-9 text-sm"
                    disabled={savingProfile || isLoading}
                  >
                    {savingProfile ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...</>
                    ) : (
                      <><Save className="h-3.5 w-3.5" /> Salvar alterações</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="bg-card border-card-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              Alterar Senha
            </CardTitle>
            <CardDescription className="text-xs">Para alterar a senha informe a senha atual e a nova</CardDescription>
          </CardHeader>
          <Separator className="mb-4" />
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onSavePassword)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Senha Atual</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="••••••••"
                            type="password"
                            autoComplete="current-password"
                            className="h-10 pl-9 bg-background/60 border-border focus:border-primary/60 transition-colors text-sm"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Mínimo 6 caracteres"
                            type="password"
                            autoComplete="new-password"
                            className="h-10 pl-9 bg-background/60 border-border focus:border-primary/60 transition-colors text-sm"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirmar Nova Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Repita a nova senha"
                            type="password"
                            autoComplete="new-password"
                            className="h-10 pl-9 bg-background/60 border-border focus:border-primary/60 transition-colors text-sm"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    className="gap-2 h-9 text-sm"
                    disabled={savingPassword}
                  >
                    {savingPassword ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...</>
                    ) : (
                      <><Save className="h-3.5 w-3.5" /> Alterar senha</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

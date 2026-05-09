import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, Lock, Zap } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(3, "Senha obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

const QUICK_ACCESS = [
  { label: "Admin", email: "admin@lanchonete.com", password: "123456", color: "text-blue-400 border-blue-500/30 hover:bg-blue-500/10" },
  { label: "Gerente", email: "gerente@lanchonete.com", password: "123456", color: "text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10" },
  { label: "Funcionário", email: "funcionario@lanchonete.com", password: "123456", color: "text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10" },
];

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, login } = useAuth();
  const loginMutation = useLogin();

  useEffect(() => {
    if (isAuthenticated) setLocation("/dashboard");
  }, [isAuthenticated, setLocation]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.accessToken, res.refreshToken);
        toast.success("Acesso realizado com sucesso!");
        setLocation("/dashboard");
      },
      onError: (error) => {
        const msg = (error.data as { error?: string } | null)?.error;
        toast.error(msg || "E-mail ou senha inválidos");
      },
    });
  };

  const fillCredentials = (email: string, password: string) => {
    form.setValue("email", email);
    form.setValue("password", password);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(221_83%_53%_/_0.1)_0%,_transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_hsl(221_83%_40%_/_0.06)_0%,_transparent_50%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[420px]"
      >
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-5 shadow-xl shadow-primary/10">
            <div className="w-6 h-6 rounded-md bg-primary shadow-lg shadow-primary/40" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nova Era</h1>
          <p className="text-sm text-muted-foreground mt-1">Painel Administrativo</p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-7 shadow-2xl shadow-black/40">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-foreground">Entrar na sua conta</h2>
            <p className="text-xs text-muted-foreground mt-1">Informe suas credenciais para acessar</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="seu@email.com"
                        type="email"
                        autoComplete="email"
                        className="h-10 bg-background/60 border-border focus:border-primary/60 transition-colors text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Senha</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        autoComplete="current-password"
                        className="h-10 bg-background/60 border-border focus:border-primary/60 transition-colors text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Entrando...</>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 pt-5 border-t border-border">
            <div className="flex items-center gap-1.5 mb-3">
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Acesso rápido</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACCESS.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => fillCredentials(a.email, a.password)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${a.color}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">Clique para preencher as credenciais</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/50">
          <Lock className="h-3 w-3" />
          Conexão protegida com JWT
        </div>
      </motion.div>
    </div>
  );
}

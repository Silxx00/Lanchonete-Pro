import { memo, useCallback } from "react";
import { Menu, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useGetMe } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  funcionario: "Funcionário",
};

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard":  { title: "Painel",      subtitle: "Visão geral do desempenho" },
  "/orders":     { title: "Pedidos",     subtitle: "Controle de pedidos em tempo real" },
  "/products":   { title: "Produtos",    subtitle: "Gerenciamento do cardápio" },
  "/categories": { title: "Categorias",  subtitle: "Organização do cardápio" },
  "/promotions": { title: "Promoções",   subtitle: "Ofertas e descontos ativos" },
  "/users":      { title: "Usuários",    subtitle: "Controle de acesso ao sistema" },
  "/profile":    { title: "Meu Perfil",  subtitle: "Configurações da sua conta" },
};

export const TopBar = memo(function TopBar({ setMobileOpen }: { setMobileOpen: (o: boolean) => void }) {
  const [location, setLocation] = useLocation();
  const { user: tokenUser, logout } = useAuth();
  const { data: user } = useGetMe({
    query: {
      enabled: !!tokenUser,
      queryKey: ["getMe"],
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  });

  const handleLogout = useCallback(() => {
    logout();
    setLocation("/login");
  }, [logout, setLocation]);

  const handleMenuOpen = useCallback(() => setMobileOpen(true), [setMobileOpen]);

  const displayName = user?.name || tokenUser?.email || "Admin";
  const displayEmail = user?.email || tokenUser?.email || "";
  const displayRole = user?.role || tokenUser?.role || "funcionario";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  const pageInfo = PAGE_TITLES[location] ?? { title: "Nova Era", subtitle: "Painel Administrativo" };

  return (
    <header className="h-14 border-b border-border bg-card/40 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={handleMenuOpen}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="hidden md:block min-w-0">
          <h2 className="text-sm font-semibold text-foreground leading-none truncate">{pageInfo.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-none truncate">{pageInfo.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-9 px-2.5 rounded-lg hover:bg-accent transition-colors"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-white font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs font-semibold text-foreground leading-none">{displayName}</span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  {ROLE_LABELS[displayRole] ?? displayRole}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3 pb-1">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-white font-bold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold leading-none text-foreground">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                  <Badge variant="outline" className="w-fit text-[10px] mt-0.5 border-primary/30 text-primary px-1.5 py-0.5">
                    {ROLE_LABELS[displayRole] ?? displayRole}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setLocation("/profile")}
              className="cursor-pointer text-sm gap-2.5"
            >
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <span>Meu perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer text-sm gap-2.5"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair do sistema</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
});

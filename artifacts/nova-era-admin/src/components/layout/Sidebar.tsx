import { memo } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  TicketPercent,
  Users,
  X,
  ShieldCheck,
  UserCog,
  User,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { name: "Painel",      href: "/dashboard",   icon: LayoutDashboard, minLevel: 1 },
  { name: "Pedidos",     href: "/orders",       icon: ShoppingCart,    minLevel: 1 },
  { name: "Produtos",    href: "/products",     icon: Package,         minLevel: 1 },
  { name: "Categorias",  href: "/categories",   icon: Tags,            minLevel: 1 },
  { name: "Promoções",   href: "/promotions",   icon: TicketPercent,   minLevel: 2 },
  { name: "Financeiro",  href: "/financeiro",   icon: TrendingUp,      minLevel: 2 },
  { name: "Usuários",    href: "/users",        icon: Users,           minLevel: 3 },
];

const ROLE_LEVELS: Record<string, number> = { admin: 3, gerente: 2, funcionario: 1 };

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  funcionario: "Funcionário",
};

const ROLE_ICONS: Record<string, typeof ShieldCheck> = {
  admin: ShieldCheck,
  gerente: UserCog,
  funcionario: User,
};

const ROLE_COLORS: Record<string, string> = {
  admin:      "text-blue-400",
  gerente:    "text-indigo-400",
  funcionario: "text-cyan-400",
};

export const Sidebar = memo(function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (o: boolean) => void }) {
  const [location] = useLocation();
  const { role } = usePermission();
  const { user } = useAuth();
  const userLevel = ROLE_LEVELS[role] ?? 0;

  const visibleItems = navItems.filter((item) => userLevel >= item.minLevel);

  const displayName = user?.name || user?.email || "Usuário";
  const displayEmail = user?.email || "";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  const RoleIcon = ROLE_ICONS[role] ?? User;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <div className="w-3.5 h-3.5 rounded-sm bg-white/90" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground">Nova Era</span>
              <div className="text-[10px] text-muted-foreground leading-none mt-0.5">Lanchonete</div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 text-muted-foreground"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 py-4 px-3 flex flex-col gap-0.5 overflow-y-auto scrollbar-none">
          <div className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.1em]">
            Menu
          </div>
          {visibleItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link key={item.name} href={item.href} onClick={() => setMobileOpen(false)}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer select-none",
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/25"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors",
                      isActive ? "text-white" : "text-muted-foreground"
                    )}
                  />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="shrink-0 p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-sidebar-accent/60 hover:bg-sidebar-accent transition-colors cursor-default">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs border border-primary/20">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground/90 leading-none truncate">{displayName}</span>
              {displayEmail && (
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate">{displayEmail}</span>
              )}
            </div>
            <RoleIcon className={cn("h-3.5 w-3.5 shrink-0", ROLE_COLORS[role])} title={ROLE_LABELS[role]} />
          </div>
        </div>
      </aside>
    </>
  );
});

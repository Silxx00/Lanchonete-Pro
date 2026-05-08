import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  TicketPercent,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/usePermission";

const navItems = [
  { name: "Painel", href: "/dashboard", icon: LayoutDashboard, minLevel: 1 },
  { name: "Pedidos", href: "/orders", icon: ShoppingCart, minLevel: 1 },
  { name: "Produtos", href: "/products", icon: Package, minLevel: 1 },
  { name: "Categorias", href: "/categories", icon: Tags, minLevel: 1 },
  { name: "Promoções", href: "/promotions", icon: TicketPercent, minLevel: 2 },
  { name: "Usuários", href: "/users", icon: Users, minLevel: 3 },
];

const ROLE_LEVELS: Record<string, number> = { admin: 3, manager: 2, employee: 1 };

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  employee: "Funcionário",
};

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (o: boolean) => void }) {
  const [location] = useLocation();
  const { role } = usePermission();
  const userLevel = ROLE_LEVELS[role] ?? 0;

  const visibleItems = navItems.filter((item) => userLevel >= item.minLevel);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <motion.aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <div className="w-3.5 h-3.5 rounded-sm bg-white/90" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground">Nova Era</span>
              <div className="text-[10px] text-muted-foreground leading-none mt-0.5">Administração</div>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 py-5 px-3 flex flex-col gap-0.5 overflow-y-auto scrollbar-none">
          <div className="px-3 mb-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Navegação
          </div>
          {visibleItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/25"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-white" : "text-muted-foreground")} />
                  {item.name}
                </motion.div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="px-3 py-2.5 rounded-lg bg-sidebar-accent/60">
            <div className="text-xs font-medium text-foreground/80">{ROLE_LABELS[role] ?? role}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {role === "admin" ? "Acesso total ao sistema" : role === "manager" ? "Gerencia cardápio e pedidos" : "Visualiza e atualiza pedidos"}
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

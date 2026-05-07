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
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoPath from "@assets/Screenshot_20260507_062530_Instagram_1778164969419.png";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/usePermission";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, minLevel: 1 },
  { name: "Pedidos", href: "/orders", icon: ShoppingCart, minLevel: 1 },
  { name: "Produtos", href: "/products", icon: Package, minLevel: 1 },
  { name: "Categorias", href: "/categories", icon: Tags, minLevel: 1 },
  { name: "Promoções", href: "/promotions", icon: TicketPercent, minLevel: 2 },
  { name: "Usuários", href: "/users", icon: Users, minLevel: 3 },
];

const ROLE_LEVELS: Record<string, number> = { admin: 3, manager: 2, employee: 1 };

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (o: boolean) => void }) {
  const [location] = useLocation();
  const { role } = usePermission();
  const userLevel = ROLE_LEVELS[role] ?? 0;

  const visibleItems = navItems.filter((item) => userLevel >= item.minLevel);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: mobileOpen ? 0 : 0 }}
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[280px] bg-sidebar border-r border-sidebar-border flex flex-col transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img src={logoPath} alt="Nova Era" className="h-8 w-8 rounded-md object-cover" />
            <span className="font-bold text-lg tracking-tight text-white">NOVA ERA</span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
          <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Menu
          </div>
          {visibleItems.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-sidebar-foreground")} />
                  {item.name}
                </motion.div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent/50">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground capitalize">
              {role === "admin" ? "Administrador" : role === "manager" ? "Gerente" : "Funcionário"}
            </span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

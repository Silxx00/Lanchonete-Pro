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
  manager: "Gerente",
  employee: "Funcionário",
};

export function TopBar({ setMobileOpen }: { setMobileOpen: (o: boolean) => void }) {
  const [, setLocation] = useLocation();
  const { user: tokenUser, logout } = useAuth();
  const { data: user } = useGetMe({ query: { enabled: !!tokenUser, queryKey: ["getMe"] } });

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const displayName = user?.name || tokenUser?.email || "Admin";
  const displayEmail = user?.email || tokenUser?.email || "";
  const displayRole = user?.role || tokenUser?.role || "employee";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <header className="h-14 border-b border-border bg-card/40 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2.5 h-9 px-3 rounded-lg hover:bg-accent transition-colors"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-white font-semibold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground leading-none">{displayName}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1.5 pb-1">
                <p className="text-sm font-semibold leading-none text-foreground">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                <Badge variant="outline" className="w-fit text-xs mt-1 border-primary/30 text-primary">
                  {ROLE_LABELS[displayRole] ?? displayRole}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-sm gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <span>Meu perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive cursor-pointer text-sm gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair do sistema</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

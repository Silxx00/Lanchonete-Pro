import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ProductsPage from "@/pages/ProductsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import OrdersPage from "@/pages/OrdersPage";
import PromotionsPage from "@/pages/PromotionsPage";
import UsersPage from "@/pages/UsersPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, minRole }: { component: React.ComponentType; minRole?: "admin" | "manager" | "employee" }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (minRole && user) {
    const levels: Record<string, number> = { admin: 3, manager: 2, employee: 1 };
    const userLevel = levels[user.role] ?? 0;
    const required = levels[minRole] ?? 0;
    if (userLevel < required) {
      return (
        <AppLayout>
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <p className="text-2xl font-bold text-destructive">Acesso negado</p>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </div>
        </AppLayout>
      );
    }
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/products">
        <ProtectedRoute component={ProductsPage} />
      </Route>
      <Route path="/categories">
        <ProtectedRoute component={CategoriesPage} />
      </Route>
      <Route path="/orders">
        <ProtectedRoute component={OrdersPage} />
      </Route>
      <Route path="/promotions">
        <ProtectedRoute component={PromotionsPage} minRole="manager" />
      </Route>
      <Route path="/users">
        <ProtectedRoute component={UsersPage} minRole="admin" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster theme="dark" position="top-right" />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

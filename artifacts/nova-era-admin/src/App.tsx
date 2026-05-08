import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProductsPage = lazy(() => import("@/pages/ProductsPage"));
const CategoriesPage = lazy(() => import("@/pages/CategoriesPage"));
const OrdersPage = lazy(() => import("@/pages/OrdersPage"));
const PromotionsPage = lazy(() => import("@/pages/PromotionsPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="h-6 w-6 animate-spin text-primary opacity-60" />
    </div>
  );
}

function ProtectedRoute({
  component: Component,
  minRole,
}: {
  component: React.ComponentType;
  minRole?: "admin" | "manager" | "employee";
}) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Redirect to="/login" />;

  if (minRole && user) {
    const levels: Record<string, number> = { admin: 3, manager: 2, employee: 1 };
    const userLevel = levels[user.role] ?? 0;
    const required = levels[minRole] ?? 0;
    if (userLevel < required) {
      return (
        <AppLayout>
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
            <p className="text-xl font-bold text-destructive">Acesso negado</p>
            <p className="text-sm text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </div>
        </AppLayout>
      );
    }
  }

  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </AppLayout>
  );
}

function AnimatedRoutes() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{ height: "100%" }}
      >
        <Switch>
          <Route path="/login">
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          </Route>
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
          <Route>
            <Suspense fallback={<PageLoader />}>
              <NotFound />
            </Suspense>
          </Route>
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AnimatedRoutes />
          </WouterRouter>
          <Toaster theme="dark" position="top-right" richColors closeButton />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

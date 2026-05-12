import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, RotateCcw, Tags, Package, ShoppingCart,
  DollarSign, TicketPercent, AlertTriangle, CheckCircle2,
  Trash2, Clock, User, Loader2, ChevronDown, ChevronUp, Layers,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useExecuteReset, useResetLogs, type ResetType, type ResetCounts } from "@/hooks/useReset";
import { useQueryClient } from "@tanstack/react-query";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 26 } },
};

const ENTITY_LABELS: Record<string, string> = {
  categories: "Categorias",
  products: "Produtos",
  orders: "Pedidos",
  financial: "Financeiro",
  promotions: "Promoções",
  combos: "Combos",
};

const ENTITY_COLORS: Record<string, string> = {
  categories: "text-orange-400",
  products: "text-blue-400",
  orders: "text-cyan-400",
  financial: "text-red-400",
  promotions: "text-purple-400",
  combos: "text-emerald-400",
};

interface ResetCard {
  type: ResetType;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  deletes: string[];
  preserves: string[];
  warning?: string;
}

const RESET_CARDS: ResetCard[] = [
  {
    type: "categories",
    icon: Tags,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-400",
    title: "Resetar Categorias",
    subtitle: "Remove todas as categorias cadastradas",
    deletes: ["Todas as categorias"],
    preserves: ["Produtos (categoria removida)", "Pedidos", "Usuários", "Financeiro", "Promoções"],
  },
  {
    type: "orders",
    icon: ShoppingCart,
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
    title: "Resetar Pedidos",
    subtitle: "Limpa o histórico de pedidos do sistema",
    deletes: ["Todos os pedidos", "Todos os itens de pedido"],
    preserves: ["Produtos", "Categorias", "Usuários", "Financeiro", "Promoções"],
  },
  {
    type: "products",
    icon: Package,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    title: "Resetar Produtos",
    subtitle: "Remove produtos e todos os dados vinculados",
    deletes: ["Todos os produtos", "Adicionais vinculados", "Ingredientes vinculados", "Pedidos e itens (FK obrigatória)"],
    preserves: ["Categorias", "Usuários", "Financeiro", "Promoções"],
    warning: "Pedidos também serão apagados por dependência de banco de dados.",
  },
  {
    type: "financial",
    icon: DollarSign,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-400",
    title: "Resetar Financeiro",
    subtitle: "Limpa todo o histórico financeiro",
    deletes: ["Despesas registradas", "Fechamentos de caixa", "Gráficos e relatórios"],
    preserves: ["Produtos", "Categorias", "Pedidos", "Usuários", "Promoções"],
  },
  {
    type: "promotions",
    icon: TicketPercent,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    title: "Resetar Promoções",
    subtitle: "Remove todas as promoções ativas e inativas",
    deletes: ["Promoções ativas", "Promoções inativas", "Descontos cadastrados"],
    preserves: ["Produtos", "Categorias", "Pedidos", "Usuários", "Financeiro"],
  },
  {
    type: "combos",
    icon: Layers,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    title: "Resetar Combos",
    subtitle: "Remove todos os combos e seus itens",
    deletes: ["Todos os combos", "Itens de cada combo"],
    preserves: ["Produtos", "Categorias", "Pedidos", "Usuários", "Financeiro", "Promoções"],
  },
];

function ResetCardItem({
  card,
  onReset,
  isPending,
}: {
  card: ResetCard;
  onReset: (type: ResetType) => void;
  isPending: boolean;
}) {
  const Icon = card.icon;
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-card border-card-border hover:border-destructive/30 transition-colors duration-200 h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", card.iconBg)}>
              <Icon className={cn("h-5 w-5", card.iconColor)} />
            </div>
          </div>
          <div className="mt-3">
            <CardTitle className="text-sm font-bold text-foreground">{card.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400/80">Será apagado</p>
            <div className="space-y-1">
              {card.deletes.map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Trash2 className="h-3 w-3 text-red-400 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80">Será preservado</p>
            <div className="flex flex-wrap gap-1.5">
              {card.preserves.map((item) => (
                <Badge
                  key={item}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          {card.warning && (
            <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/15 text-xs text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {card.warning}
            </div>
          )}

          <div className="mt-auto pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/60 gap-2 transition-all"
              onClick={() => onReset(card.type)}
              disabled={isPending}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {card.title}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ResetLogsSection() {
  const [open, setOpen] = useState(false);
  const { data: logs, isLoading } = useResetLogs();

  return (
    <Card className="bg-card border-card-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Histórico de Resets</span>
          {logs && logs.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {logs.length}
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <CardContent className="pt-0">
          <div className="border-t border-border pt-4">
            {isLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando histórico...
              </div>
            ) : !logs?.length ? (
              <div className="py-8 text-center text-muted-foreground">
                <Clock className="h-8 w-8 opacity-20 mx-auto mb-2" />
                <p className="text-sm">Nenhum reset registrado ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-border bg-background/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                        <RotateCcw className="h-3.5 w-3.5 text-destructive" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-semibold", ENTITY_COLORS[log.entity] ?? "text-foreground")}>
                            {ENTITY_LABELS[log.entity] ?? log.entity}
                          </span>
                          <span className="text-[10px] text-muted-foreground">resetado</span>
                        </div>
                        {log.details?.message && (
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5">{log.details.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right shrink-0 pl-11 sm:pl-0">
                      {log.userEmail && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <User className="h-3 w-3" />
                          {log.userEmail}
                        </div>
                      )}
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {new Date(log.createdAt).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ResetPage() {
  const [pending, setPending] = useState<ResetType | null>(null);
  const [confirm, setConfirm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const executeMutation = useExecuteReset();

  const openConfirm = (type: ResetType) => {
    setPending(type);
    setConfirm("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const closeConfirm = () => {
    setPending(null);
    setConfirm("");
  };

  const formatCounts = (counts: ResetCounts | undefined): string | undefined => {
    if (!counts) return undefined;
    const parts = Object.entries(counts)
      .filter(([, v]) => typeof v === "number" && v > 0)
      .map(([k, v]) => {
        const label = k.replace(/([A-Z])/g, " $1").toLowerCase().replace("deleted", "").trim();
        return `${v} ${label}`;
      });
    return parts.length > 0 ? parts.join(", ") : undefined;
  };

  const handleConfirm = () => {
    if (!pending || confirm !== "CONFIRMAR") return;
    executeMutation.mutate(pending, {
      onSuccess: (res) => {
        const description = formatCounts(res.counts);
        toast.success(res.message, { description });
        queryClient.invalidateQueries();
        closeConfirm();
      },
      onError: (err) => {
        toast.error(err.message || "Erro ao executar reset");
      },
    });
  };

  const pendingCard = RESET_CARDS.find((c) => c.type === pending);
  const isValid = confirm === "CONFIRMAR";

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            Reset do Sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Área administrativa para limpeza controlada de dados
          </p>
        </div>
      </div>

      {/* Danger banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/8 border border-destructive/20">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-destructive">Atenção — Ações Irreversíveis</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Os resets apagam dados permanentemente do banco de dados. Nenhuma tabela é removida — apenas os registros
            selecionados. Todas as ações são registradas no log de auditoria com usuário e data/hora.
            <strong className="text-foreground"> Disponível apenas para Gerente e Administrador.</strong>
          </p>
        </div>
      </div>

      {/* Reset cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        {RESET_CARDS.map((card) => (
          <ResetCardItem
            key={card.type}
            card={card}
            onReset={openConfirm}
            isPending={executeMutation.isPending}
          />
        ))}
      </motion.div>

      {/* Logs */}
      <ResetLogsSection />

      {/* Confirmation Dialog */}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && closeConfirm()}>
        <DialogContent className="max-w-md bg-card border-destructive/30 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-base font-bold">
              <ShieldAlert className="h-5 w-5" />
              {pendingCard?.title ?? "Confirmar Reset"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* What will be deleted */}
            <div className="p-3.5 rounded-xl bg-destructive/8 border border-destructive/15 space-y-2">
              <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Será apagado permanentemente:</p>
              <ul className="space-y-1">
                {pendingCard?.deletes.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Trash2 className="h-3 w-3 text-destructive shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {pendingCard?.warning && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {pendingCard.warning}
              </div>
            )}

            {/* Confirmation input */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Digite <strong className="text-foreground font-mono">CONFIRMAR</strong> para liberar o botão:
              </p>
              <Input
                ref={inputRef}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.toUpperCase())}
                placeholder="CONFIRMAR"
                className={cn(
                  "h-10 text-sm font-mono tracking-wider transition-colors",
                  isValid
                    ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-400 focus-visible:ring-emerald-500/30"
                    : "border-border"
                )}
                onKeyDown={(e) => e.key === "Enter" && isValid && handleConfirm()}
              />
              {isValid && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirmação válida
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-9 text-xs" onClick={closeConfirm}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-9 text-xs gap-1.5"
              onClick={handleConfirm}
              disabled={!isValid || executeMutation.isPending}
            >
              {executeMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Executar Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

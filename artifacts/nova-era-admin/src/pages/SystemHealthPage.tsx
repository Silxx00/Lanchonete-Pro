import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeartPulse, ShieldCheck, AlertTriangle, Info,
  RefreshCw, Loader2, CheckCircle2, XCircle, Package,
  Layers, Tags, AlertCircle, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSystemHealth, type HealthIssue } from "@/hooks/useSystemHealth";

const SEVERITY_COLORS = {
  critical: "text-red-400 bg-red-500/10 border-red-500/30",
  high:     "text-orange-400 bg-orange-500/10 border-orange-500/30",
  warning:  "text-amber-400 bg-amber-500/10 border-amber-500/30",
  info:     "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

const SEVERITY_ICONS = {
  critical: XCircle,
  high:     AlertTriangle,
  warning:  AlertCircle,
  info:     Info,
};

const SEVERITY_LABELS = {
  critical: "Crítico",
  high:     "Alto",
  warning:  "Aviso",
  info:     "Info",
};

const TYPE_LABELS: Record<string, string> = {
  ORPHAN_COMBO:              "Combo sem itens",
  PRODUCTS_WITHOUT_CATEGORY: "Produtos sem categoria",
  DUPLICATE_PRODUCT_NAME:    "Nome duplicado",
  DUPLICATE_COMBO_NAME:      "Nome duplicado",
  ORPHAN_COMBO_ITEMS:        "Itens órfãos",
  EMPTY_CATEGORIES:          "Categorias vazias",
};

const STATUS_CONFIG = {
  healthy:  { label: "Saudável",    color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: ShieldCheck },
  warnings: { label: "Avisos",      color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30",     icon: AlertTriangle },
  degraded: { label: "Degradado",   color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/30",   icon: AlertCircle },
  critical: { label: "Crítico",     color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",         icon: XCircle },
};

function IssueCard({ issue }: { issue: HealthIssue }) {
  const Icon = SEVERITY_ICONS[issue.severity];
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border text-sm",
        SEVERITY_COLORS[issue.severity]
      )}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-xs uppercase tracking-wider">
            {TYPE_LABELS[issue.type] ?? issue.type}
          </span>
          {issue.id != null && (
            <span className="text-[10px] opacity-60 font-mono">#{issue.id}</span>
          )}
        </div>
        <p className="text-xs opacity-80 mt-0.5">{issue.description}</p>
      </div>
      <Badge
        variant="outline"
        className={cn("text-[10px] shrink-0 border", SEVERITY_COLORS[issue.severity])}
      >
        {SEVERITY_LABELS[issue.severity]}
      </Badge>
    </motion.div>
  );
}

export default function SystemHealthPage() {
  const [enabled, setEnabled] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading, isFetching } = useSystemHealth(enabled);

  const runCheck = () => {
    qc.removeQueries({ queryKey: ["system-health"] });
    setEnabled(true);
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["system-health"] });
    }, 50);
  };

  const statusCfg = data ? STATUS_CONFIG[data.summary.status] : null;
  const StatusIcon = statusCfg?.icon ?? HeartPulse;
  const busy = isLoading || isFetching;

  const issuesBySeverity = data
    ? {
        critical: data.issues.filter((i) => i.severity === "critical"),
        high:     data.issues.filter((i) => i.severity === "high"),
        warning:  data.issues.filter((i) => i.severity === "warning"),
        info:     data.issues.filter((i) => i.severity === "info"),
      }
    : null;

  return (
    <div className="space-y-6 max-w-screen-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <HeartPulse className="h-6 w-6 text-primary" />
            System Health Check
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auditoria automática de consistência do banco de dados
          </p>
        </div>
        <Button
          onClick={runCheck}
          disabled={busy}
          className="gap-2 h-9 text-sm"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {busy ? "Verificando..." : "Executar Verificação"}
        </Button>
      </div>

      {/* Status Banner */}
      <AnimatePresence mode="wait">
        {data && statusCfg && (
          <motion.div
            key="status-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border",
              statusCfg.bg
            )}
          >
            <StatusIcon className={cn("h-5 w-5 shrink-0", statusCfg.color)} />
            <div className="flex-1">
              <span className={cn("font-bold text-sm", statusCfg.color)}>
                Status: {statusCfg.label}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.summary.totalIssues === 0
                  ? "Nenhum problema encontrado. O sistema está consistente."
                  : `${data.summary.totalIssues} problema(s) detectado(s). Verifique os itens abaixo.`}
              </p>
            </div>
            {data.checkedAt && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                <Clock className="h-3 w-3" />
                {new Date(data.checkedAt).toLocaleTimeString("pt-BR")}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Produtos Ativos", value: data.stats.activeProducts, icon: Package, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Total de Produtos", value: data.stats.totalProducts, icon: Package, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Total de Combos", value: data.stats.totalCombos, icon: Layers, color: "text-primary", bg: "bg-primary/10" },
            { label: "Itens de Combos", value: data.stats.totalComboItems, icon: Tags, color: "text-purple-400", bg: "bg-purple-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="bg-card border-card-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", bg)}>
                  <Icon className={cn("h-4 w-4", color)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold text-foreground">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Counts */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["critical", "high", "warning", "info"] as const).map((sev) => {
            const cnt = data.summary[sev === "warning" ? "warnings" : sev];
            const Icon = SEVERITY_ICONS[sev];
            return (
              <div
                key={sev}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border",
                  cnt > 0 ? SEVERITY_COLORS[sev] : "text-muted-foreground bg-card border-border"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-lg font-bold leading-none">{cnt}</p>
                  <p className="text-[10px] uppercase tracking-wider mt-0.5">{SEVERITY_LABELS[sev]}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Issues List */}
      {busy && !data && (
        <Card className="bg-card border-card-border">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Analisando banco de dados...</p>
            <p className="text-xs opacity-60">Verificando combos, produtos, categorias e relações</p>
          </CardContent>
        </Card>
      )}

      {!busy && !data && (
        <Card className="bg-card border-card-border border-dashed">
          <CardContent className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <HeartPulse className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">Nenhuma verificação executada</p>
            <p className="text-xs opacity-60">Clique em "Executar Verificação" para auditar o banco de dados</p>
            <Button onClick={runCheck} variant="outline" size="sm" className="mt-2 gap-2 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              Iniciar Verificação
            </Button>
          </CardContent>
        </Card>
      )}

      {data && issuesBySeverity && (
        <AnimatePresence>
          {data.summary.totalIssues === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-16 bg-card/30 rounded-2xl border border-dashed border-emerald-500/30"
            >
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-emerald-400">Sistema completamente saudável</p>
              <p className="text-xs text-muted-foreground">Nenhuma inconsistência, dado órfão ou duplicação encontrada</p>
            </motion.div>
          ) : (
            <Card className="bg-card border-card-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Problemas Detectados ({data.summary.totalIssues})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(["critical", "high", "warning", "info"] as const).map((sev) =>
                  issuesBySeverity[sev].map((issue, idx) => (
                    <IssueCard key={`${sev}-${idx}`} issue={issue} />
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </AnimatePresence>
      )}

      {/* Info box */}
      <Card className="bg-card border-card-border">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">O que esta verificação analisa</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { icon: Layers, text: "Combos sem itens vinculados" },
              { icon: Package, text: "Produtos sem categoria atribuída" },
              { icon: AlertCircle, text: "Nomes duplicados de produtos" },
              { icon: AlertCircle, text: "Nomes duplicados de combos" },
              { icon: Tags, text: "Itens de combo com produto deletado" },
              { icon: Tags, text: "Categorias sem produtos vinculados" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

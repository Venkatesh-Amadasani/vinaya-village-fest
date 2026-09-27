import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Inbox, Lock, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { useI18n, type Key } from "@/lib/i18n";

export function KpiCard({ label, value, tone = "default", sub, icon }: { label: string; value: number; tone?: "default" | "primary" | "success" | "youth"; sub?: string; icon?: ReactNode }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-card sm:p-5", tone === "primary" && "border-transparent bg-festive text-primary-foreground", tone === "youth" && "border-youth/30")}>
      <div className={cn("flex items-center gap-2 text-sm font-medium", tone === "primary" ? "text-primary-foreground/90" : "text-muted-foreground")}>
        {icon}{label}
      </div>
      <div className={cn("tabular mt-1 text-2xl font-bold sm:text-3xl", tone === "success" && "text-success", tone === "youth" && "text-youth")}>{formatINR(value)}</div>
      {sub && <div className={cn("mt-1 text-xs", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>{sub}</div>}
    </div>
  );
}

export function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card/60 p-10 text-center text-muted-foreground">
      <Inbox className="h-8 w-8" aria-hidden />
      <p>{label ?? t("empty")}</p>
    </div>
  );
}

export function DeniedState() {
  const { t } = useI18n();
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border bg-card p-10 text-center shadow-card">
      <div className="rounded-full bg-accent p-3"><Lock className="h-6 w-6 text-accent-foreground" aria-hidden /></div>
      <h2 className="text-xl font-semibold">{t("denied")}</h2>
      <p className="text-sm text-muted-foreground">{t("deniedSub")}</p>
      <Button asChild><Link to="/auth">{t("signIn")}</Link></Button>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { t } = useI18n();
  if (error.message.includes("PERMISSION_DENIED")) return <DeniedState />;
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-card p-8 text-center">
      <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden />
      <h2 className="text-lg font-semibold">{t("error")}</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      {onRetry && <Button variant="outline" onClick={onRetry}>{t("retry")}</Button>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "youth" | "success" | "warn" | "primary" }) {
  const tones = {
    muted: "bg-muted text-muted-foreground", youth: "bg-youth/10 text-youth", success: "bg-success/10 text-success",
    warn: "bg-gold/25 text-accent-foreground", primary: "bg-primary/10 text-primary",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function StatusPill({ status }: { status: "PENDING" | "PARTIAL" | "PAID" }) {
  const { t } = useI18n();
  return <Pill tone={status === "PAID" ? "success" : status === "PARTIAL" ? "warn" : "muted"}>{t(status)}</Pill>;
}

export function FilterBar({ q, onQ, scope, onScope, showYouth }: { q: string; onQ: (v: string) => void; scope: "ALL" | "GENERAL" | "YOUTH"; onScope: (s: "ALL" | "GENERAL" | "YOUTH") => void; showYouth: boolean }) {
  const { t } = useI18n();
  const opts: Array<["ALL" | "GENERAL" | "YOUTH", Key]> = [["ALL", "all"], ["GENERAL", "general"], ["YOUTH", "youth"]];
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="relative flex-1">
        <span className="sr-only">{t("search")}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => onQ(e.target.value)} placeholder={t("search")} className="h-12 bg-card pl-9 text-base" />
      </label>
      {showYouth && (
        <div role="radiogroup" className="flex rounded-lg border bg-card p-1">
          {opts.map(([v, k]) => (
            <button key={v} role="radio" aria-checked={scope === v} onClick={() => onScope(v)}
              className={cn("h-10 flex-1 rounded-md px-4 text-sm font-medium transition-colors", scope === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
              {t(k)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{t("showing")} {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {t("of")} {total}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("prev")}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="flex items-center px-2 tabular">{page}/{pages}</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={t("next")}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </nav>
  );
}

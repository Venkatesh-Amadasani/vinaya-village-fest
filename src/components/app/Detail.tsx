import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

export function DetailShell({ back, title, action, children }: { back: "/donations" | "/expenses" | "/auctions"; title: ReactNode; action?: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to={back} className="inline-flex h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />{t("back")}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">{title}</h1>{action}
      </div>
      {children}
    </div>
  );
}

export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-sm text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

type Hist = { id: string; action: string; actor: string; reason: string | null; at: string };
export function History({ rows }: { rows: Hist[] }) {
  const { t } = useI18n();
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{t("history")}</h2>
      <ul className="space-y-2 text-sm">
        {rows.map((h) => (
          <li key={h.id} className="rounded-lg border bg-card px-4 py-2">
            <span className="font-semibold">{h.action}</span> · {h.actor} · {formatDate(h.at)}
            {h.reason && <div className="text-muted-foreground">{h.reason}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}

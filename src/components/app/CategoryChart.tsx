import { formatINR } from "@/lib/format";
import { pick, useI18n } from "@/lib/i18n";

/** Accessible horizontal bar breakdown (no canvas; readable on low-end phones). */
export function CategoryChart({ data }: { data: Array<{ id: string; nameEn: string; nameTe: string; amount: number }> }) {
  const { lang } = useI18n();
  const max = Math.max(1, ...data.map((d) => d.amount));
  const total = data.reduce((s, d) => s + d.amount, 0);
  const colors = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
  return (
    <ul className="space-y-3">
      {[...data].sort((a, b) => b.amount - a.amount).map((d, i) => (
        <li key={d.id}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="font-medium">{pick(lang, d.nameEn, d.nameTe)}</span>
            <span className="tabular text-muted-foreground">{formatINR(d.amount)} · {Math.round((d.amount / Math.max(total, 1)) * 100)}%</span>
          </div>
          <div className="h-3 rounded-full bg-muted" role="presentation">
            <div className={`h-3 rounded-full ${colors[i % colors.length]}`} style={{ width: `${(d.amount / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

import { Link } from "@tanstack/react-router";
import { HandCoins, Receipt, Gavel, Wallet, Users } from "lucide-react";
import type { Auction, Donation, Expense, ExpenseCategory } from "@/domain/types";
import type { FinancialSummary } from "@/domain/rules";
import { formatDate, formatINR, METHOD_LABEL } from "@/lib/format";
import { pick, useI18n } from "@/lib/i18n";
import { KpiCard, Pill, StatusPill, EmptyState } from "./bits";

type Fund = FinancialSummary["general"];

export function FundCards({ fund, youth = false }: { fund: Fund; youth?: boolean }) {
  const { t, lang } = useI18n();
  const openingSub = fund.openingBalance && fund.openingBalance > 0
    ? `${lang === "te" ? "గత సంవత్సరం నుండి" : "From previous year"}: ${formatINR(fund.openingBalance)}`
    : undefined;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="col-span-2 lg:col-span-1">
        <KpiCard
          tone={youth ? "youth" : "primary"}
          label={t("balance")}
          value={fund.balance}
          sub={openingSub}
          icon={<Wallet className="h-4 w-4" aria-hidden />}
        />
      </div>
      <KpiCard label={t("collected")} value={fund.donations} icon={<HandCoins className="h-4 w-4" aria-hidden />} />
      <KpiCard label={t("auctionCollected")} value={fund.auctionCollected} sub={`${t("auctionCommitted")}: ${formatINR(fund.auctionCommitted)}`} icon={<Gavel className="h-4 w-4" aria-hidden />} />
      <KpiCard label={t("spent")} value={fund.expenses} icon={<Receipt className="h-4 w-4" aria-hidden />} />
    </div>
  );
}

export function DonationList({ rows, showSplit, onDelete }: { rows: Donation[]; showSplit: boolean; onDelete?: (d: Donation) => void }) {
  const { t, lang } = useI18n();
  if (rows.length === 0) return <EmptyState />;
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <table className="w-full text-left">
        <caption className="sr-only">{t("donations")}</caption>
        <thead className="hidden bg-muted/60 text-xs uppercase text-muted-foreground sm:table-header-group">
          <tr><th className="px-4 py-3">{t("donor")}</th><th className="px-4 py-3">{t("date")}</th><th className="px-4 py-3">{t("method")}</th><th className="px-4 py-3 text-right">{t("amount")}</th>{onDelete && <th className="px-2" />}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((d) => {
            const donorName = lang === "te" ? (d.donorNameTe || d.donorName) : (d.donorName || d.donorNameTe);
            return (
              <tr key={d.id} className="flex flex-wrap items-center gap-x-3 px-4 py-3 sm:table-row sm:p-0">
                <td className="flex-1 sm:px-4 sm:py-3">
                  <Link to="/donations/$id" params={{ id: d.id }} className="font-semibold hover:underline">{donorName}</Link>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    {d.village && <span>{d.village}</span>}
                    {showSplit && d.scope !== "GENERAL" && <Pill tone="youth">{d.scope === "BOTH" ? `${t("general")} ${formatINR(d.generalAmount)} · ${t("youth")} ${formatINR(d.youthAmount)}` : t("youth")}</Pill>}
                    {d.status === "PENDING_APPROVAL" && <Pill tone="warn">Pending approval</Pill>}
                    <span className="sm:hidden">{formatDate(d.date)} · {METHOD_LABEL[d.method]}</span>
                  </div>
                </td>
              <td className="hidden text-sm text-muted-foreground sm:table-cell sm:px-4">{formatDate(d.date)}</td>
              <td className="hidden text-sm sm:table-cell sm:px-4">{METHOD_LABEL[d.method]}</td>
              <td className="tabular text-right text-lg font-bold sm:px-4">{formatINR(d.totalAmount)}</td>
              {onDelete && <td className="sm:px-2"><button className="text-xs text-destructive underline" onClick={() => onDelete(d)}>{t("delete")}</button></td>}
            </tr>
          );
        })}
        </tbody>
      </table>
    </div>
  );
}

export function ExpenseList({ rows, categories, onDelete }: { rows: Expense[]; categories: ExpenseCategory[]; onDelete?: (e: Expense) => void }) {
  const { t, lang } = useI18n();
  if (rows.length === 0) return <EmptyState />;
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
      {rows.map((e) => {
        const c = categories.find((x) => x.id === e.categoryId);
        return (
          <li key={e.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <Link to="/expenses/$id" params={{ id: e.id }} className="font-semibold hover:underline">{e.description}</Link>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {c && <Pill>{pick(lang, c.nameEn, c.nameTe)}</Pill>}
                {e.scope === "YOUTH" && <Pill tone="youth">{t("youth")}</Pill>}
                <span>{formatDate(e.date)}</span>{e.paidTo && <span>· {e.paidTo}</span>}
              </div>
            </div>
            <div className="tabular text-lg font-bold">{formatINR(e.amount)}</div>
            {onDelete && <button className="text-xs text-destructive underline" onClick={() => onDelete(e)}>{t("delete")}</button>}
          </li>
        );
      })}
    </ul>
  );
}

export type AuctionView = {
  auction: Auction; paid: number; remaining: number; contributionCount: number;
  contributions: Array<{ id: string; contributorName: string; amount: number; date: string }> | null;
};

export function AuctionCard({ v, onContribute }: { v: AuctionView; onContribute?: () => void }) {
  const { t, lang } = useI18n();
  const a = v.auction;
  const pct = Math.min(100, Math.round((v.paid / a.finalAmount) * 100));
  return (
    <article className="flex flex-col rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold"><Link to="/auctions/$id" params={{ id: a.id }} className="hover:underline">{pick(lang, a.itemEn, a.itemTe)}</Link></h3>
        <StatusPill status={a.paymentStatus} />
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
        {a.scope === "YOUTH" && <Pill tone="youth">{t("youth")}</Pill>}
        <Pill>{a.winnerType === "GROUP" ? t("group") : t("individual")}</Pill>
        {a.forFestivalYear !== a.auctionYear && <Pill tone="primary">{t("forYear")} {a.forFestivalYear}</Pill>}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{t("winner")}: <span className="font-semibold text-foreground">{a.winnerName}</span></p>
      <div className="tabular mt-2 text-3xl font-bold">{formatINR(a.finalAmount)}</div>
      <div className="mt-3 h-2.5 rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-2.5 rounded-full bg-success" style={{ width: `${pct}%` }} />
      </div>
      <div className="tabular mt-2 flex justify-between text-sm">
        <span>{t("paid")}: <b>{formatINR(v.paid)}</b></span>
        <span className={v.remaining > 0 ? "text-primary" : "text-success"}>{t("remaining")}: <b>{formatINR(v.remaining)}</b></span>
      </div>
      <div className="mt-4 border-t pt-3 text-sm">
        <div className="mb-2 font-medium">{t("contributions")} ({v.contributionCount})</div>
        {v.contributions === null ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4" aria-hidden />{t("hiddenContrib")}</p>
        ) : (
          <ul className="space-y-1">
            {v.contributions.map((c) => (
              <li key={c.id} className="flex justify-between"><span>{c.contributorName}</span><span className="tabular">{formatINR(c.amount)}</span></li>
            ))}
          </ul>
        )}
      </div>
      {onContribute && v.remaining > 0 && (
        <button onClick={onContribute} className="mt-4 h-11 rounded-lg border border-primary font-semibold text-primary hover:bg-primary/5">{t("addContribution")}</button>
      )}
    </article>
  );
}

export function ViewAll({ to }: { to: "/donations" | "/expenses" | "/auctions" | "/gallery" | "/years" }) {
  const { t } = useI18n();
  return <Link to={to} className="text-sm font-semibold text-primary hover:underline">{t("viewAll")} →</Link>;
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminQ, adminDataQ } from "@/lib/queries";
import { addCategoryFn, advanceFestivalFn, announceFn, approveRecordFn, exportReportFn, setPermissionFn, setPostVisibilityFn, toggleHighlightFn } from "@/lib/api.functions";
import type { ExpenseCategory } from "@/domain/types";

function CategoryManager({ categories, onAdd }: { categories: ExpenseCategory[]; onAdd: (c: { nameEn: string; nameTe: string; scope: "GENERAL" | "YOUTH" | "ANY" }) => void }) {
  const [en, setEn] = useState(""); const [te, setTe] = useState(""); const [scope, setScope] = useState<"GENERAL" | "YOUTH" | "ANY">("ANY");
  return (<div className="rounded-xl border bg-card p-4">
    <h3 className="mb-2 font-semibold">Expense categories · ఖర్చు వర్గాలు</h3>
    <div className="mb-3 flex flex-wrap gap-2">{categories.map((c) => <Pill key={c.id}>{c.nameEn} / {c.nameTe} · {c.scope}</Pill>)}</div>
    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!en.trim() || !te.trim()) return; onAdd({ nameEn: en, nameTe: te, scope }); setEn(""); setTe(""); }}>
      <Input className="max-w-44" placeholder="Name (English)" value={en} onChange={(e) => setEn(e.target.value)} maxLength={60} />
      <Input className="max-w-44" placeholder="పేరు (తెలుగు)" value={te} onChange={(e) => setTe(e.target.value)} maxLength={60} />
      <select className="h-10 rounded-md border bg-background px-2" value={scope} onChange={(e) => setScope(e.target.value as "GENERAL" | "YOUTH" | "ANY")} aria-label="Scope">
        <option value="ANY">Any</option><option value="GENERAL">General</option><option value="YOUTH">Youth</option>
      </select>
      <Button type="submit">Add</Button>
    </form>
  </div>);
}
import { LIFECYCLE } from "@/domain/rules";
import { PERMISSIONS } from "@/domain/types";
import { pick, useI18n, type Key } from "@/lib/i18n";
import { formatDate, formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AuctionCard, DonationList, ExpenseList, FundCards } from "@/components/app/Finance";
import { ContributionForm, DeleteRecordDialog } from "@/components/app/Forms";
import { DeniedState, PageSkeleton, Pill, SectionHeader } from "@/components/app/bits";
import { cn } from "@/lib/utils";

const TABS: Key[] = ["overview", "settings", "users", "highlights", "memories", "records", "auctions", "notifications", "auditLog", "reports"];
export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Vinayaka Chavithi Festival" }, { name: "description", content: "Festival administration." }, { property: "og:title", content: "Festival Admin" }, { property: "og:description", content: "Manage the village festival." }, { name: "robots", content: "noindex" }] }),
  component: Page,
});
const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed");

function Page() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const a = useQuery(adminQ()).data;
  const d = useQuery(adminDataQ()).data;
  const [tab, setTab] = useState<Key>("overview");
  const [del, setDel] = useState<{ entity: "donation" | "expense"; id: string; label: string } | null>(null);
  const [ann, setAnn] = useState({ titleEn: "", titleTe: "", body: "" });
  if (!a || !d) return <PageSkeleton />;
  if (a.denied || d.denied) return <DeniedState />;
  const refresh = () => qc.invalidateQueries();
  const run = async (p: Promise<unknown>) => { try { await p; await refresh(); toast.success("Saved"); } catch (e) { err(e); } };
  const readOnly = !["PLANNING", "ACTIVE", "FINAL_REVIEW"].includes(d.festival.status);
  const next = LIFECYCLE[LIFECYCLE.indexOf(d.festival.status) + 1];
  return (<div>
    <SectionHeader title={t("admin")} sub={`${pick(lang, d.branding.nameEn, d.branding.nameTe)} · ${t(d.festival.status)}`} />
    <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist">
      {TABS.map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("h-10 shrink-0 rounded-md px-3 text-sm font-medium", tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{t(k)}</button>)}
    </div>
    {readOnly && <p className="mb-4 rounded-lg border bg-muted p-3 text-sm">{t("readOnly")}</p>}
    {tab === "overview" && <div className="space-y-6"><h3 className="font-semibold">{t("general")}</h3><FundCards fund={d.summary.general} /><h3 className="font-semibold">{t("youthFund")}</h3><FundCards fund={d.summary.youth} youth /></div>}
    {tab === "settings" && <div className="space-y-3">{a.festivals.map((f) => (
      <div key={f.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"><b className="font-display text-2xl">{f.year}</b><span className="flex-1">{f.name}</span><Pill tone={f.isCurrent ? "primary" : "muted"}>{t(f.status)}</Pill>
        {f.id === d.festival.id && next && <Button variant="outline" onClick={() => { const reason = window.prompt("Reason for status change"); if (reason) void run(advanceFestivalFn({ data: { id: f.id, to: next, reason } })); }}>→ {t(next)}</Button>}
      </div>))}
      <CategoryManager categories={d.categories} onAdd={(c) => void run(addCategoryFn({ data: c }))} /></div>}
    {tab === "users" && <div className="space-y-4">{a.users.map((u) => (
      <div key={u.id} className="rounded-xl border bg-card p-4"><div className="mb-2 flex gap-2"><b>{u.name}</b><Pill>{u.role}</Pill></div>
        {u.role === "ADMIN" ? <p className="text-sm text-muted-foreground">Admins have all permissions.</p> :
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{PERMISSIONS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-xs"><Switch checked={u.permissions.includes(p)} onCheckedChange={(v) => void run(setPermissionFn({ data: { userId: u.id, permission: p, enabled: v } }))} />{p}</label>))}</div>}
      </div>))}</div>}
    {tab === "highlights" && <ul className="space-y-2">{a.highlights.map((h) => (
      <li key={h.id} className="flex items-center gap-3 rounded-xl border bg-card p-4"><span className="flex-1">{pick(lang, h.titleEn, h.titleTe)}</span>
        <Button size="sm" variant="outline" onClick={() => void run(toggleHighlightFn({ data: { id: h.id, move: "up" } }))}>↑</Button>
        <Button size="sm" variant="outline" onClick={() => void run(toggleHighlightFn({ data: { id: h.id, move: "down" } }))}>↓</Button>
        <Switch checked={h.enabled} onCheckedChange={(v) => void run(toggleHighlightFn({ data: { id: h.id, enabled: v } }))} aria-label="Enabled" /></li>))}</ul>}
    {tab === "memories" && <ul className="space-y-2">{d.posts.map((p) => (
      <li key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-4"><span className="flex-1">{pick(lang, p.titleEn, p.titleTe)} <span className="text-xs text-muted-foreground">({p.media.length} media)</span></span>
        <select className="h-10 rounded-md border bg-background px-2" value={p.visibility} onChange={(e) => void run(setPostVisibilityFn({ data: { id: p.id, visibility: e.target.value as "PUBLIC" | "YOUTH" | "ADMIN" } }))}><option>PUBLIC</option><option>YOUTH</option><option>ADMIN</option></select></li>))}
      <p className="text-xs text-muted-foreground">Photo upload will be available once permanent storage is connected.</p></ul>}
    {tab === "records" && <div className="space-y-6">
      {d.donations.filter((x) => x.status === "PENDING_APPROVAL" && !x.deletedAt).map((x) => <div key={x.id} className="flex items-center gap-3 rounded-xl border bg-card p-3"><span className="flex-1">{x.donorName} · {formatINR(x.totalAmount)}</span><Button size="sm" disabled={readOnly} onClick={() => void run(approveRecordFn({ data: { id: x.id } }))}>Approve</Button></div>)}
      <h3 className="font-semibold">{t("donations")}</h3>
      <DonationList rows={d.donations.filter((x) => !x.deletedAt)} showSplit {...(readOnly ? {} : { onDelete: (x) => setDel({ entity: "donation", id: x.id, label: x.donorName }) })} />
      <h3 className="font-semibold">{t("expenses")}</h3>
      <ExpenseList rows={d.expenses.filter((x) => !x.deletedAt)} categories={d.categories} {...(readOnly ? {} : { onDelete: (x) => setDel({ entity: "expense", id: x.id, label: x.description }) })} />
    </div>}
    {tab === "auctions" && <div className="grid gap-4 md:grid-cols-2">{d.auctions.map((v) => <div key={v.auction.id} className="space-y-2"><AuctionCard v={v} />{!readOnly && v.remaining > 0 && <ContributionForm auctionId={v.auction.id} remaining={v.remaining} />}</div>)}</div>}
    {tab === "notifications" && <form className="max-w-lg space-y-3" onSubmit={(e) => { e.preventDefault(); void run(announceFn({ data: ann })).then(() => setAnn({ titleEn: "", titleTe: "", body: "" })); }}>
      <p className="text-sm text-muted-foreground">{t("inApp")} Sent so far: {d.sentNotifications}</p>
      <Input required placeholder="Title (English)" value={ann.titleEn} onChange={(e) => setAnn({ ...ann, titleEn: e.target.value })} />
      <Input placeholder="శీర్షిక (తెలుగు)" value={ann.titleTe} onChange={(e) => setAnn({ ...ann, titleTe: e.target.value })} />
      <Input placeholder="Message" value={ann.body} onChange={(e) => setAnn({ ...ann, body: e.target.value })} />
      <Button type="submit">Send announcement</Button></form>}
    {tab === "auditLog" && <ul className="divide-y rounded-xl border bg-card text-sm">{a.audit.map((l) => <li key={l.id} className="p-3"><b>{l.action}</b> {l.entity} · {l.actor} · {formatDate(l.at)}{l.reason && <span className="text-muted-foreground"> — {l.reason}</span>}</li>)}</ul>}
    {tab === "reports" && <div className="flex flex-wrap gap-3">{(["donations", "expenses", "auctions"] as const).map((k) => (
      <Button key={k} variant="outline" onClick={async () => { try { const r = await exportReportFn({ data: { kind: k } }); const url = URL.createObjectURL(new Blob([r.csv], { type: "text/csv" })); const el = document.createElement("a"); el.href = url; el.download = r.filename; el.click(); URL.revokeObjectURL(url); } catch (e) { err(e); } }}>Download {t(k)} CSV</Button>))}</div>}
    {del && <DeleteRecordDialog {...del} onClose={() => setDel(null)} />}
  </div>);
}
